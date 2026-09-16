import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/auth/server"

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const host = searchParams.get("host")?.toLowerCase().trim()
    const subdomain = searchParams.get("subdomain")?.toLowerCase().trim()

    if (!host && !subdomain) {
      return NextResponse.json(
        { error: "host or subdomain query parameter required" },
        { status: 400 }
      )
    }

    // 1. If custom domain provided, look up verified domain in domains table or gym_branding
    if (host && isCustomDomain(host)) {
      const cleanHost = host.split(":")[0]

      // Check domains table first
      const { data: domainRec } = await supabaseAdmin
        .from("domains")
        .select(`
          id,
          gym_id,
          domain,
          verification_status,
          gym:gyms(id, name, slug, status, logo_url)
        `)
        .eq("domain", cleanHost)
        .eq("verification_status", "verified")
        .maybeSingle()

      if (domainRec && domainRec.gym) {
        const gymData = domainRec.gym as any
        if (gymData.status === "inactive" || gymData.status === "suspended") {
          return NextResponse.json(
            { error: "This gym account is currently inactive or suspended.", inactive: true },
            { status: 403 }
          )
        }

        const { data: branding } = await supabaseAdmin
          .from("gym_branding")
          .select("brand_name, primary_color, secondary_color, accent_color, logo_url")
          .eq("gym_id", domainRec.gym_id)
          .maybeSingle()

        return NextResponse.json({
          found: true,
          gymId: domainRec.gym_id,
          gymName: branding?.brand_name || gymData.name,
          slug: gymData.slug,
          primaryColor: branding?.primary_color || "#0f172a",
          logoUrl: branding?.logo_url || gymData.logo_url,
          customDomain: domainRec.domain,
          type: "custom_domain",
          verified: true,
        })
      }

      // Fallback check in gym_branding
      const { data: branding } = await supabaseAdmin
        .from("gym_branding")
        .select(`
          id,
          gym_id,
          custom_domain,
          brand_name,
          primary_color,
          logo_url,
          gym:gyms(id, name, slug, status, logo_url)
        `)
        .eq("custom_domain", cleanHost)
        .maybeSingle()

      if (branding && branding.gym) {
        const gymData = branding.gym as any
        if (gymData.status === "inactive" || gymData.status === "suspended") {
          return NextResponse.json(
            { error: "This gym account is currently inactive or suspended.", inactive: true },
            { status: 403 }
          )
        }

        return NextResponse.json({
          found: true,
          gymId: branding.gym_id,
          gymName: branding.brand_name || gymData.name,
          slug: gymData.slug,
          primaryColor: branding.primary_color,
          logoUrl: branding.logo_url || gymData.logo_url,
          customDomain: branding.custom_domain,
          type: "custom_domain",
          verified: true,
        })
      }
    }

    // 2. Lookup by subdomain / slug in gyms table
    const targetSlug = subdomain || (host ? extractSubdomain(host) : null)

    if (targetSlug) {
      if (RESERVED_SUBDOMAINS.has(targetSlug)) {
        return NextResponse.json({
          found: false,
          isReserved: true,
          message: `The subdomain "${targetSlug}" is reserved for system services.`,
        }, { status: 400 })
      }

      const { data: gym } = await supabaseAdmin
        .from("gyms")
        .select(`
          id,
          name,
          slug,
          status,
          logo_url,
          branding:gym_branding(primary_color, secondary_color, brand_name, custom_domain, logo_url)
        `)
        .eq("slug", targetSlug)
        .maybeSingle()

      if (gym) {
        if (gym.status === "inactive" || gym.status === "suspended") {
          return NextResponse.json(
            { error: "This gym account is currently inactive or suspended.", inactive: true },
            { status: 403 }
          )
        }

        const branding = Array.isArray(gym.branding) ? gym.branding[0] : gym.branding
        return NextResponse.json({
          found: true,
          gymId: gym.id,
          gymName: branding?.brand_name || gym.name,
          slug: gym.slug,
          primaryColor: branding?.primary_color || "#0f172a",
          logoUrl: branding?.logo_url || gym.logo_url,
          customDomain: branding?.custom_domain,
          type: "subdomain",
        })
      }
    }

    return NextResponse.json({ found: false, message: "Gym not found for this domain or subdomain." }, { status: 404 })
  } catch (err: any) {
    console.error("Domain lookup error:", err)
    return NextResponse.json({ error: err.message || "Failed to lookup domain" }, { status: 500 })
  }
}

export function extractSubdomain(host: string): string | null {
  const clean = host.split(":")[0].toLowerCase()
  if (clean.endsWith(".thinkauric.com")) {
    const parts = clean.split(".")
    if (parts.length >= 3) return parts[0]
  }
  // Local development testing: e.g. crossfit.localhost:3000
  if (clean.endsWith(".localhost") || clean.includes(".localhost")) {
    const parts = clean.split(".")
    if (parts.length >= 2 && parts[0] !== "localhost") return parts[0]
  }
  return null
}

function isCustomDomain(host?: string | null): boolean {
  if (!host) return false
  const clean = host.split(":")[0].toLowerCase()
  return (
    clean !== "localhost" &&
    !clean.endsWith(".localhost") &&
    !clean.endsWith(".vercel.app") &&
    !clean.endsWith(".thinkauric.com")
  )
}
