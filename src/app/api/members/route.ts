import {
  getAuthenticatedServerUser,
  supabaseAdmin,
} from "@/lib/auth/server"

type MemberRequestBody = {
  gymId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  password?: string
  productId?: string | null
  status?: string
  isCsvImport?: boolean
}

function dbError(error: any) {
  return {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  }
}

function errorResponse(
  message: string,
  status = 500,
  error: any = null,
) {
  return Response.json(
    {
      success: false,
      message,
      error: error ? dbError(error) : null,
    },
    { status },
  )
}

export async function POST(request: Request) {
  let newlyCreatedAuthUserId: string | null = null

  try {
    // ------------------------------------------------------------
    // 1. Authentication
    // ------------------------------------------------------------

    const authUser = await getAuthenticatedServerUser()

    if (!authUser) {
      return errorResponse("Authentication required.", 401)
    }

    // Only gym staff can create members.
    if (!["admin", "manager", "super_admin"].includes(authUser.role)) {
      return errorResponse(
        "Permission denied. Only gym staff can create members.",
        403,
      )
    }

    // ------------------------------------------------------------
    // 2. Parse request
    // ------------------------------------------------------------

    let body: MemberRequestBody

    try {
      body = await request.json()
    } catch {
      return errorResponse("Invalid request body.", 400)
    }

    const {
      gymId,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      password,
      productId,
      status,
      isCsvImport,
    } = body

    // ------------------------------------------------------------
    // 3. Resolve gym
    // ------------------------------------------------------------

    const targetGymId =
      authUser.role === "super_admin"
        ? gymId || authUser.gymId
        : authUser.gymId

    if (!targetGymId) {
      return errorResponse(
        "Gym information could not be determined.",
        400,
      )
    }

    // ------------------------------------------------------------
    // 4. Validate fields
    // ------------------------------------------------------------

    const cleanFirstName = String(firstName ?? "").trim()
    const cleanLastName = String(lastName ?? "").trim()
    const cleanEmail = String(email ?? "").trim().toLowerCase()

    const cleanPhone = phone
      ? String(phone).trim()
      : null

    const cleanAddress = address
      ? String(address).trim()
      : null

    const cleanCity = city
      ? String(city).trim()
      : null

    const cleanState = state
      ? String(state).trim()
      : null

    const cleanZip = zip
      ? String(zip).trim()
      : null

    if (!cleanFirstName || !cleanLastName || !cleanEmail) {
      return errorResponse(
        "First name, last name, and email are required.",
        400,
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(cleanEmail)) {
      return errorResponse(
        "Please enter a valid email address.",
        400,
      )
    }

    // ------------------------------------------------------------
    // 5. Check existing member
    // ------------------------------------------------------------

    // IMPORTANT:
    // authorize_net_customer_id is intentionally NOT selected here
    // because that column does not exist in the current members table.

    const {
      data: existingMember,
      error: existingMemberError,
    } = await supabaseAdmin
      .from("members")
      .select("id, email")
      .eq("gym_id", targetGymId)
      .eq("email", cleanEmail)
      .maybeSingle()

    if (existingMemberError) {
      console.error(
        "Existing member lookup error:",
        existingMemberError,
      )

      return errorResponse(
        existingMemberError.message ||
          "Unable to check existing member.",
        500,
        existingMemberError,
      )
    }

    // ------------------------------------------------------------
    // 6. Existing member handling
    // ------------------------------------------------------------

    if (existingMember) {
      // CSV import → update existing member
      if (isCsvImport) {
        const updateFields: Record<string, unknown> = {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          updated_at: new Date().toISOString(),
        }

        if (cleanPhone) {
          updateFields.phone = cleanPhone
        }

        if (cleanAddress) {
          updateFields.address = cleanAddress
        }

        if (cleanCity) {
          updateFields.city = cleanCity
        }

        if (cleanState) {
          updateFields.state = cleanState
        }

        if (cleanZip) {
          updateFields.postal_code = cleanZip
        }

        const {
          data: updatedMember,
          error: updateError,
        } = await supabaseAdmin
          .from("members")
          .update(updateFields)
          .eq("id", existingMember.id)
          .eq("gym_id", targetGymId)
          .select("id, email")
          .single()

        if (updateError) {
          console.error(
            "CSV member update error:",
            updateError,
          )

          return errorResponse(
            updateError.message ||
              "Unable to update member.",
            500,
            updateError,
          )
        }

        return Response.json({
          success: true,
          action: "updated",
          message: "Existing member updated successfully.",
          member: updatedMember,
        })
      }

      return errorResponse(
        "A member with this email already exists in this gym.",
        409,
      )
    }

    // ------------------------------------------------------------
    // 7. Validate selected product
    // ------------------------------------------------------------

    let product: any = null

    if (productId) {
      const {
        data: productData,
        error: productError,
      } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("gym_id", targetGymId)
        .eq("active", true)
        .maybeSingle()

      if (productError) {
        console.error(
          "Product lookup error:",
          productError,
        )

        return errorResponse(
          productError.message ||
            "Unable to verify selected product.",
          500,
          productError,
        )
      }

      if (!productData) {
        return errorResponse(
          "The selected product is not available for this gym.",
          400,
        )
      }

      product = productData
    }

    // ------------------------------------------------------------
    // 8. Create / find Supabase Auth user
    // ------------------------------------------------------------

    let authUserId: string | null = null
    let existingAuthUser = null

    const {
      data: usersData,
      error: listUsersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listUsersError) {
      console.error(
        "Auth users lookup error:",
        listUsersError,
      )

      return errorResponse(
        listUsersError.message ||
          "Unable to check member account.",
        500,
        listUsersError,
      )
    }

    existingAuthUser = usersData?.users?.find(
      (user) =>
        user.email?.trim().toLowerCase() === cleanEmail,
    )

    if (existingAuthUser) {
      authUserId = existingAuthUser.id
    } else {
      const userPassword =
        String(password ?? "").trim() ||
        `Member@${Math.random()
          .toString(36)
          .slice(-8)}`

      const {
        data: newAuth,
        error: authError,
      } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          full_name:
            `${cleanFirstName} ${cleanLastName}`.trim(),
        },
      })

      if (authError || !newAuth?.user) {
        console.error(
          "Auth member creation error:",
          authError,
        )

        return errorResponse(
          authError?.message ||
            "Unable to create member user account.",
          400,
          authError,
        )
      }

      authUserId = newAuth.user.id

      // Used only for cleanup if a later DB step fails.
      newlyCreatedAuthUserId = newAuth.user.id
    }

    if (!authUserId) {
      return errorResponse(
        "Unable to determine member account.",
        500,
      )
    }

    // ------------------------------------------------------------
    // 9. Create / update profile
    // ------------------------------------------------------------

    const fullName =
      `${cleanFirstName} ${cleanLastName}`.trim()

    // Keep DB status compatible with current profiles/members setup.
    const memberStatus =
      String(status ?? "active").toLowerCase() === "inactive"
        ? "inactive"
        : "active"

    const {
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          gym_id: targetGymId,
          full_name: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "member",
          status: memberStatus,
        },
        {
          onConflict: "id",
        },
      )

    if (profileError) {
      console.error(
        "Profile creation error:",
        profileError,
      )

      // Delete only the auth user created by THIS request.
      if (newlyCreatedAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(
          newlyCreatedAuthUserId,
        )
      }

      return errorResponse(
        profileError.message ||
          "Unable to create member profile.",
        500,
        profileError,
      )
    }

    // ------------------------------------------------------------
    // 10. Create member
    // ------------------------------------------------------------

    const memberPayload = {
      id: authUserId,
      gym_id: targetGymId,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      email: cleanEmail,
      phone: cleanPhone,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      postal_code: cleanZip,
      status: memberStatus,
      joined_at: new Date().toISOString(),
    }

    console.log("Creating member:", {
      id: authUserId,
      gym_id: targetGymId,
      email: cleanEmail,
    })

    const {
      data: member,
      error: memberError,
    } = await supabaseAdmin
      .from("members")
      .upsert(memberPayload, {
        onConflict: "id",
      })
      .select()
      .single()

    if (memberError) {
      console.error(
        "MEMBER CREATION ERROR:",
        memberError,
      )

      // Roll back auth user created by this request.
      if (newlyCreatedAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(
          newlyCreatedAuthUserId,
        )
      }

      return errorResponse(
        memberError.message ||
          "Unable to create member.",
        500,
        memberError,
      )
    }

    if (!member) {
      if (newlyCreatedAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(
          newlyCreatedAuthUserId,
        )
      }

      return errorResponse(
        "Member record was not returned after creation.",
        500,
      )
    }

    // ------------------------------------------------------------
    // 11. Create membership
    // ------------------------------------------------------------

    let membership: any = null
    let payment: any = null

    if (product) {
      const now = new Date()

      let endDate: Date | null = null

      if (
        product.duration_type === "limited" &&
        product.duration_value
      ) {
        endDate = new Date(now)

        const value = Number(
          product.duration_value,
        )

        const unit = String(
          product.duration_unit || "days",
        ).toLowerCase()

        if (unit.includes("day")) {
          endDate.setDate(
            endDate.getDate() + value,
          )
        } else if (unit.includes("week")) {
          endDate.setDate(
            endDate.getDate() + value * 7,
          )
        } else if (unit.includes("month")) {
          endDate.setMonth(
            endDate.getMonth() + value,
          )
        } else if (unit.includes("year")) {
          endDate.setFullYear(
            endDate.getFullYear() + value,
          )
        }
      } else if (
        product.duration_type === "periodic" &&
        product.period_end_date
      ) {
        endDate = new Date(
          product.period_end_date,
        )
      }

      const {
        data: membershipData,
        error: membershipError,
      } = await supabaseAdmin
        .from("member_memberships")
        .insert({
          gym_id: targetGymId,
          member_id: member.id,
          product_id: product.id,
          status: "active",
          price_paid: Number(
            product.price || 0,
          ),
          start_date: now.toISOString(),
          end_date: endDate
            ? endDate.toISOString()
            : null,
          remaining_visits:
            product.access_type === "visits"
              ? Number(
                  product.visit_limit || 0,
                )
              : null,
        })
        .select()
        .single()

      if (membershipError) {
        console.error(
          "Membership creation error:",
          membershipError,
        )

        return errorResponse(
          membershipError.message ||
            "Member was created, but membership could not be assigned.",
          500,
          membershipError,
        )
      }

      membership = membershipData

      // ----------------------------------------------------------
      // 12. Create payment
      // ----------------------------------------------------------

      const {
        data: paymentData,
        error: paymentError,
      } = await supabaseAdmin
        .from("payments")
        .insert({
          gym_id: targetGymId,
          member_id: member.id,
          product_id: product.id,
          membership_id: membership.id,
          amount: Number(
            product.price || 0,
          ),
          payment_type:
            product.payment_type ||
            "one-time",
          status: "paid",
          paid_at: now.toISOString(),
          payment_method:
            "Admin Manual Assignment",
          metadata: {
            source: "admin_member_create",
            product_name: product.name,
          },
        })
        .select()
        .single()

      if (paymentError) {
        console.error(
          "Payment creation error:",
          paymentError,
        )

        return errorResponse(
          paymentError.message ||
            "Member and membership were created, but payment could not be recorded.",
          500,
          paymentError,
        )
      }

      payment = paymentData
    }

    // ------------------------------------------------------------
    // 13. Success
    // ------------------------------------------------------------

    return Response.json({
      success: true,
      action: "created",
      message: "Member created successfully.",
      member,
      product,
      membership,
      payment,
    })
  } catch (error: unknown) {
    console.error(
      "Member creation API error:",
      error,
    )

    // Cleanup only if this request created the Auth user.
    if (newlyCreatedAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(
          newlyCreatedAuthUserId,
        )
      } catch (cleanupError) {
        console.error(
          "Auth user cleanup failed:",
          cleanupError,
        )
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while creating the member."

    return Response.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    )
  }
}