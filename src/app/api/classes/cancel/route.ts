import { NextResponse } from "next/server"
import {
  getAuthenticatedServerUser,
  supabaseAdmin,
} from "@/lib/auth/server"

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedServerUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    const body = await request.json()
    const classId = String(body?.classId ?? "").trim()

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required." },
        { status: 400 },
      )
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, gym_id, email")
        .eq("id", user.id)
        .maybeSingle()

    if (profileError) {
      console.error(profileError)

      return NextResponse.json(
        { error: "Failed to resolve user profile." },
        { status: 500 },
      )
    }

    if (!profile?.gym_id) {
      return NextResponse.json(
        { error: "Gym profile not found." },
        { status: 404 },
      )
    }

    const gymId = profile.gym_id

    let member: {
      id: string
      status: string
    } | null = null

    const { data: memberByAuthId } =
      await supabaseAdmin
        .from("members")
        .select("id, status")
        .eq("gym_id", gymId)
        .eq("user_id", user.id)
        .maybeSingle()

    if (memberByAuthId) {
      member = memberByAuthId
    } else {
      const email = (
        profile.email ??
        user.email ??
        ""
      )
        .trim()
        .toLowerCase()

      if (email) {
        const { data: memberByEmail } =
          await supabaseAdmin
            .from("members")
            .select("id, status")
            .eq("gym_id", gymId)
            .ilike("email", email)
            .maybeSingle()

        if (memberByEmail) {
          member = memberByEmail
        }
      }
    }

    if (!member) {
      return NextResponse.json(
        { error: "Member record not found." },
        { status: 404 },
      )
    }

    if (member.status !== "active") {
      return NextResponse.json(
        { error: "Your member account is not active." },
        { status: 403 },
      )
    }

    const { data: classRow, error: classError } =
      await supabaseAdmin
        .from("classes")
        .select(
          "id, gym_id, title, start_at, status",
        )
        .eq("id", classId)
        .eq("gym_id", gymId)
        .maybeSingle()

    if (classError) {
      console.error(classError)

      return NextResponse.json(
        { error: "Failed to load class." },
        { status: 500 },
      )
    }

    if (!classRow) {
      return NextResponse.json(
        { error: "Class not found." },
        { status: 404 },
      )
    }

    if (classRow.status !== "scheduled") {
      return NextResponse.json(
        {
          error:
            "This class is no longer available for booking changes.",
        },
        { status: 409 },
      )
    }

    const startAt = new Date(classRow.start_at)

    if (
      Number.isNaN(startAt.getTime()) ||
      startAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          error:
            "Past or already started classes cannot be cancelled.",
        },
        { status: 409 },
      )
    }

    const { data: activeBooking, error: bookingError } =
      await supabaseAdmin
        .from("class_bookings")
        .select(
          "id, class_id, member_id, status, booked_at",
        )
        .eq("class_id", classId)
        .eq("gym_id", gymId)
        .eq("member_id", member.id)
        .eq("status", "booked")
        .maybeSingle()

    if (bookingError) {
      console.error(bookingError)

      return NextResponse.json(
        { error: "Failed to load booking." },
        { status: 500 },
      )
    }

    if (!activeBooking) {
      return NextResponse.json(
        {
          error:
            "You do not have an active booking for this class.",
        },
        { status: 404 },
      )
    }

    const { data: cancelledBooking, error: cancelError } =
      await supabaseAdmin
        .from("class_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", activeBooking.id)
        .eq("gym_id", gymId)
        .eq("class_id", classId)
        .eq("member_id", member.id)
        .eq("status", "booked")
        .select(
          "id, class_id, member_id, status, booked_at, cancelled_at",
        )
        .maybeSingle()

    if (cancelError) {
      console.error(cancelError)

      return NextResponse.json(
        { error: "Failed to cancel class booking." },
        { status: 500 },
      )
    }

    if (!cancelledBooking) {
      return NextResponse.json(
        {
          error:
            "The booking could not be cancelled because its status changed.",
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      booking: cancelledBooking,
      message: "Class booking cancelled successfully.",
    })
  } catch (error) {
    console.error(
      "Cancel class booking API error:",
      error,
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      { status: 500 },
    )
  }
}