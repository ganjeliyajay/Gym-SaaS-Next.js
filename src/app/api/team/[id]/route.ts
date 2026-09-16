import { NextResponse } from "next/server"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"
import { isValidRole } from "@/lib/auth/roles"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 })
    }

    if (authUser.role !== "admin" && authUser.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Permission denied. Only admins can remove team members." },
        { status: 403 }
      )
    }

    const { id: memberId } = await params

    if (!memberId) {
      return NextResponse.json({ success: false, message: "Team member ID required." }, { status: 400 })
    }

    if (memberId === authUser.id) {
      return NextResponse.json({ success: false, message: "You cannot remove your own account." }, { status: 400 })
    }

    // Verify target user belongs to the same gym
    const { data: targetProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, gym_id, role")
      .eq("id", memberId)
      .single()

    if (profileErr || !targetProfile) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 })
    }

    if (authUser.role !== "super_admin" && targetProfile.gym_id !== authUser.gymId) {
      return NextResponse.json({ success: false, message: "Unauthorized. Member belongs to another gym." }, { status: 403 })
    }

    // Delete profile and delete auth user
    await supabaseAdmin.from("profiles").delete().eq("id", memberId)
    await supabaseAdmin.auth.admin.deleteUser(memberId)

    return NextResponse.json({ success: true, message: "Team member removed successfully." })
  } catch (err: any) {
    console.error("Delete team member error:", err)
    return NextResponse.json({ success: false, message: err.message || "Failed to remove team member." }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 })
    }

    if (authUser.role !== "admin" && authUser.role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Permission denied. Only admins can edit team members." },
        { status: 403 }
      )
    }

    const { id: memberId } = await params
    const body = await request.json()
    const { role, fullName, status } = body

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, gym_id, role")
      .eq("id", memberId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ success: false, message: "Team member not found." }, { status: 404 })
    }

    if (authUser.role !== "super_admin" && targetProfile.gym_id !== authUser.gymId) {
      return NextResponse.json({ success: false, message: "Unauthorized. Member belongs to another gym." }, { status: 403 })
    }

    const updates: any = { updated_at: new Date().toISOString() }
    if (fullName) updates.full_name = fullName.trim()
    if (role && isValidRole(role)) updates.role = role
    if (status) updates.status = status

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", memberId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, member: updated })
  } catch (err: any) {
    console.error("Update team member error:", err)
    return NextResponse.json({ success: false, message: err.message || "Failed to update team member." }, { status: 500 })
  }
}
