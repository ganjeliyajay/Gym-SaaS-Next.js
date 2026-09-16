import { NextResponse } from "next/server"

import {
  chargeCreditCard,
  createRecurringSubscription,
} from "@/lib/payments/authorizenet"
import {
  getAuthenticatedServerUser,
  supabaseAdmin,
} from "@/lib/auth/server"

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 },
      )
    }
    const body = await request.json()

    const {
      memberId,
      gymId,
      productId,
      amount,
      cardNumber,
      expirationDate,
      cvv,
      isRecurring,
      customerDetails,
    } = body
    if (
      !amount ||
      !cardNumber ||
      !expirationDate ||
      !cvv
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Card number, expiration date, CVV and amount are required.",
        },
        { status: 400 },
      )
    }

    const requestedAmount = Number(amount)

    if (
      !Number.isFinite(requestedAmount) ||
      requestedAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment amount.",
        },
        { status: 400 },
      )
    }

    const rawCardNumber = String(cardNumber).trim()
    const normalizedCard = rawCardNumber.replace(/\D/g, "")
    const normalizedCvv = String(cvv).replace(/\D/g, "")
    const normalizedExpiration = String(expirationDate).replace(/\D/g, "")

    if (/^[xX*\s-]+$/.test(rawCardNumber)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Enter the actual demo card number. Masked card values are not accepted.",
        },
        { status: 400 },
      )
    }

    if (normalizedCard.length < 13 || normalizedCard.length > 19) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid card number.",
        },
        { status: 400 },
      )
    }

    if (normalizedCvv.length < 3 || normalizedCvv.length > 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid CVV.",
        },
        { status: 400 },
      )
    }

    if (normalizedExpiration.length !== 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid expiration date. Use MM/YY.",
        },
        { status: 400 },
      )
    }
    const effectiveGymId =
      authUser.role === "super_admin"
        ? gymId || authUser.gymId
        : authUser.gymId

    if (!effectiveGymId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gym ID could not be identified.",
        },
        { status: 400 },
      )
    }
    let effectiveMemberId: string | null = null

    if (authUser.role === "member") {
      if (authUser.email) {
        const {
          data: memberByEmail,
          error: memberLookupError,
        } = await supabaseAdmin
          .from("members")
          .select("id, gym_id, status, email")
          .eq("gym_id", effectiveGymId)
          .ilike("email", authUser.email)
          .maybeSingle()

        if (memberLookupError) {
          console.error(
            "Billing - member lookup failed:",
            memberLookupError,
          )

          return NextResponse.json(
            {
              success: false,
              message:
                "Unable to verify your member account.",
            },
            { status: 500 },
          )
        }

        if (!memberByEmail) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Member record not found for your account.",
            },
            { status: 404 },
          )
        }

        effectiveMemberId = memberByEmail.id

        if (memberByEmail.status !== "active") {
          return NextResponse.json(
            {
              success: false,
              message:
                "Your member account is not active.",
            },
            { status: 403 },
          )
        }
      }
    } else if (
      ["admin", "manager", "super_admin"].includes(
        authUser.role,
      )
    ) {
      effectiveMemberId = memberId || null
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            "Permission denied. Staff or member authorization required.",
        },
        { status: 403 },
      )
    }

    if (!effectiveMemberId) {
      return NextResponse.json(
        {
          success: false,
          message: "Member ID is required.",
        },
        { status: 400 },
      )
    }
    const {
      data: targetMember,
      error: targetMemberError,
    } = await supabaseAdmin
      .from("members")
      .select(
        "id, gym_id, first_name, last_name, email, status",
      )
      .eq("id", effectiveMemberId)
      .eq("gym_id", effectiveGymId)
      .maybeSingle()

    if (targetMemberError) {
      console.error(
        "Billing - target member lookup failed:",
        targetMemberError,
      )

      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to verify the member record.",
        },
        { status: 500 },
      )
    }

    if (!targetMember) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Member record not found in this gym facility.",
        },
        { status: 404 },
      )
    }
    let product: any = null
    let finalAmount = requestedAmount

    if (productId) {
      const {
        data: productData,
        error: productError,
      } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("gym_id", effectiveGymId)
        .maybeSingle()

      if (productError) {
        console.error(
          "Billing - product lookup failed:",
          productError,
        )

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to verify the selected membership plan.",
          },
          { status: 500 },
        )
      }

      if (!productData) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Product not found.",
          },
          { status: 404 },
        )
      }

      if (productData.active === false) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This membership product is inactive.",
          },
          { status: 400 },
        )
      }

      product = productData
      let calculatedPrice = Number(
        productData.price || 0,
      )

      if (
        productData.discount_enabled &&
        productData.discount_value
      ) {
        if (
          productData.discount_type ===
          "percentage"
        ) {
          calculatedPrice =
            calculatedPrice -
            (calculatedPrice *
              Number(
                productData.discount_value,
              )) /
            100
        } else {
          calculatedPrice = Math.max(
            0,
            calculatedPrice -
            Number(
              productData.discount_value,
            ),
          )
        }
      }

      finalAmount =
        Math.round(
          Math.max(0, calculatedPrice) * 100,
        ) / 100

      if (finalAmount <= 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "The selected product has an invalid price.",
          },
          { status: 400 },
        )
      }
    }
    const recurring =
      Boolean(isRecurring) ||
      product?.payment_type === "recurring"
    const customerEmail =
      customerDetails?.email ||
      targetMember.email ||
      authUser.email ||
      "member@gym.com"

    const firstName =
      customerDetails?.firstName ||
      targetMember.first_name ||
      authUser.fullName?.split(" ")[0] ||
      "Member"

    const lastName =
      customerDetails?.lastName ||
      targetMember.last_name ||
      authUser.fullName
        ?.split(" ")
        .slice(1)
        .join(" ") ||
      "Member"

    // Process the payment through the configured Authorize.Net gateway.
    // The client amount is never trusted; finalAmount comes from the database product.
    const paymentResult = recurring
      ? await createRecurringSubscription({
          name: product?.name || "Gym Membership",
          amount: finalAmount,
          cardNumber: normalizedCard,
          expirationDate: normalizedExpiration,
          cvv: normalizedCvv,
          email: customerEmail,
          firstName,
          lastName,
        })
      : await chargeCreditCard({
          amount: finalAmount,
          cardNumber: normalizedCard,
          expirationDate: normalizedExpiration,
          cvv: normalizedCvv,
          email: customerEmail,
          cardHolderName: `${firstName} ${lastName}`.trim(),
          productDescription: product?.name || "Gym Membership",
        })

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: paymentResult.message || "Payment was declined by the payment gateway.",
        },
        { status: 402 },
      )
    }

    let membershipRecord = null

    if (product) {
      const now = new Date()

      let endDate: Date | null = null
      if (
        product.duration_type ===
        "limited" &&
        product.duration_value
      ) {
        endDate = new Date(now)

        const value = Number(
          product.duration_value,
        )

        const unit = String(
          product.duration_unit ||
          "days",
        ).toLowerCase()

        if (unit.includes("day")) {
          endDate.setDate(
            endDate.getDate() + value,
          )
        } else if (
          unit.includes("week")
        ) {
          endDate.setDate(
            endDate.getDate() +
            value * 7,
          )
        } else if (
          unit.includes("month")
        ) {
          endDate.setMonth(
            endDate.getMonth() + value,
          )
        } else if (
          unit.includes("year")
        ) {
          endDate.setFullYear(
            endDate.getFullYear() + value,
          )
        }
      }
      if (
        product.duration_type ===
        "periodic" &&
        product.period_end_date
      ) {
        endDate = new Date(
          product.period_end_date,
        )
      }
      let remainingVisits:
        | number
        | null = null

      if (
        product.access_type ===
        "visits"
      ) {
        const visitLimit = Number(
          product.visit_limit || 0,
        )

        remainingVisits =
          Math.max(
            0,
            visitLimit,
          )
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabaseAdmin
        .from("member_memberships")
        .insert({
          gym_id: effectiveGymId,
          member_id:
            effectiveMemberId,
          product_id:
            product.id,
          status: "active",
          price_paid:
            finalAmount,
          start_date:
            now.toISOString(),
          end_date:
            endDate
              ? endDate.toISOString()
              : null,
          remaining_visits:
            remainingVisits,
          authorize_net_transaction_id:
            paymentResult.transactionId ||
            null,
          authorize_net_subscription_id:
            paymentResult.subscriptionId ||
            null,
        })
        .select()
        .single()

      if (membershipError) {
        console.error(
          "Billing - membership creation error:",
          membershipError,
        )

        return NextResponse.json(
          {
            success: false,
            message:
              "Payment was successful, but the membership could not be created. Please contact support.",
            transactionId:
              paymentResult.transactionId ||
              null,
          },
          { status: 500 },
        )
      }

      membershipRecord = membership
    }

    const {
      data: paymentRecord,
      error: paymentInsertError,
    } = await supabaseAdmin
      .from("payments")
      .insert({
        gym_id: effectiveGymId,
        member_id: effectiveMemberId,
        product_id: productId || null,
        membership_id: membershipRecord?.id || null,
        amount: finalAmount,
        currency: "USD",
        payment_type: recurring ? "recurring" : "one-time",
        status: "paid",
        authorize_net_transaction_id: paymentResult.transactionId || null,
        authorize_net_subscription_id: paymentResult.subscriptionId || null,
        payment_method: paymentResult.last4
          ? `Card ending in ${paymentResult.last4}`
          : "Credit Card",
        paid_at: new Date().toISOString(),
        metadata: {
          auth_code: paymentResult.authCode || null,
          response_code: paymentResult.responseCode || null,
          card_type: paymentResult.cardType || null,
          is_recurring: recurring,
          product_name: product?.name || null,
        },
      })
      .select()
      .single()

    if (paymentInsertError) {
      console.error("Billing - payment insert error:", paymentInsertError)

      // The gateway has already approved the payment. Remove the locally-created
      // membership so the account cannot appear active without a payment record.
      if (membershipRecord?.id) {
        await supabaseAdmin
          .from("member_memberships")
          .delete()
          .eq("id", membershipRecord.id)
          .eq("gym_id", effectiveGymId)
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment was approved, but the payment record could not be saved. Please contact support.",
          transactionId: paymentResult.transactionId || null,
        },
        { status: 500 },
      )
    }

    const {
      error: memberUpdateError,
    } = await supabaseAdmin
      .from("members")
      .update({
        status: "active",
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        effectiveMemberId,
      )
      .eq(
        "gym_id",
        effectiveGymId,
      )

    if (memberUpdateError) {
      console.error(
        "Billing - member activation failed:",
        memberUpdateError,
      )
    }
    return NextResponse.json(
      {
        success: true,
        message:
          paymentResult.message || "Payment processed successfully.",
        transactionId:
          paymentResult.transactionId ||
          null,
        subscriptionId:
          paymentResult.subscriptionId ||
          null,
        payment: paymentRecord,
        membership:
          membershipRecord,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error(
      "Billing charge API error:",
      error,
    )

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to process payment.",
      },
      { status: 500 },
    )
  }
}