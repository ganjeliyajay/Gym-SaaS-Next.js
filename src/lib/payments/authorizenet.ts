/**
 * Authorize.Net Integration Module
 * Full server-side handling for one-time payments, recurring subscriptions, refunds, and customer profiles.
 * Strictly uses environment variables. Never stores full card number or CVV.
 */

export type AuthorizeNetConfig = {
  apiLoginId: string
  transactionKey: string
  signatureKey?: string
  environment: "SANDBOX" | "PRODUCTION"
}

export function getAuthorizeNetConfig(): AuthorizeNetConfig {
  const apiLoginId = process.env.AUTHORIZENET_API_LOGIN_ID || ""
  const transactionKey = process.env.AUTHORIZENET_TRANSACTION_KEY || ""
  const signatureKey = process.env.AUTHORIZENET_SIGNATURE_KEY || ""
  const environment =
    (process.env.AUTHORIZENET_ENVIRONMENT?.toUpperCase() as "SANDBOX" | "PRODUCTION") ||
    "SANDBOX"

  if (!apiLoginId || !transactionKey) {
    throw new Error(
      "Authorize.Net credentials are not properly configured in server environment variables (AUTHORIZENET_API_LOGIN_ID, AUTHORIZENET_TRANSACTION_KEY)."
    )
  }

  return { apiLoginId, transactionKey, signatureKey, environment }
}

function getEndpoint(environment: "SANDBOX" | "PRODUCTION") {
  return environment === "PRODUCTION"
    ? "https://api.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api"
}

/**
 * Executes a raw JSON request to Authorize.Net endpoint.
 */
async function postToAuthorizeNet(payload: any, config?: AuthorizeNetConfig): Promise<any> {
  const currentConfig = config || getAuthorizeNetConfig()
  const endpoint = getEndpoint(currentConfig.environment)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  })

  const rawText = await response.text()
  // Clean potential UTF-8 BOM characters returned by Authorize.Net
  const cleanJson = rawText.replace(/^\uFEFF/, "")
  try {
    return JSON.parse(cleanJson)
  } catch (err) {
    console.error("Failed to parse Authorize.Net response:", rawText)
    throw new Error("Invalid response received from Authorize.Net payment gateway.")
  }
}

export type ChargeCardParams = {
  amount: number
  cardNumber: string
  expirationDate: string // MMYY or MM/YY
  cvv: string
  cardHolderName?: string
  email: string
  billingAddress?: {
    firstName?: string
    lastName?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  productDescription?: string
}

export type PaymentResult = {
  success: boolean
  transactionId?: string
  customerProfileId?: string
  subscriptionId?: string
  authCode?: string
  responseCode?: string
  message: string
  last4?: string
  cardType?: string
}

/**
 * 1. Charge a credit card for a one-time transaction (authCaptureTransaction)
 */
export async function chargeCreditCard(
  params: ChargeCardParams,
  config?: AuthorizeNetConfig
): Promise<PaymentResult> {
  const cleanCard = params.cardNumber.replace(/\D/g, "")
  const cleanExp = params.expirationDate.replace(/\D/g, "")
  const last4 = cleanCard.slice(-4)

  try {
    const currentConfig = config || getAuthorizeNetConfig()

    const firstName =
      params.billingAddress?.firstName ||
      params.cardHolderName?.split(" ")[0] ||
      "Valued"
    const lastName =
      params.billingAddress?.lastName ||
      params.cardHolderName?.split(" ").slice(1).join(" ") ||
      "Member"

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: currentConfig.apiLoginId,
          transactionKey: currentConfig.transactionKey,
        },
        refId: `txn_${Date.now()}`,
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: params.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: cleanCard,
              expirationDate: cleanExp,
              cardCode: params.cvv,
            },
          },
          lineItems: {
            lineItem: {
              itemId: "1",
              name: (params.productDescription || "Gym Membership").slice(0, 30),
              description: (params.productDescription || "Gym Membership Service").slice(0, 255),
              quantity: "1",
              unitPrice: params.amount.toFixed(2),
            },
          },
          customer: {
            email: params.email,
          },
          billTo: {
            firstName,
            lastName,
            address: params.billingAddress?.address || "100 Fitness Way",
            city: params.billingAddress?.city || "New York",
            state: params.billingAddress?.state || "NY",
            zip: params.billingAddress?.zip || "10001",
            country: params.billingAddress?.country || "USA",
          },
        },
      },
    }

    const data = await postToAuthorizeNet(payload, currentConfig)
    const txResponse = data?.transactionResponse
    const messages = data?.messages

    if (
      messages?.resultCode?.toLowerCase() === "ok" &&
      txResponse?.responseCode === "1"
    ) {
      return {
        success: true,
        transactionId: txResponse.transId,
        authCode: txResponse.authCode,
        responseCode: txResponse.responseCode,
        message: txResponse?.messages?.[0]?.description || "Payment processed successfully.",
        last4,
        cardType: txResponse?.accountType || "Credit Card",
      }
    }

    const errDesc =
      txResponse?.errors?.[0]?.errorText ||
      messages?.message?.[0]?.text ||
      "Payment declined by gateway."

    return {
      success: false,
      responseCode: txResponse?.responseCode,
      message: errDesc,
      last4,
    }
  } catch (error: any) {
    console.error("Authorize.Net exception:", error)
    return {
      success: false,
      message: error.message || "Failed to communicate with Authorize.Net.",
      last4,
    }
  }
}

