import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/auth/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const superAdminId = cookieStore.get("impersonating_from_superadmin")?.value

    if (!superAdminId) {
      return NextResponse.json({ error: "No active impersonation session found." }, { status: 400 })
    }

    const { data: superAdminUser, error } = await supabaseAdmin.auth.admin.getUserById(superAdminId)
    if (error || !superAdminUser?.user?.email) {
      return NextResponse.json({ error: "Original super admin user not found." }, { status: 404 })
    }

    // Log exit in audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: superAdminId,
      actor_role: "super_admin",
      action: "exit_impersonation",
      created_at: new Date().toISOString(),
    })

    // Clear cookie
    cookieStore.delete("impersonating_from_superadmin")

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: superAdminUser.user.email,
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: "Failed to generate return session link." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      actionLink: linkData.properties.action_link,
      redirect: "/super-admin",
    })
  } catch (err: any) {
    console.error("Exit impersonate error:", err)
    return NextResponse.json({ error: err.message || "Failed to exit impersonation" }, { status: 500 })
  }
}
