import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/auth/server"
import { verifyAuthorizeNetWebhookSignature } from "@/lib/payments/authorizenet"

export async function POST(request: Request) {
  let rawBody = ""
  try {
    rawBody = await request.text()
    const signatureHeader =
      request.headers.get("x-anet-signature") ||
      request.headers.get("X-ANET-SIGNATURE")

    // 1. Verify Webhook Signature Authenticity
    const isSignatureValid = verifyAuthorizeNetWebhookSignature(rawBody, signatureHeader)
    if (!isSignatureValid) {
      console.warn("Unauthorized Authorize.Net webhook attempt: invalid or missing signature.")
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 401 }
      )
    }

    // 2. Parse Event Payload
    const event = JSON.parse(rawBody)
    const eventId =
      event.notificationId ||
      event.eventId ||
      (event.payload?.id ? `evt_${event.eventType}_${event.payload.id}` : null) ||
      `evt_${Date.now()}`
    const eventType = String(event.eventType || "").toLowerCase()
    const payload = event.payload || {}

    // 3. Webhook Idempotency Check
    const { data: existingEvent } = await supabaseAdmin
      .from("webhook_events")
      .select("id, status")
      .eq("provider", "authorizenet")
      .eq("event_id", eventId)
      .maybeSingle()

    if (existingEvent) {
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: "Event already processed.",
        eventId,
      })
    }

    // Record event in webhook_events table as pending
    await supabaseAdmin.from("webhook_events").insert({
      provider: "authorizenet",
      event_id: eventId,
      event_type: eventType,
      payload: event,
      status: "pending",
      created_at: new Date().toISOString(),
    })

    const nowIso = new Date().toISOString()

    // 4. Process Specific Event Types
    if (
      eventType === "net.authorize.payment.authcapture.created" ||
      eventType === "net.authorize.payment.capture.created" ||
      eventType === "net.authorize.payment.priorauthcapture.created"
    ) {
      const transactionId = String(payload.id || "")
      const subscriptionId = String(
        payload.subscription?.id || payload.subscriptionId || ""
      )
      const customerProfileId = String(payload.customerProfileId || "")
      const amount = Number(payload.authAmount || payload.amount || 0)

      let targetMembership: any = null
      let targetGymId: string | null = null
      let targetMemberId: string | null = null

      if (subscriptionId) {
        const { data: membership } = await supabaseAdmin
          .from("member_memberships")
          .select("id, gym_id, member_id, product_id, status")
          .eq("authorize_net_subscription_id", subscriptionId)
          .maybeSingle()

        if (membership) {
          targetMembership = membership
          targetGymId = membership.gym_id
          targetMemberId = membership.member_id
        }
      }

      // If not resolved by subscription, look up by customerProfileId
      if (!targetMemberId && customerProfileId) {
        const { data: member } = await supabaseAdmin
          .from("members")
          .select("id, gym_id")
          .eq("authorize_net_customer_id", customerProfileId)
          .maybeSingle()

        if (member) {
          targetGymId = member.gym_id
          targetMemberId = member.id
        }
      }

      if (targetGymId && targetMemberId) {
        // Prevent duplicate payment entry for same transaction
        const { data: existingPay } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("authorize_net_transaction_id", transactionId)
          .maybeSingle()

        if (!existingPay) {
          await supabaseAdmin.from("payments").insert({
            gym_id: targetGymId,
            member_id: targetMemberId,
            product_id: targetMembership?.product_id || null,
            membership_id: targetMembership?.id || null,
            amount,
            amount_due: amount,
            amount_paid: amount,
            outstanding_amount: 0,
            currency: "USD",
            payment_type: subscriptionId ? "recurring" : "one-time",
            status: "paid",
            authorize_net_transaction_id: transactionId,
            authorize_net_subscription_id: subscriptionId || null,
            authorize_net_customer_id: customerProfileId || null,
            payment_method: "Credit Card (Webhook sync)",
            paid_at: nowIso,
            metadata: {
              source: "authorizenet_webhook",
              event_id: eventId,
              event_type: eventType,
            },
          })
        }

        // Keep membership active & advance period renewal dates
        if (targetMembership?.id) {
          const nextPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          await supabaseAdmin
            .from("member_memberships")
            .update({
              status: "active",
              period_start_date: nowIso,
              period_end_date: nextPeriodEnd,
              updated_at: nowIso,
            })
            .eq("id", targetMembership.id)
        }

        // Ensure member is active
        await supabaseAdmin
          .from("members")
          .update({ status: "active", updated_at: nowIso })
          .eq("id", targetMemberId)
      }
    } else if (
      eventType === "net.authorize.payment.failed" ||
      eventType === "net.authorize.payment.fraud.declined"
    ) {
      const transactionId = String(payload.id || "")
      const subscriptionId = String(payload.subscription?.id || payload.subscriptionId || "")
      const amount = Number(payload.authAmount || payload.amount || 0)

      if (subscriptionId) {
        const { data: membership } = await supabaseAdmin
          .from("member_memberships")
          .select("id, gym_id, member_id, product_id")
          .eq("authorize_net_subscription_id", subscriptionId)
          .maybeSingle()

        if (membership) {
          // Record failed payment with outstanding due amount
          await supabaseAdmin.from("payments").insert({
            gym_id: membership.gym_id,
            member_id: membership.member_id,
            product_id: membership.product_id,
            membership_id: membership.id,
            amount,
            amount_due: amount,
            amount_paid: 0,
            outstanding_amount: amount,
            due_at: nowIso,
            currency: "USD",
            payment_type: "recurring",
            status: "failed",
            authorize_net_transaction_id: transactionId || null,
            authorize_net_subscription_id: subscriptionId,
            failure_reason: payload.responseReasonDescription || "Recurring billing transaction declined",
            failed_at: nowIso,
            metadata: {
              source: "authorizenet_webhook",
              event_id: eventId,
              event_type: eventType,
            },
          })

          // Apply grace period: mark membership past_due (not immediately cancelled)
          await supabaseAdmin
            .from("member_memberships")
            .update({ status: "past_due", updated_at: nowIso })
            .eq("id", membership.id)
        }
      }
    } else if (
      eventType.includes("dispute") ||
      eventType.includes("chargeback")
    ) {
      // Record dispute/chargeback in chargebacks table
      const transactionId = String(payload.refTransId || payload.id || "")
      const disputeAmount = Number(payload.amount || payload.disputeAmount || 0)

      const { data: originalPayment } = await supabaseAdmin
        .from("payments")
        .select("id, gym_id, member_id, amount")
        .eq("authorize_net_transaction_id", transactionId)
        .maybeSingle()

      if (originalPayment) {
        await supabaseAdmin.from("chargebacks").insert({
          gym_id: originalPayment.gym_id,
          member_id: originalPayment.member_id,
          payment_id: originalPayment.id,
          authorize_net_transaction_id: transactionId,
          amount: disputeAmount || originalPayment.amount,
          status: "opened",
          reason: payload.responseReasonDescription || "Dispute received via Authorize.Net webhook",
          provider_reference: eventId,
          dispute_date: nowIso,
        })

        // Update payment status to chargeback
        await supabaseAdmin
          .from("payments")
          .update({
            status: "chargeback",
            updated_at: nowIso,
          })
          .eq("id", originalPayment.id)
      }
    } else if (
      eventType === "net.authorize.customer.subscription.cancelled" ||
      eventType === "net.authorize.customer.subscription.terminated"
    ) {
      const subscriptionId = String(payload.id || payload.subscriptionId || "")
      if (subscriptionId) {
        const { data: membership } = await supabaseAdmin
          .from("member_memberships")
          .select("id, gym_id, member_id")
          .eq("authorize_net_subscription_id", subscriptionId)
          .maybeSingle()

        if (membership) {
          await supabaseAdmin
            .from("member_memberships")
            .update({
              status: "cancelled",
              cancelled_at: nowIso,
              cancellation_reason: "Cancelled by Authorize.Net event synchronization",
              updated_at: nowIso,
            })
            .eq("id", membership.id)

          await supabaseAdmin
            .from("members")
            .update({ status: "inactive", updated_at: nowIso })
            .eq("id", membership.member_id)
        }
      }
    } else if (eventType === "net.authorize.payment.refund.created") {
      const refTransId = String(payload.refTransId || payload.id || "")
      const refundAmount = Number(payload.amount || 0)

      if (refTransId) {
        await supabaseAdmin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: nowIso,
            refund_amount: refundAmount,
            metadata: {
              refund_event_id: eventId,
              synced_from_webhook: true,
            },
          })
          .eq("authorize_net_transaction_id", refTransId)
      }
    }

    // 5. Update webhook_events to processed
    await supabaseAdmin
      .from("webhook_events")
      .update({
        status: "processed",
        processed_at: nowIso,
      })
      .eq("event_id", eventId)

    return NextResponse.json({
      success: true,
      processed: true,
      eventId,
      eventType,
    })
  } catch (err: any) {
    console.error("Authorize.Net webhook processing error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process webhook event." },
      { status: 500 }
    )
  }
}
