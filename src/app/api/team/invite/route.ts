import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/auth/roles"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

export async function POST(req: Request) {
  try {
    // Authentication
    const currentUser = await getAuthenticatedServerUser()

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      )
    }

    const currentRole = String(currentUser.role || "").toLowerCase()

    if (currentRole !== "admin" && currentRole !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to create team members.",
        },
        { status: 403 }
      )
    }

    // Validate request
    const body = await req.json()

    const {
      name,
      email,
      role,
      gymId,
      password,
    } = body || {}

    const cleanName = String(name || "").trim()
    const normalizedEmail = String(email || "").trim().toLowerCase()
    const cleanRole = String(role || "").trim().toLowerCase()
    const targetGymId = String(gymId || currentUser.gymId || "").trim()
    const cleanPassword = String(password || "")

    if (!cleanName) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required.",
        },
        { status: 400 }
      )
    }

    if (!normalizedEmail) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      )
    }

    if (!normalizedEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      )
    }

    if (!targetGymId) {
      return NextResponse.json(
        {
          success: false,
          message: "Gym information is missing.",
        },
        { status: 400 }
      )
    }

    if (!isValidRole(cleanRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid team member role.",
        },
        { status: 400 }
      )
    }

    if (!["admin", "manager", "trainer"].includes(cleanRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only Admin, Manager and Trainer accounts can be created here.",
        },
        { status: 400 }
      )
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters.",
        },
        { status: 400 }
      )
    }

    // Check gym
    const { data: gym, error: gymError } = await supabaseAdmin
      .from("gyms")
      .select("id")
      .eq("id", targetGymId)
      .maybeSingle()

    if (gymError) {
      console.error("Gym lookup failed:", gymError)

      return NextResponse.json(
        {
          success: false,
          message: "Unable to verify gym information.",
        },
        { status: 500 }
      )
    }

    if (!gym) {
      return NextResponse.json(
        {
          success: false,
          message: "Gym not found.",
        },
        { status: 404 }
      )
    }

    // Check existing profile
    const { data: existingProfile, error: profileLookupError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("gym_id", targetGymId)
        .ilike("email", normalizedEmail)
        .maybeSingle()

    if (profileLookupError) {
      console.error("Profile lookup failed:", profileLookupError)

      return NextResponse.json(
        {
          success: false,
          message: "Unable to check existing team members.",
        },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          message: "A team member with this email already exists.",
        },
        { status: 409 }
      )
    }

    // Create auth user
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        gym_id: targetGymId,
        role: cleanRole,
      },
    })

    if (authError || !authData.user) {
      console.error("Auth user creation failed:", authError)

      return NextResponse.json(
        {
          success: false,
          message:
            authError?.message || "Unable to create the user account.",
        },
        { status: 400 }
      )
    }

    const createdUserId = authData.user.id

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: createdUserId,
        gym_id: targetGymId,
        full_name: cleanName,
        email: normalizedEmail,
        role: cleanRole,
        status: "active",
      })

    if (profileError) {
      console.error("Profile creation failed:", profileError)

      // Remove auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(createdUserId)

      return NextResponse.json(
        {
          success: false,
          message: "Unable to create the team member profile.",
        },
        { status: 500 }
      )
    }

    // Success
    return NextResponse.json(
      {
        success: true,
        userCreated: true,
        emailSent: false,
        message: `${cleanName} was created successfully as ${cleanRole}.`,
        userId: createdUserId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Team member creation failed:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the team member.",
      },
      { status: 500 }
    )
  }
}