export type RecurringSubscriptionParams = {
  name: string
  amount: number
  intervalMonths?: number
  cardNumber: string
  expirationDate: string
  cvv: string
  email: string
  firstName: string
  lastName: string
}

/**
 * 2. Create Recurring ARB Subscription (ARBCreateSubscriptionRequest)
 */
export async function createRecurringSubscription(
  params: RecurringSubscriptionParams,
  config?: AuthorizeNetConfig
): Promise<PaymentResult> {
  const cleanCard = params.cardNumber.replace(/\D/g, "")
  const cleanExp = params.expirationDate.replace(/\D/g, "")
  const last4 = cleanCard.slice(-4)

  try {
    const currentConfig = config || getAuthorizeNetConfig()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const startDate = tomorrow.toISOString().split("T")[0]

    const payload = {
      ARBCreateSubscriptionRequest: {
        merchantAuthentication: {
          name: currentConfig.apiLoginId,
          transactionKey: currentConfig.transactionKey,
        },
        refId: `sub_${Date.now()}`,
        subscription: {
          name: params.name.slice(0, 50),
          paymentSchedule: {
            interval: {
              length: String(params.intervalMonths || 1),
              unit: "months",
            },
            startDate,
            totalOccurrences: "9999",
          },
          amount: params.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: cleanCard,
              expirationDate: cleanExp,
              cardCode: params.cvv,
            },
          },
          billTo: {
            firstName: params.firstName,
            lastName: params.lastName,
          },
        },
      },
    }

    const data = await postToAuthorizeNet(payload, currentConfig)
    const messages = data?.messages

    if (messages?.resultCode?.toLowerCase() === "ok" && data?.subscriptionId) {
      return {
        success: true,
        subscriptionId: String(data.subscriptionId),
        message: "Recurring subscription created successfully.",
        last4,
      }
    }

    const errDesc = messages?.message?.[0]?.text || "Failed to create recurring subscription."

    return {
      success: false,
      message: errDesc,
      last4,
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to create subscription.",
      last4,
    }
  }
}

/**
 * 3. Cancel ARB Recurring Subscription (ARBCancelSubscriptionRequest)
 */
export async function cancelRecurringSubscription(
  subscriptionId: string,
  config?: AuthorizeNetConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const currentConfig = config || getAuthorizeNetConfig()
    const payload = {
      ARBCancelSubscriptionRequest: {
        merchantAuthentication: {
          name: currentConfig.apiLoginId,
          transactionKey: currentConfig.transactionKey,
        },
        refId: `cancel_${Date.now()}`,
        subscriptionId,
      },
    }

    const data = await postToAuthorizeNet(payload, currentConfig)
    if (data?.messages?.resultCode?.toLowerCase() === "ok") {
      return { success: true, message: "Subscription cancelled successfully." }
    }
    return {
      success: false,
      message: data?.messages?.message?.[0]?.text || "Unable to cancel subscription.",
    }
  } catch (err: any) {
    return { success: false, message: err.message || "Gateway error during cancellation." }
  }
}

/**
 * 4. Refund a transaction (refundTransaction)
 */
