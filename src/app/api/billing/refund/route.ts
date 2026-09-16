import { NextResponse } from "next/server"

import {
  getAuthenticatedServerUser,
  supabaseAdmin,

} from "@/lib/auth/server"

import {
  refundTransaction,
} from "@/lib/payments/authorizenet"

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------
    const authUser =
      await getAuthenticatedServerUser()

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 },
      )
    }

    // --------------------------------------------------
    // STAFF ONLY
    // --------------------------------------------------
    const allowedRoles = [
      "admin",
      "manager",
      "super_admin",
    ]

    if (
      !allowedRoles.includes(
        authUser.role,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Permission denied. Only gym staff can issue refunds.",
        },
        { status: 403 },
      )
    }

    // --------------------------------------------------
    // REQUEST
    // --------------------------------------------------
    const body = await request.json()

    const paymentId =
      String(
        body?.paymentId ?? "",
      ).trim()

    const requestedGymId =
      String(
        body?.gymId ?? "",
      ).trim()

    const reason =
      String(
        body?.reason ?? "",
      ).trim()

    const requestedAmount =
      body?.amount !== undefined &&
      body?.amount !== null &&
      body?.amount !== ""
        ? Number(body.amount)
        : null

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment ID is required.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // GYM
    // --------------------------------------------------
    const targetGymId =
      authUser.role ===
      "super_admin"
        ? requestedGymId ||
          authUser.gymId
        : authUser.gymId

    if (!targetGymId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gym ID could not be identified.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // FETCH PAYMENT
    // --------------------------------------------------
    const {
      data: payment,
      error: paymentError,
    } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .eq("gym_id", targetGymId)
      .maybeSingle()

    if (paymentError) {
      console.error(
        "Refund - payment lookup failed:",
        paymentError,
      )

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to verify the payment record.",
        },
        { status: 500 },
      )
    }

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment record not found for this gym.",
        },
        { status: 404 },
      )
    }

    // --------------------------------------------------
    // PAYMENT STATUS
    // --------------------------------------------------
    if (payment.status !== "paid") {
      return NextResponse.json(
        {
          success: false,
          message:
            `Only paid payments can be refunded. Current status: ${payment.status}.`,
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // ORIGINAL AMOUNT
    // --------------------------------------------------
    const originalAmount =
      Number(payment.amount)

    if (
      !Number.isFinite(
        originalAmount,
      ) ||
      originalAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The payment has an invalid amount.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // REFUND AMOUNT
    // --------------------------------------------------
    const refundAmount =
      requestedAmount === null
        ? originalAmount
        : requestedAmount

    if (
      !Number.isFinite(
        refundAmount,
      ) ||
      refundAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Refund amount must be greater than zero.",
        },
        { status: 400 },
      )
    }

    if (
      refundAmount >
      originalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Refund amount cannot be greater than the original payment amount.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // EXISTING REFUND AMOUNT
    // --------------------------------------------------
    const alreadyRefunded =
      Number(
        payment.refund_amount ||
          0,
      )

    if (
      alreadyRefunded >=
      originalAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This payment has already been fully refunded.",
        },
        { status: 400 },
      )
    }

    const remainingRefundable =
      Math.max(
        0,
        originalAmount -
          alreadyRefunded,
      )

    if (
      refundAmount >
      remainingRefundable
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Only $${remainingRefundable.toFixed(
              2,
            )} is remaining refundable amount.`,
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // TRANSACTION ID
    // --------------------------------------------------
    const transactionId =
      payment.authorize_net_transaction_id

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Authorize.Net transaction ID was found for this payment.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // CARD LAST 4
    // --------------------------------------------------
    const paymentMethod =
      typeof payment.payment_method ===
      "string"
        ? payment.payment_method
        : ""

    const last4Match =
      paymentMethod.match(
        /(\d{4})$/,
      )

    const cardLast4 =
      last4Match?.[1]

    if (!cardLast4) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The last four digits of the original card could not be verified for this refund.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // AUTHORIZE.NET REFUND
    // --------------------------------------------------
    const refundResult =
      await refundTransaction({
        transactionId,
        amount: refundAmount,
        cardLast4,
      })

    if (!refundResult.success) {
      console.error(
        "Refund - Authorize.Net refund failed:",
        refundResult,
      )

      return NextResponse.json(
        {
          success: false,
          message:
            refundResult.message ||
            "Unable to process the refund.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // TOTAL REFUNDED
    // --------------------------------------------------
    const totalRefunded =
      Math.round(
        (alreadyRefunded +
          refundAmount) *
          100,
      ) / 100

    const fullyRefunded =
      totalRefunded >=
      originalAmount

    // --------------------------------------------------
    // PAYMENT METADATA
    // --------------------------------------------------
    const existingMetadata =
      payment.metadata &&
      typeof payment.metadata ===
        "object" &&
      !Array.isArray(
        payment.metadata,
      )
        ? payment.metadata
        : {}

    const updatedMetadata = {
      ...existingMetadata,
      refund_reason:
        reason ||
        "Staff issued refund",
      refund_transaction_id:
        refundResult.refundTransactionId ||
        null,
      refund_processed_at:
        new Date().toISOString(),
      refund_processed_by:
        authUser.id,
    }

    // --------------------------------------------------
    // UPDATE PAYMENT
    // --------------------------------------------------
    const {
      data: updatedPayment,
      error: updateError,
    } = await supabaseAdmin
      .from("payments")
      .update({
        status: fullyRefunded
          ? "refunded"
          : "pending",
        refund_amount:
          totalRefunded,
        refunded_at:
          new Date().toISOString(),
        metadata:
          updatedMetadata,
      })
      .eq("id", paymentId)
      .eq("gym_id", targetGymId)
      .select()
      .single()

    if (updateError) {
      console.error(
        "Refund - payment database update failed:",
        updateError,
      )

      return NextResponse.json(
        {
          success: false,
          message:
            "Refund was processed by the payment gateway, but the payment record could not be updated. Please contact support.",
          refundTransactionId:
            refundResult.refundTransactionId ||
            null,
        },
        { status: 500 },
      )
    }

    // --------------------------------------------------
    // FULL REFUND → CANCEL RELATED MEMBERSHIP
    // --------------------------------------------------
    if (
      fullyRefunded &&
      payment.member_id
    ) {
      let membershipQuery =
        supabaseAdmin
          .from(
            "member_memberships",
          )
          .update({
            status:
              "cancelled",
            cancelled_at:
              new Date().toISOString(),
            cancellation_reason:
              `Refunded: ${
                reason ||
                "Refund issued"
              }`,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "member_id",
            payment.member_id,
          )
          .eq(
            "gym_id",
            targetGymId,
          )
          .eq(
            "status",
            "active",
          )

      // Prefer the exact membership linked
      // to the payment when available.
      if (payment.membership_id) {
        membershipQuery =
          supabaseAdmin
            .from(
              "member_memberships",
            )
            .update({
              status:
                "cancelled",
              cancelled_at:
                new Date().toISOString(),
              cancellation_reason:
                `Refunded: ${
                  reason ||
                  "Refund issued"
                }`,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              payment.membership_id,
            )
            .eq(
              "member_id",
              payment.member_id,
            )
            .eq(
              "gym_id",
              targetGymId,
            )
            .eq(
              "status",
              "active",
            )
      }

      const {
        error:
          membershipUpdateError,
      } =
        await membershipQuery

      if (
        membershipUpdateError
      ) {
        console.error(
          "Refund - membership cancellation failed:",
          membershipUpdateError,
        )
      }
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        message: fullyRefunded
          ? "Full refund processed successfully."
          : "Partial refund processed successfully.",
        refundTransactionId:
          refundResult.refundTransactionId ||
          null,
        refundAmount,
        totalRefunded,
        remainingRefundable:
          Math.max(
            0,
            originalAmount -
              totalRefunded,
          ),
        fullyRefunded,
        payment:
          updatedPayment,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(
      "Refund API unexpected error:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to process refund.",
      },
      { status: 500 },
    )
  }
}