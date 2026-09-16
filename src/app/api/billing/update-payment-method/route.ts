import { NextResponse } from "next/server"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"
import { updateSubscriptionPaymentMethod } from "@/lib/payments/authorizenet"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required to update payment method." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      memberId,
      cardNumber,
      expirationDate,
      cvv,
      zip,
      subscriptionId: passedSubscriptionId,
    } = body

    if (!cardNumber || !expirationDate || !cvv) {
      return NextResponse.json(
        { success: false, message: "Card number, expiration date, and CVV are required." },
        { status: 400 }
      )
    }

    const cleanCard = String(cardNumber).replace(/\D/g, "")
    const cleanExp = String(expirationDate).replace(/\D/g, "")
    const last4 = cleanCard.slice(-4)

    if (cleanCard.length < 13 || cleanCard.length > 19) {
      return NextResponse.json(
        { success: false, message: "Invalid credit card number length." },
        { status: 400 }
      )
    }

    if (cleanExp.length !== 4) {
      return NextResponse.json(
        { success: false, message: "Invalid expiration date format (expected MM/YY)." },
        { status: 400 }
      )
    }

    // Role & Ownership Verification
    let targetMemberId = memberId || authUser.id
    if (!["member", "admin", "manager", "super_admin"].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized to update payment details." },
        { status: 403 }
      )
    }

    const targetGymId = authUser.gymId

    let memberRecord: any = null

    if (authUser.role === "member") {
      const { data: byId } = await supabaseAdmin
        .from("members")
        .select("id, gym_id, first_name, last_name, email, authorize_net_customer_id")
        .eq("id", authUser.id)
        .eq("gym_id", targetGymId)
        .maybeSingle()

      memberRecord = byId

      if (!memberRecord && authUser.email) {
        const { data: byEmail, error: emailLookupError } = await supabaseAdmin
          .from("members")
          .select("id, gym_id, first_name, last_name, email, authorize_net_customer_id")
          .eq("gym_id", targetGymId)
          .ilike("email", authUser.email)
          .maybeSingle()

        if (emailLookupError) throw emailLookupError
        memberRecord = byEmail
        if (memberRecord) {
          targetMemberId = memberRecord.id
        }
      }
    } else {
      const { data, error } = await supabaseAdmin
        .from("members")
        .select("id, gym_id, first_name, last_name, email, authorize_net_customer_id")
        .eq("id", targetMemberId)
        .eq("gym_id", targetGymId)
        .maybeSingle()

      if (error) throw error
      memberRecord = data
    }

    if (!memberRecord) {
      return NextResponse.json(
        { success: false, message: "Member record not found in this gym facility." },
        { status: 404 }
      )
    }

    // 1. Locate active subscription in Authorize.Net
    let activeSubscriptionId = passedSubscriptionId

    if (!activeSubscriptionId) {
      const { data: membership } = await supabaseAdmin
        .from("member_memberships")
        .select("id, authorize_net_subscription_id, authorize_net_customer_id")
        .eq("member_id", targetMemberId)
        .eq("gym_id", targetGymId)
        .eq("status", "active")
        .not("authorize_net_subscription_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (membership?.authorize_net_subscription_id) {
        activeSubscriptionId = membership.authorize_net_subscription_id
      }
    }

    // Fallback: check recent payments
    if (!activeSubscriptionId) {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("authorize_net_subscription_id")
        .eq("member_id", targetMemberId)
        .eq("gym_id", targetGymId)
        .not("authorize_net_subscription_id", "is", null)
        .order("paid_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (payment?.authorize_net_subscription_id) {
        activeSubscriptionId = payment.authorize_net_subscription_id
      }
    }

    // 2. Perform Real Authorize.Net Gateway Update if active subscription exists
    if (activeSubscriptionId) {
      const updateResult = await updateSubscriptionPaymentMethod({
        subscriptionId: activeSubscriptionId,
        cardNumber: cleanCard,
        expirationDate: cleanExp,
        cvv: String(cvv),
        zip: zip || undefined,
        firstName: memberRecord.first_name,
        lastName: memberRecord.last_name,
      })

      if (!updateResult.success) {
        return NextResponse.json(
          {
            success: false,
            message: updateResult.message || "Payment gateway declined payment method update.",
          },
          { status: 400 }
        )
      }
    }

    // 3. Persist Non-Sensitive Metadata in Supabase (NEVER full card or CVV)
    const maskedPaymentMethod = `Card ending in ${last4}`

    // Update latest payment record display string
    const { data: latestPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("member_id", targetMemberId)
      .eq("gym_id", targetGymId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestPayment?.id) {
      await supabaseAdmin
        .from("payments")
        .update({
          payment_method: maskedPaymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", latestPayment.id)
    }

    // 4. Record Audit Log
    await supabaseAdmin.from("audit_logs").insert({
      gym_id: targetGymId,
      actor_id: authUser.id,
      actor_role: authUser.role,
      action: "update_payment_method",
      target_type: "member",
      target_id: targetMemberId,
      details: {
        last4,
        subscription_updated: Boolean(activeSubscriptionId),
        subscription_id: activeSubscriptionId || null,
      },
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: activeSubscriptionId
        ? "Payment method successfully updated with Authorize.Net."
        : "Payment details saved successfully.",
      last4,
      paymentMethod: maskedPaymentMethod,
    })
  } catch (err: any) {
    console.error("Update payment method API error:", err)
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error during payment update." },
      { status: 500 }
    )
  }
}