export async function refundTransaction(
  params: {
    transactionId: string
    amount: number
    cardLast4?: string
  },
  config?: AuthorizeNetConfig
): Promise<{ success: boolean; refundTransactionId?: string; message: string }> {
  try {
    const currentConfig = config || getAuthorizeNetConfig()
    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: currentConfig.apiLoginId,
          transactionKey: currentConfig.transactionKey,
        },
        refId: `ref_${Date.now()}`,
        transactionRequest: {
          transactionType: "refundTransaction",
          amount: params.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: params.cardLast4 || "0027",
              expirationDate: "XXXX",
            },
          },
          refTransId: params.transactionId,
        },
      },
    }

    const data = await postToAuthorizeNet(payload, currentConfig)
    const txResponse = data?.transactionResponse

    if (txResponse?.responseCode === "1") {
      return {
        success: true,
        refundTransactionId: txResponse.transId,
        message: "Refund approved and completed.",
      }
    }

    return {
      success: false,
      message:
        txResponse?.errors?.[0]?.errorText ||
        data?.messages?.message?.[0]?.text ||
        "Refund declined by gateway.",
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to process refund with Authorize.Net.",
    }
  }
}

export type UpdatePaymentMethodParams = {
  subscriptionId: string
  cardNumber: string
  expirationDate: string // MMYY or MM/YY
  cvv: string
  zip?: string
  firstName?: string
  lastName?: string
}

/**
 * 5. Update ARB Recurring Subscription Payment Method (ARBUpdateSubscriptionRequest)
 * Real gateway update - never store sensitive card data in DB.
 */
export async function updateSubscriptionPaymentMethod(
  params: UpdatePaymentMethodParams,
  config?: AuthorizeNetConfig
): Promise<PaymentResult> {
  const cleanCard = params.cardNumber.replace(/\D/g, "")
  const cleanExp = params.expirationDate.replace(/\D/g, "")
  const last4 = cleanCard.slice(-4)

  try {
    const currentConfig = config || getAuthorizeNetConfig()
    const payload = {
      ARBUpdateSubscriptionRequest: {
        merchantAuthentication: {
          name: currentConfig.apiLoginId,
          transactionKey: currentConfig.transactionKey,
        },
        refId: `upd_${Date.now()}`,
        subscriptionId: params.subscriptionId,
        subscription: {
          payment: {
            creditCard: {
              cardNumber: cleanCard,
              expirationDate: cleanExp,
              cardCode: params.cvv,
            },
          },
          ...(params.zip || params.firstName || params.lastName
            ? {
                billTo: {
                  ...(params.firstName ? { firstName: params.firstName } : {}),
                  ...(params.lastName ? { lastName: params.lastName } : {}),
                  ...(params.zip ? { zip: params.zip } : {}),
                },
              }
            : {}),
        },
      },
    }

    const data = await postToAuthorizeNet(payload, currentConfig)
    const messages = data?.messages

    if (messages?.resultCode?.toLowerCase() === "ok") {
      return {
        success: true,
        subscriptionId: params.subscriptionId,
        message: "Payment method updated successfully in Authorize.Net.",
        last4,
      }
    }

    const errDesc =
      messages?.message?.[0]?.text || "Unable to update subscription payment method in Authorize.Net."
    return {
      success: false,
      message: errDesc,
      last4,
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to communicate with Authorize.Net to update payment method.",
      last4,
    }
  }
}

/**
 * 6. Verify Authorize.Net Webhook Signature
 * Authorize.Net sends HMAC-SHA512 of request body using merchant Signature Key in X-ANET-SIGNATURE header.
 */
export function verifyAuthorizeNetWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  overrideKey?: string
): boolean {
  try {
    const signatureKey = overrideKey || process.env.AUTHORIZENET_SIGNATURE_KEY
    if (!signatureKey) {
      console.warn("AUTHORIZENET_SIGNATURE_KEY is not configured in server environment.")
      return false
    }

    if (!signatureHeader) {
      return false
    }

    // Header typically starts with 'sha512=' or 'SHA512='
    const expectedHex = signatureHeader.replace(/^sha512=/i, "").trim().toLowerCase()

    const crypto = require("crypto")
    const hmac = crypto.createHmac("sha512", signatureKey)
    hmac.update(rawBody, "utf8")
    const computedHex = hmac.digest("hex").toLowerCase()

    if (computedHex.length !== expectedHex.length) {
      return false
    }

    return crypto.timingSafeEqual(Buffer.from(computedHex, "hex"), Buffer.from(expectedHex, "hex"))
  } catch (err) {
    console.error("Webhook signature verification error:", err)
    return false
  }
}
