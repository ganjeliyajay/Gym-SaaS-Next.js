import { NextResponse } from "next/server"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Authentication required." }, { status: 401 })
    }

    if (authUser.role !== "admin" && authUser.role !== "manager" && authUser.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Permission denied." }, { status: 403 })
    }

    const body = await request.json()
    const { memberIds } = body

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ success: false, message: "No member IDs provided for deletion." }, { status: 400 })
    }

    // Filter out caller's own ID
    const validIds = memberIds.filter(id => id !== authUser.id)
    const gymId = authUser.gymId

    for (const memberId of validIds) {
      await supabaseAdmin.from("member_memberships").delete().eq("member_id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("payments").delete().eq("member_id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("checkins").delete().eq("member_id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("class_bookings").delete().eq("member_id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("signed_waivers").delete().eq("member_id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("members").delete().eq("id", memberId).eq("gym_id", gymId)
      await supabaseAdmin.from("profiles").delete().eq("id", memberId).eq("gym_id", gymId)
      try {
        await supabaseAdmin.auth.admin.deleteUser(memberId)
      } catch (e) {
        // ignore if already deleted
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: validIds.length,
      message: `Successfully deleted ${validIds.length} members.`,
    })
  } catch (err: any) {
    console.error("Bulk delete members error:", err)
    return NextResponse.json({ success: false, message: err.message || "Failed to bulk delete members." }, { status: 500 })
  }
}
