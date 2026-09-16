import { NextResponse } from "next/server"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()

    if (!authUser || authUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden. Super Admin access required." }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId parameter is required." }, { status: 400 })
    }

    // Fetch target user info
    const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (targetError || !targetUser?.user?.email) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 })
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name, gym_id")
      .eq("id", userId)
      .maybeSingle()

    const role = targetProfile?.role || "member"
    const targetPath = role === "member" ? "/member" : role === "trainer" ? "/calendar" : "/dashboard"

    // 1. Log to audit_logs table
    await supabaseAdmin.from("audit_logs").insert({
      gym_id: targetProfile?.gym_id || null,
      actor_id: authUser.id,
      actor_role: "super_admin",
      action: "impersonate_user",
      target_type: "user",
      target_id: userId,
      details: {
        impersonator_email: authUser.email,
        target_email: targetUser.user.email,
        target_role: role,
      },
      created_at: new Date().toISOString(),
    })

    // 2. Set impersonation cookie
    const cookieStore = await cookies()
    cookieStore.set("impersonating_from_superadmin", authUser.id, {
      path: "/",
      httpOnly: false, // readable by client banner
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 hours
    })

    // 3. Generate Magic Link for Impersonation Session
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.user.email,
    })

    if (linkError || !linkData) {
      console.error("Generate link error:", linkError)
      return NextResponse.json({ error: linkError?.message || "Failed to generate impersonation link." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      actionLink: linkData.properties.action_link,
      targetEmail: targetUser.user.email,
      targetRole: role,
      suggestedRedirect: targetPath,
    })
  } catch (err: any) {
    console.error("Impersonation API error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
