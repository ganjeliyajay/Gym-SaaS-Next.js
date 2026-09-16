import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: memberId } = await params

    if (!memberId) {
      return Response.json(
        { success: false, message: "Member ID is required." },
        { status: 400 },
      )
    }

    // 1. Verify logged-in user with server authentication
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return Response.json(
        { success: false, message: "Authentication required." },
        { status: 401 },
      )
    }

    if (authUser.role !== "admin" && authUser.role !== "manager" && authUser.role !== "super_admin") {
      return Response.json(
        { success: false, message: "Permission denied. Only gym staff can delete members." },
        { status: 403 },
      )
    }

    // 2. Prevent deleting yourself
    if (memberId === authUser.id) {
      return Response.json(
        { success: false, message: "You cannot delete your own account." },
        { status: 400 },
      )
    }

    const gymId = authUser.gymId

    // 3. Verify member belongs to the same gym
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select("id, gym_id, email")
      .eq("id", memberId)
      .eq("gym_id", gymId)
      .single()

    if (memberError || !member) {
      return Response.json(
        { success: false, message: "Member not found in this gym." },
        { status: 404 },
      )
    }

    // 4. Cascade delete related records
    await supabaseAdmin.from("member_memberships").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("payments").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("checkins").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("class_bookings").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("signed_waivers").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("signup_submissions").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("member_notification_preferences").delete().eq("member_id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("members").delete().eq("id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.from("profiles").delete().eq("id", memberId).eq("gym_id", gymId)
    await supabaseAdmin.auth.admin.deleteUser(memberId)

    return Response.json({
      success: true,
      message: "Member deleted successfully.",
      memberId,
    })
  } catch (error: any) {
    console.error("Member delete API error:", error)
    return Response.json(
      { success: false, message: error.message || "Failed to delete member." },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: memberId } = await params
    const authUser = await getAuthenticatedServerUser()

    if (!authUser) {
      return Response.json({ success: false, message: "Authentication required." }, { status: 401 })
    }

    if (authUser.role !== "admin" && authUser.role !== "manager" && authUser.role !== "super_admin" && authUser.id !== memberId) {
      return Response.json({ success: false, message: "Permission denied." }, { status: 403 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, address, city, state, zip, status, emergencyName, emergencyPhone } = body

    const targetGymId = authUser.gymId

    const memberUpdates: any = { updated_at: new Date().toISOString() }
    if (firstName) memberUpdates.first_name = firstName.trim()
    if (lastName) memberUpdates.last_name = lastName.trim()
    if (phone !== undefined) memberUpdates.phone = phone
    if (address !== undefined) memberUpdates.address = address
    if (city !== undefined) memberUpdates.city = city
    if (state !== undefined) memberUpdates.state = state
    if (zip !== undefined) memberUpdates.postal_code = zip
    if (status !== undefined && ["admin", "manager", "super_admin"].includes(authUser.role)) {
      memberUpdates.status = status
    }
    if (emergencyName !== undefined) memberUpdates.emergency_contact_name = emergencyName
    if (emergencyPhone !== undefined) memberUpdates.emergency_contact_phone = emergencyPhone

    const { data: updatedMember, error: memberErr } = await supabaseAdmin
      .from("members")
      .update(memberUpdates)
      .eq("id", memberId)
      .eq("gym_id", targetGymId)
      .select()
      .single()

    if (memberErr) throw memberErr

    // Update profile full_name if name changed
    if (firstName || lastName) {
      const full = `${firstName || ""} ${lastName || ""}`.trim()
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: full, updated_at: new Date().toISOString() })
        .eq("id", memberId)
    }

    return Response.json({
      success: true,
      message: "Member updated successfully.",
      member: updatedMember,
    })
  } catch (error: any) {
    console.error("Member update API error:", error)
    return Response.json({ success: false, message: error.message || "Failed to update member." }, { status: 500 })
  }
}