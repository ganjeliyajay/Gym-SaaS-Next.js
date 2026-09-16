import { NextResponse } from "next/server"
import { promises as dns } from "dns"
import { supabaseAdmin } from "@/lib/auth/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
  "super-admin",
  "auth",
  "mail",
  "support",
])

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // Ignore cookie mutations in route handler
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.gym_id) {
      return NextResponse.json({ error: "No gym associated with this account" }, { status: 400 })
    }

    const body = await request.json()
    const { action = "verify", domain: rawDomain } = body

    if (!rawDomain || typeof rawDomain !== "string") {
      return NextResponse.json({ error: "A valid domain name is required" }, { status: 400 })
    }

    const domain = rawDomain.toLowerCase().trim().replace(/^https?:\/\//, "").split("/")[0]

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format. Example: members.yourgym.com or yourgym.com" },
        { status: 400 }
      )
    }

    // 1. Prevent Domain Takeover: Check if already verified by another gym
    const { data: existingDomainRecord } = await supabaseAdmin
      .from("domains")
      .select("*")
      .eq("domain", domain)
      .maybeSingle()

    if (
      existingDomainRecord &&
      existingDomainRecord.gym_id !== profile.gym_id &&
      existingDomainRecord.verification_status === "verified"
    ) {
      return NextResponse.json(
        {
          error: "This domain is already verified and owned by another gym. Please contact support if you believe this is in error.",
        },
        { status: 409 }
      )
    }

    // 2. Lookup or Provision Domain Record
    let domainRecord: any = existingDomainRecord
    if (!domainRecord || domainRecord.gym_id !== profile.gym_id) {
      const verificationToken = `thinkauric-verify-${Math.random().toString(36).substring(2, 12)}`
      const dnsInstructions = {
        txt: {
          host: `_thinkauric-challenge.${domain}`,
          value: verificationToken,
        },
        cname: {
          host: domain,
          value: "cname.thinkauric.com",
        },
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("domains")
        .upsert(
          {
            gym_id: profile.gym_id,
            domain,
            verification_status: "pending",
            verification_token: verificationToken,
            verification_type: "txt",
            dns_instructions: dnsInstructions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "domain" }
        )
        .select()
        .single()

      if (insertError) throw insertError
      domainRecord = inserted
    }

    if (!domainRecord) {
      return NextResponse.json(
        { error: "Failed to initialize domain record." },
        { status: 500 }
      )
    }

    if (action === "get_instructions") {
      return NextResponse.json({
        domain: domainRecord.domain,
        status: domainRecord.verification_status,
        token: domainRecord.verification_token,
        dnsInstructions: domainRecord.dns_instructions,
        verifiedAt: domainRecord.verified_at,
      })
    }

    // 3. Perform Real DNS Verification
    let isTxtVerified = false
    let isCnameVerified = false
    const txtRecordHost = `_thinkauric-challenge.${domain}`
    const expectedToken = domainRecord.verification_token

    try {
      const txtRecords = await dns.resolveTxt(txtRecordHost)
      // txtRecords is string[][]
      const flatRecords = txtRecords.map((chunk) => chunk.join(""))
      isTxtVerified = flatRecords.some((val) => val === expectedToken)
    } catch {
      isTxtVerified = false
    }

    if (!isTxtVerified) {
      try {
        const cnameRecords = await dns.resolveCname(domain)
        isCnameVerified = cnameRecords.some((val) =>
          val.toLowerCase().includes("thinkauric.com")
        )
      } catch {
        isCnameVerified = false
      }
    }

    const isVerified = isTxtVerified || isCnameVerified
    const nowIso = new Date().toISOString()

    if (isVerified) {
      // Mark domain verified in domains table
      await supabaseAdmin
        .from("domains")
        .update({
          verification_status: "verified",
          verified_at: nowIso,
          last_checked_at: nowIso,
          error_message: null,
          updated_at: nowIso,
        })
        .eq("id", domainRecord.id)

      // Associate verified domain with gym_branding
      await supabaseAdmin
        .from("gym_branding")
        .update({
          custom_domain: domain,
          updated_at: nowIso,
        })
        .eq("gym_id", profile.gym_id)

      return NextResponse.json({
        success: true,
        status: "verified",
        domain,
        verifiedAt: nowIso,
        message: "Domain verified successfully. Routing is now active!",
      })
    } else {
      const failureReason = `DNS verification failed. We could not find a TXT record for "${txtRecordHost}" with value "${expectedToken}", or a CNAME pointing to "cname.thinkauric.com". DNS changes can take up to 24-48 hours to propagate.`

      await supabaseAdmin
        .from("domains")
        .update({
          verification_status: "failed",
          last_checked_at: nowIso,
          error_message: failureReason,
          updated_at: nowIso,
        })
        .eq("id", domainRecord.id)

      return NextResponse.json({
        success: false,
        status: "failed",
        domain,
        error: failureReason,
        dnsInstructions: domainRecord.dns_instructions,
      })
    }
  } catch (error: any) {
    console.error("Domain verification route error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process domain verification" },
      { status: 500 }
    )
  }
}
