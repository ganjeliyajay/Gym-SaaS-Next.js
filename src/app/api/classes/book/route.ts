import { NextResponse } from "next/server"

import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

import { validateClassBookingEntitlement } from "@/lib/membership/entitlements"

type MemberRow = {
  id: string
  gym_id: string
  status: string
  email: string | null
}

type ClassRow = {
  id: string
  gym_id: string
  title: string
  start_at: string
  capacity: number | null
  status: string
}

type BookingRow = {
  id: string
  gym_id: string
  class_id: string
  member_id: string
  status: string
  booked_at: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export async function POST(request: Request) {
  try {
    /*
     * ----------------------------------------------------
     * 1. AUTHENTICATION
     * ----------------------------------------------------
     */
    const user = await getAuthenticatedServerUser()

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      )
    }

    /*
     * ----------------------------------------------------
     * 2. REQUEST BODY
     * ----------------------------------------------------
     */
    let body: {
      classId?: unknown
    }

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 },
      )
    }

    const classId = typeof body.classId === "string" ? body.classId.trim() : ""

    if (!classId) {
      return NextResponse.json(
        {
          success: false,
          error: "Class ID is required.",
        },
        { status: 400 },
      )
    }

    /*
     * ----------------------------------------------------
     * 3. PROFILE / GYM
     * ----------------------------------------------------
     */
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select(
        `
        id,
        gym_id,
        role
      `,
      )
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Booking - profile lookup failed:", profileError)

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your profile.",
        },
        { status: 500 },
      )
    }

    if (!profile?.gym_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Gym account not found.",
        },
        { status: 403 },
      )
    }

    const gymId = profile.gym_id

    /*
     * ----------------------------------------------------
     * 4. RESOLVE MEMBER
     * ----------------------------------------------------
     *
     * First try members.id = auth user id.
     *
     * If not found, fallback to email.
     *
     * This supports both:
     *
     *  - normal member signup
     *  - admin-created member accounts
     */
    let member: MemberRow | null = null

    const { data: memberById, error: memberByIdError } = await supabaseAdmin
      .from("members")
      .select(
        `
        id,
        gym_id,
        status,
        email
      `,
      )
      .eq("id", user.id)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (memberByIdError) {
      console.error("Booking - member ID lookup failed:", memberByIdError)

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your member account.",
        },
        { status: 500 },
      )
    }

    if (memberById) {
      member = memberById as MemberRow
    }

    /*
     * Email fallback.
     */
    if (!member && user.email) {
      const { data: memberByEmail, error: memberByEmailError } =
        await supabaseAdmin
          .from("members")
          .select(
            `
          id,
          gym_id,
          status,
          email
        `,
          )
          .eq("gym_id", gymId)
          .ilike("email", user.email.trim())
          .maybeSingle()

      if (memberByEmailError) {
        console.error(
          "Booking - member email lookup failed:",
          memberByEmailError,
        )

        return NextResponse.json(
          {
            success: false,
            error: "Unable to verify your member account.",
          },
          { status: 500 },
        )
      }

      if (memberByEmail) {
        member = memberByEmail as MemberRow
      }
    }

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          error: "No member account is linked to your login.",
        },
        { status: 403 },
      )
    }

    /*
     * ----------------------------------------------------
     * 5. MEMBER STATUS
     * ----------------------------------------------------
     */
    if (member.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "Your member account is not active.",
        },
        { status: 403 },
      )
    }

    const memberId = member.id

    /*
     * ----------------------------------------------------
     * 6. CLASS
     * ----------------------------------------------------
     */
    const { data: classRow, error: classError } = await supabaseAdmin
      .from("classes")
      .select(
        `
        id,
        gym_id,
        title,
        start_at,
        capacity,
        status
      `,
      )
      .eq("id", classId)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (classError) {
      console.error("Booking - class lookup failed:", classError)

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify the class.",
        },
        { status: 500 },
      )
    }

    if (!classRow) {
      return NextResponse.json(
        {
          success: false,
          error: "Class not found.",
        },
        { status: 404 },
      )
    }

    const typedClass = classRow as ClassRow

    if (typedClass.status !== "scheduled") {
      return NextResponse.json(
        {
          success: false,
          error: "This class is no longer available.",
        },
        { status: 409 },
      )
    }

    if (
      !typedClass.start_at ||
      new Date(typedClass.start_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Past classes cannot be booked.",
        },
        { status: 409 },
      )
    }

    /*
     * ----------------------------------------------------
     * 7. EXISTING BOOKING
     * ----------------------------------------------------
     */
    const { data: existingBookings, error: previousBookingError } =
      await supabaseAdmin
        .from("class_bookings")
        .select(
          `
        id,
        gym_id,
        class_id,
        member_id,
        status,
        booked_at,
        cancelled_at,
        created_at,
        updated_at
      `,
        )
        .eq("gym_id", gymId)
        .eq("class_id", classId)
        .eq("member_id", memberId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)

    if (previousBookingError) {
      console.error(
        "Booking - previous booking lookup failed:",
        previousBookingError,
      )

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check your previous booking.",
        },
        { status: 500 },
      )
    }

    const previousBooking = existingBookings?.[0]
      ? (existingBookings[0] as BookingRow)
      : null

    /*
     * Already booked.
     */
    if (
      previousBooking &&
      (previousBooking.status === "booked" ||
        previousBooking.status === "confirmed")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You are already booked for this class.",
          bookingId: previousBooking.id,
        },
        { status: 409 },
      )
    }

    /*
     * ----------------------------------------------------
     * 8. MEMBERSHIP ENTITLEMENT
     * ----------------------------------------------------
     */
    const entitlement = await validateClassBookingEntitlement(
      supabaseAdmin,
      memberId,
      classId,
      gymId,
      [user.id],
    )

    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            entitlement.reason ?? "You are not eligible to book this class.",
          membershipRequired: true,
        },
        { status: 403 },
      )
    }

    /*
     * ----------------------------------------------------
     * 9. CAPACITY
     * ----------------------------------------------------
     */
    const { count: bookingCount, error: countError } = await supabaseAdmin
      .from("class_bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("gym_id", gymId)
      .eq("class_id", classId)
      .in("status", ["booked", "confirmed"])

    if (countError) {
      console.error("Booking - capacity count failed:", countError)

      return NextResponse.json(
        {
          success: false,
          error: "Unable to check class capacity.",
        },
        { status: 500 },
      )
    }

    const currentBookings = bookingCount ?? 0

    const capacity = Number(typedClass.capacity ?? 0)

    if (capacity > 0 && currentBookings >= capacity) {
      return NextResponse.json(
        {
          success: false,
          error: "This class is full.",
        },
        { status: 409 },
      )
    }

    /*
     * ----------------------------------------------------
     * 10. REBOOK CANCELLED BOOKING
     * ----------------------------------------------------
     */
    if (previousBooking && previousBooking.status === "cancelled") {
      const now = new Date().toISOString()

      const { data: rebookedBooking, error: rebookError } = await supabaseAdmin
        .from("class_bookings")
        .update({
          status: "booked",
          booked_at: now,
          cancelled_at: null,
          updated_at: now,
        })
        .eq("id", previousBooking.id)
        .eq("gym_id", gymId)
        .eq("class_id", classId)
        .eq("member_id", memberId)
        .select(
          `
          id,
          gym_id,
          class_id,
          member_id,
          status,
          booked_at,
          cancelled_at,
          created_at,
          updated_at
        `,
        )
        .single()

      if (rebookError) {
        console.error("Booking - rebooking failed:", rebookError)

        return NextResponse.json(
          {
            success: false,
            error: rebookError.message || "Unable to rebook this class.",
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: "Class booked successfully.",
          booking: rebookedBooking,
          membershipId: entitlement.membershipId ?? null,
          remainingClasses: entitlement.remainingClasses ?? null,
        },
        { status: 200 },
      )
    }

    /*
     * ----------------------------------------------------
     * 11. NEW BOOKING
     * ----------------------------------------------------
     */
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("class_bookings")
      .insert({
        gym_id: gymId,
        class_id: classId,
        member_id: memberId,
        status: "booked",
        booked_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        gym_id,
        class_id,
        member_id,
        status,
        booked_at,
        cancelled_at,
        created_at,
        updated_at
      `,
      )
      .single()

    if (bookingError) {
      console.error("Booking - insert failed:", bookingError)

      if (bookingError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "This booking already exists. Please refresh and try again.",
          },
          { status: 409 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: bookingError.message || "Unable to create booking.",
        },
        { status: 500 },
      )
    }

    /*
     * ----------------------------------------------------
     * 12. SUCCESS
     * ----------------------------------------------------
     */
    return NextResponse.json(
      {
        success: true,
        message: "Class booked successfully.",
        booking,
        membershipId: entitlement.membershipId ?? null,
        remainingClasses: entitlement.remainingClasses ?? null,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Booking API unexpected error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while booking the class.",
      },
      { status: 500 },
    )
  }
}
