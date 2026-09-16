import { createClient } from "@supabase/supabase-js"
import {
  chargeCreditCard,
  createRecurringSubscription,
  refundTransaction,
  cancelRecurringSubscription,
} from "@/lib/payments/authorizenet"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug")?.trim()

    if (!slug) {
      return Response.json(
        { success: false, message: "Signup form slug is required." },
        { status: 400 },
      )
    }

    const { data: signupForm, error: formError } = await supabaseAdmin
      .from("signup_forms")
      .select(
        "id,gym_id,name,description,slug,status,selected_products,customer_fields,waiver,waiver_id",
      )
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle()

    if (formError || !signupForm) {
      return Response.json(
        { success: false, message: "This signup form is not available." },
        { status: 404 },
      )
    }

    let waiver = signupForm.waiver

    if (signupForm.waiver_id) {
      const { data: masterWaiver } = await supabaseAdmin
        .from("waivers")
        .select("id,name,content,updated_at")
        .eq("id", signupForm.waiver_id)
        .eq("gym_id", signupForm.gym_id)
        .maybeSingle()

      if (masterWaiver) {
        waiver = {
          name: masterWaiver.name,
          content: masterWaiver.content,
          updatedAt: masterWaiver.updated_at,
        }
      }
    }

    return Response.json({
      success: true,
      form: {
        ...signupForm,
        waiver,
      },
    })
  } catch (error) {
    console.error("Public signup form lookup error:", error)
    return Response.json(
      { success: false, message: "Unable to load the signup form." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null
  let paymentResult: any = null
  let activeSubmissionId: string | null = null

  try {
    const body = await request.json()

    const {
      submissionId,
      signupFormId,
      gymId,
      email,
      fullName,
      password,
      customerData = {},
      selectedProduct,
      paymentData,
      waiverData,
    } = body

    if (!signupFormId || !gymId || !email) {
      return Response.json(
        {
          success: false,
          message: "Signup form, gym ID and email are required.",
        },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    /*
     * 1. Prevent duplicate email registration
     */
    const { data: existingProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      return Response.json(
        {
          success: false,
          message: "An account with this email address already exists. Please log in or use a different email.",
        },
        { status: 409 }
      )
    }

    /*
     * 2. Verify signup form belongs to gym and is active
     */
    const { data: signupForm, error: formError } = await supabaseAdmin
      .from("signup_forms")
      .select("id, gym_id, name, status, selected_products, waiver, waiver_id")
      .eq("id", signupFormId)
      .eq("gym_id", gymId)
      .eq("status", "active")
      .single()

    if (formError || !signupForm) {
      return Response.json(
        {
          success: false,
          message: "Signup form is invalid, inactive, or not found.",
        },
        { status: 400 }
      )
    }

    /*
     * 3. Authorize and Validate Selected Product against Form (Requirement 7)
     * Never trust client prices, product IDs or discounts.
     */
    let productDetails: any = null
    let amountToCharge = 0
    let isRecurring = false

    if (selectedProduct) {
      // Check if product is in the form's allowed products list
      const allowedProducts = Array.isArray(signupForm.selected_products)
        ? signupForm.selected_products
        : []

      const isAllowedOnForm = allowedProducts.some((p: any) => {
        if (typeof p === "string") {
          return p === selectedProduct
        }
        if (typeof p === "object" && p !== null) {
          return (
            String(p.id) === String(selectedProduct) ||
            String(p.name).toLowerCase() === String(selectedProduct).toLowerCase()
          )
        }
        return false
      })

      if (!isAllowedOnForm) {
        return Response.json(
          {
            success: false,
            message: "The requested product is not permitted on this signup form.",
          },
          { status: 400 }
        )
      }

      // Authoritatively fetch product from database
      const { data: dbProduct, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("gym_id", gymId)
        .eq("active", true)
        .or(`id.eq.${selectedProduct},name.eq.${selectedProduct}`)
        .maybeSingle()

      if (prodErr || !dbProduct) {
        return Response.json(
          {
            success: false,
            message: "Selected product does not exist or is currently inactive.",
          },
          { status: 400 }
        )
      }

      productDetails = dbProduct

      // Authoritatively calculate price and discounts from DB only
      let price = Number(dbProduct.price || 0)
      if (dbProduct.discount_enabled && dbProduct.discount_value) {
        if (dbProduct.discount_type === "percentage") {
          price = price - (price * Number(dbProduct.discount_value)) / 100
        } else {
          price = Math.max(0, price - Number(dbProduct.discount_value))
        }
      }

      amountToCharge = Math.max(0, Math.round(price * 100) / 100)
      isRecurring = dbProduct.payment_type === "recurring"
    }

    /*
     * 4. State Machine: Record or Update signup_submission as pending
     */
    activeSubmissionId = submissionId || null
    if (!activeSubmissionId) {
      const { data: newSub } = await supabaseAdmin
        .from("signup_submissions")
        .insert({
          signup_form_id: signupForm.id,
          gym_id: gymId,
          customer_data: customerData,
          selected_product: selectedProduct || null,
          waiver_accepted: Boolean(waiverData?.accepted),
          status: "pending",
        })
        .select("id")
        .maybeSingle()

      if (newSub?.id) {
        activeSubmissionId = newSub.id
      }
    }

    const firstName =
      customerData.firstName ||
      customerData["First Name"] ||
      fullName?.split(" ")[0] ||
      "Member"
    const lastName =
      customerData.lastName ||
      customerData["Last Name"] ||
      fullName?.split(" ").slice(1).join(" ") ||
      ""
    const customerFullName = fullName || `${firstName} ${lastName}`.trim() || "Member"

    /*
     * 5. Process Payment via Authorize.Net (if payment required)
     */
    if (amountToCharge > 0) {
      if (!paymentData?.cardNumber || !paymentData?.expirationDate || !paymentData?.cvv) {
        return Response.json(
          {
            success: false,
            message: "Payment card details (card number, expiration, CVV) are required.",
          },
          { status: 400 }
        )
      }

      if (isRecurring) {
        paymentResult = await createRecurringSubscription({
          name: productDetails?.name || "Gym Membership",
          amount: amountToCharge,
          cardNumber: paymentData.cardNumber,
          expirationDate: paymentData.expirationDate,
          cvv: paymentData.cvv,
          email: normalizedEmail,
          firstName,
          lastName,
        })
      } else {
        paymentResult = await chargeCreditCard({
          amount: amountToCharge,
          cardNumber: paymentData.cardNumber,
          expirationDate: paymentData.expirationDate,
          cvv: paymentData.cvv,
          email: normalizedEmail,
          productDescription: productDetails?.name || "Gym Membership",
          billingAddress: {
            firstName,
            lastName,
            address: customerData.address || customerData["Address"],
            city: customerData.city || customerData["City"],
            state: customerData.state || customerData["State"],
            zip: customerData.zip || customerData["Zip Code"] || customerData["Postal Code"],
          },
        })
      }

      // If payment declined, abort cleanly
      if (!paymentResult.success) {
        if (activeSubmissionId) {
          await supabaseAdmin
            .from("signup_submissions")
            .update({ status: "failed" })
            .eq("id", activeSubmissionId)
        }

        return Response.json(
          {
            success: false,
            message: paymentResult.message || "Payment declined by gateway. Please verify card details.",
          },
          { status: 400 }
        )
      }
    }

    /*
     * 6. Create Supabase Auth User with Transactional Safety
     */
    const userPassword = password || `Gym@${Math.random().toString(36).slice(-8)}`

    const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(userPassword),
      email_confirm: true,
      user_metadata: {
        full_name: customerFullName,
      },
    })

    if (authError || !newAuth.user) {
      console.error("Critical: Payment succeeded but Auth user creation failed:", authError)

      // Mark submission for recovery
      if (activeSubmissionId) {
        await supabaseAdmin
          .from("signup_submissions")
          .update({
            status: "failed",
            customer_data: {
              ...customerData,
              payment_transaction_id: paymentResult?.transactionId,
              payment_subscription_id: paymentResult?.subscriptionId,
              error: authError?.message,
            },
          })
          .eq("id", activeSubmissionId)
      }

      // Attempt automatic refund/void if one-time charge
      if (paymentResult?.transactionId && !isRecurring) {
        await refundTransaction({
          transactionId: paymentResult.transactionId,
          amount: amountToCharge,
          cardLast4: paymentResult.last4,
        })
      } else if (paymentResult?.subscriptionId && isRecurring) {
        await cancelRecurringSubscription(paymentResult.subscriptionId)
      }

      return Response.json(
        {
          success: false,
          message: authError?.message || "Failed to create member user account.",
        },
        { status: 400 }
      )
    }

    createdAuthUserId = newAuth.user.id

    /*
     * 7. Create Profile & Member Records
     */
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: createdAuthUserId,
      gym_id: gymId,
      full_name: customerFullName,
      email: normalizedEmail,
      phone: customerData.phone || customerData["Phone"] || null,
      role: "member",
      status: "active",
    })

    if (profileError) {
      console.error("Profile insert error:", profileError)
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
      return Response.json(
        { success: false, message: "Failed to initialize member profile." },
        { status: 500 }
      )
    }

    const { error: memberError } = await supabaseAdmin.from("members").insert({
      id: createdAuthUserId,
      gym_id: gymId,
      first_name: firstName,
      last_name: lastName,
      email: normalizedEmail,
      phone: customerData.phone || customerData["Phone"] || null,
      address: customerData.address || customerData["Address"] || null,
      city: customerData.city || customerData["City"] || null,
      state: customerData.state || customerData["State"] || null,
      postal_code: customerData.zip || customerData["Zip Code"] || customerData["Postal Code"] || null,
      authorize_net_customer_id: paymentResult?.customerProfileId || null,
      status: "active",
      joined_at: new Date().toISOString(),
    })

    if (memberError) {
      console.error("Member record error:", memberError)
    }

    /*
     * 8. Create Member Membership (Product Assignment)
     */
    let membershipRecordId: string | null = null

    if (productDetails) {
      const now = new Date()
      let endDate: Date | null = null

      if (productDetails.duration_type === "limited" && productDetails.duration_value) {
        endDate = new Date(now)
        const val = Number(productDetails.duration_value)
        const unit = String(productDetails.duration_unit || "days").toLowerCase()
        if (unit.includes("day")) endDate.setDate(endDate.getDate() + val)
        else if (unit.includes("week")) endDate.setDate(endDate.getDate() + val * 7)
        else if (unit.includes("month")) endDate.setMonth(endDate.getMonth() + val)
        else if (unit.includes("year")) endDate.setFullYear(endDate.getFullYear() + val)
      } else if (productDetails.duration_type === "periodic" && productDetails.period_end_date) {
        endDate = new Date(productDetails.period_end_date)
      }

      const { data: membershipData } = await supabaseAdmin
        .from("member_memberships")
        .insert({
          gym_id: gymId,
          member_id: createdAuthUserId,
          product_id: productDetails.id,
          status: "active",
          price_paid: amountToCharge,
          start_date: now.toISOString(),
          end_date: endDate ? endDate.toISOString() : null,
          remaining_visits:
            productDetails.access_type === "visits" ? Number(productDetails.visit_limit || 0) : null,
          authorize_net_customer_id: paymentResult?.customerProfileId || null,
          authorize_net_subscription_id: paymentResult?.subscriptionId || null,
          authorize_net_transaction_id: paymentResult?.transactionId || null,
        })
        .select("id")
        .maybeSingle()

      if (membershipData) {
        membershipRecordId = membershipData.id
      }
    }

    /*
     * 9. Record Payment in payments table
     */
    if (amountToCharge > 0) {
      await supabaseAdmin.from("payments").insert({
        gym_id: gymId,
        member_id: createdAuthUserId,
        product_id: productDetails?.id || null,
        membership_id: membershipRecordId,
        amount: amountToCharge,
        currency: "USD",
        payment_type: isRecurring ? "recurring" : "one-time",
        status: "paid",
        authorize_net_transaction_id: paymentResult?.transactionId || null,
        authorize_net_subscription_id: paymentResult?.subscriptionId || null,
        payment_method: paymentResult?.last4 ? `Card ending in ${paymentResult.last4}` : "Credit Card",
        paid_at: new Date().toISOString(),
        metadata: {
          source: "public_signup",
          product_name: productDetails?.name || "Gym Plan",
          billing_interval: productDetails?.billing_interval,
          auth_code: paymentResult?.authCode || null,
        },
      })
    }

    /*
     * 10. Save Immutable Signed Waiver Snapshot (Requirement 6)
     */
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    let resolvedWaiverContent = waiverData?.resolvedContent
    if (!resolvedWaiverContent && signupForm.waiver?.content) {
      resolvedWaiverContent = signupForm.waiver.content
        .replace(/\{\{first_name\}\}/gi, firstName)
        .replace(/\{\{last_name\}\}/gi, lastName)
        .replace(/\{\{date\}\}/gi, todayStr)
        .replace(/\[first_name\]/gi, firstName)
        .replace(/\[last_name\]/gi, lastName)
        .replace(/\[date\]/gi, todayStr)
    }

    if (resolvedWaiverContent) {
      await supabaseAdmin.from("signed_waivers").insert({
        gym_id: gymId,
        member_id: createdAuthUserId,
        waiver_id: signupForm.waiver_id || null,
        signup_submission_id: activeSubmissionId,
        waiver_name: waiverData?.name || signupForm.waiver?.name || "Gym Membership Waiver",
        resolved_content: resolvedWaiverContent,
        signer_name: customerFullName,
        signer_email: normalizedEmail,
        signature_data: waiverData?.signature || "Electronic Signature Accepted",
        signed_at: new Date().toISOString(),
      })
    }

    /*
     * 11. Complete Submission State
     */
    if (activeSubmissionId) {
      await supabaseAdmin
        .from("signup_submissions")
        .update({
          member_id: createdAuthUserId,
          status: "completed",
          waiver_accepted: true,
          waiver_snapshot: resolvedWaiverContent ? { content: resolvedWaiverContent } : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeSubmissionId)
    }

    /*
     * 12. Initialize Member Notification Preferences
     */
    await supabaseAdmin.from("member_notification_preferences").upsert({
      member_id: createdAuthUserId,
      gym_id: gymId,
      email_reminders: true,
      sms_reminders: true,
    })

    return Response.json({
      success: true,
      message: "Member signup, payment, and membership activated successfully.",
      memberId: createdAuthUserId,
      email: normalizedEmail,
    })
  } catch (error: any) {
    console.error("Signup API error:", error)
    return Response.json(
      {
        success: false,
        message: error.message || "Something went wrong while processing your signup.",
      },
      { status: 500 }
    )
  }
}
