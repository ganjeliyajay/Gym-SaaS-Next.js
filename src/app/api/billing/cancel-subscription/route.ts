import { NextResponse } from "next/server"
import { cancelRecurringSubscription } from "@/lib/payments/authorizenet"
import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentId, memberId, gymId, subscriptionId, reason } = body

    const targetGymId =
      authUser.role === "super_admin" ? (gymId || authUser.gymId) : authUser.gymId

    let targetMemberId = memberId || authUser.id
    if (authUser.role === "member") {
      targetMemberId = authUser.id
    } else if (!["admin", "manager", "super_admin"].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Staff or member authorization required." },
        { status: 403 }
      )
    }

    let memberCheck = null

    if (authUser.role === "member") {
      const { data: byId } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("id", authUser.id)
        .eq("gym_id", targetGymId)
        .maybeSingle()

      memberCheck = byId

      if (!memberCheck && authUser.email) {
        const { data: byEmail } = await supabaseAdmin
          .from("members")
          .select("id")
          .eq("gym_id", targetGymId)
          .ilike("email", authUser.email)
          .maybeSingle()

        memberCheck = byEmail
        if (memberCheck) {
          targetMemberId = memberCheck.id
        }
      }
    } else {
      const { data: byId } = await supabaseAdmin
        .from("members")
        .select("id")
        .eq("id", targetMemberId)
        .eq("gym_id", targetGymId)
        .maybeSingle()

      memberCheck = byId
    }

    if (!memberCheck) {
      return NextResponse.json(
        { success: false, message: "Member not found in this gym." },
        { status: 404 }
      )
    }

    let targetSubId = subscriptionId

    // If paymentId is passed, resolve payment details
    if (paymentId) {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("id, member_id, gym_id, authorize_net_subscription_id")
        .eq("id", paymentId)
        .eq("gym_id", targetGymId)
        .maybeSingle()

      if (payment?.authorize_net_subscription_id) {
        targetSubId = targetSubId || payment.authorize_net_subscription_id
      }
    }

    // 1. Fetch active subscription ID if not provided directly
    if (!targetSubId) {
      const { data: membership } = await supabaseAdmin
        .from("member_memberships")
        .select("id, authorize_net_subscription_id")
        .eq("member_id", targetMemberId)
        .eq("gym_id", targetGymId)
        .eq("status", "active")
        .maybeSingle()

      if (membership?.authorize_net_subscription_id) {
        targetSubId = membership.authorize_net_subscription_id
      }
    }

    // 2. Cancel in Authorize.Net if subscriptionId exists
    if (targetSubId) {
      const cancelResult = await cancelRecurringSubscription(targetSubId)
      if (!cancelResult.success) {
        console.warn("Authorize.Net subscription cancellation gateway notice:", cancelResult.message)
      }
    }

    // 3. Update member_memberships record
    const now = new Date().toISOString()
    await supabaseAdmin
      .from("member_memberships")
      .update({
        status: "cancelled",
        cancelled_at: now,
        cancellation_reason: reason || "Cancelled by user/staff",
        updated_at: now,
      })
      .eq("member_id", targetMemberId)
      .eq("gym_id", targetGymId)
      .eq("status", "active")

    // 4. Update member account status
    await supabaseAdmin
      .from("members")
      .update({
        status: "inactive",
        updated_at: now,
      })
      .eq("id", targetMemberId)
      .eq("gym_id", targetGymId)

    return NextResponse.json({
      success: true,
      message: "Membership subscription cancelled successfully.",
    })
  } catch (err: any) {
    console.error("Cancel subscription API error:", err)
    return NextResponse.json(
      { success: false, message: err.message || "Failed to cancel subscription." },
      { status: 500 }
    )
  }
}
