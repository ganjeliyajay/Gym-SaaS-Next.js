"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react"

import { supabase } from "@/lib/supabase"

type Payment = {
  id: string
  amount: number | string | null
  currency: string | null
  status: string
  payment_method: string | null
  refund_amount: number | string | null
  member?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  product?: {
    name: string | null
  } | null
}

export default function RefundPage() {
  const router = useRouter()
  const params = useParams()

  const paymentId = String(
    params?.id ?? "",
  )

  const [payment, setPayment] =
    useState<Payment | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [processing, setProcessing] =
    useState(false)

  const [refundType, setRefundType] =
    useState<"full" | "partial">(
      "full",
    )

  const [partialAmount, setPartialAmount] =
    useState("")

  const [reason, setReason] =
    useState("")

  const [error, setError] =
    useState("")

  const [success, setSuccess] =
    useState("")

  // ==================================================
  // LOAD PAYMENT
  // ==================================================

  useEffect(() => {
    const loadPayment = async () => {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          throw new Error(
            "You must be logged in.",
          )
        }

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, gym_id, role",
            )
            .eq(
              "id",
              user.id,
            )
            .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile?.gym_id) {
          throw new Error(
            "Gym profile not found.",
          )
        }

        const {
          data,
          error: paymentError,
        } =
          await supabase
            .from("payments")
            .select(`
              id,
              amount,
              currency,
              status,
              payment_method,
              refund_amount,
              member:members(
                first_name,
                last_name,
                email
              ),
              product:products(
                name
              )
            `)
            .eq(
              "id",
              paymentId,
            )
            .eq(
              "gym_id",
              profile.gym_id,
            )
            .maybeSingle()

        if (paymentError) {
          throw paymentError
        }

        if (!data) {
          throw new Error(
            "Payment not found.",
          )
        }

        const normalized =
          data as unknown as Payment

        setPayment(
          normalized,
        )

        const originalAmount =
          Number(
            normalized.amount ??
              0,
          )

        const refundedAmount =
          Number(
            normalized.refund_amount ??
              0,
          )

        const remaining =
          Math.max(
            0,
            originalAmount -
              refundedAmount,
          )

        setPartialAmount(
          remaining.toFixed(2),
        )
      } catch (err) {
        console.error(
          "Refund payment load error:",
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load payment.",
        )
      } finally {
        setLoading(false)
      }
    }

    if (paymentId) {
      loadPayment()
    }
  }, [paymentId])

  // ==================================================
  // CALCULATIONS
  // ==================================================

  const originalAmount =
    Number(
      payment?.amount ?? 0,
    )

  const alreadyRefunded =
    Number(
      payment?.refund_amount ??
        0,
    )

  const remainingRefundable =
    Math.max(
      0,
      originalAmount -
        alreadyRefunded,
    )

  const currency =
    payment?.currency ||
    "USD"

  const formatMoney = (
    amount: number,
  ) =>
    new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
      },
    ).format(amount)

  const refundAmount =
    refundType === "full"
      ? remainingRefundable
      : Number(
          partialAmount || 0,
        )

  // ==================================================
  // SUBMIT REFUND
  // ==================================================

  const handleRefund = async () => {
    if (!payment) {
      return
    }

    setError("")
    setSuccess("")

    // ----------------------------------------------
    // VALIDATE AMOUNT
    // ----------------------------------------------

    if (
      !Number.isFinite(
        refundAmount,
      ) ||
      refundAmount <= 0
    ) {
      setError(
        "Enter a valid refund amount.",
      )
      return
    }

    if (
      refundAmount >
      remainingRefundable
    ) {
      setError(
        `Maximum refundable amount is ${formatMoney(
          remainingRefundable,
        )}.`,
      )
      return
    }

    // ----------------------------------------------
    // CONFIRM
    // ----------------------------------------------

    const confirmed =
      window.confirm(
        `Are you sure you want to refund ${formatMoney(
          refundAmount,
        )}?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setProcessing(true)

      const response =
        await fetch(
          "/api/billing/refund",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              paymentId:
                payment.id,
              amount:
                refundAmount,
              reason:
                reason.trim() ||
                "Staff issued refund",
            }),
          },
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Refund failed.",
        )
      }

      setSuccess(
        result?.message ||
          "Refund processed successfully.",
      )

      // Give the database/UI a moment
      // before navigating back.
      setTimeout(() => {
        router.push(
          `/billing/transactions/${payment.id}`,
        )

        router.refresh()
      }, 1000)
    } catch (err) {
      console.error(
        "Refund processing error:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to process refund.",
      )
    } finally {
      setProcessing(false)
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-2xl border bg-white p-8 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-gray-500" />

            <p className="mt-3 text-sm text-gray-500">
              Loading payment...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ==================================================
  // ERROR / NOT FOUND
  // ==================================================

  if (!payment) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-2xl border bg-white p-8">
            <p className="font-semibold text-red-600">
              {error ||
                "Payment not found."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ==================================================
  // INVALID REFUND STATE
  // ==================================================

  if (
    payment.status !==
      "paid" ||
    remainingRefundable <= 0
  ) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-3xl px-4 py-10">

          <button
            type="button"
            onClick={() =>
              router.push(
                `/billing/transactions/${payment.id}`,
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Transaction
          </button>

          <div className="rounded-2xl border bg-white p-8 text-center">
            <RefreshCcw className="mx-auto h-10 w-10 text-gray-300" />

            <h1 className="mt-4 text-xl font-bold text-gray-900">
              Refund unavailable
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              This payment does not have any
              refundable amount remaining.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ==================================================
  // MAIN
  // ==================================================

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

        {/* BACK */}

        <button
          type="button"
          onClick={() =>
            router.push(
              `/billing/transactions/${payment.id}`,
            )
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transaction
        </button>

        {/* HEADER */}

        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Payment Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Process Refund
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Refund a successful payment back to
            the original card.
          </p>
        </div>

        {/* PAYMENT SUMMARY */}

        <section className="rounded-2xl border bg-white p-6">

          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-gray-100 p-3">
              <CreditCard className="h-6 w-6 text-gray-600" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {payment.member?.first_name ||
                  ""}{" "}
                {payment.member?.last_name ||
                  ""}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {payment.member?.email ||
                  "No email"}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                {payment.product?.name ||
                  "Payment"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatMoney(
                  originalAmount,
                )}
              </p>

              <p className="mt-1 text-xs capitalize text-gray-500">
                {payment.status}
              </p>
            </div>
          </div>

          {/* AMOUNTS */}

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AmountBox
              label="Original"
              value={formatMoney(
                originalAmount,
              )}
            />

            <AmountBox
              label="Already Refunded"
              value={formatMoney(
                alreadyRefunded,
              )}
            />

            <AmountBox
              label="Refundable"
              value={formatMoney(
                remainingRefundable,
              )}
            />
          </div>
        </section>

        {/* REFUND FORM */}

        <section className="mt-6 rounded-2xl border bg-white p-6">

          <h2 className="text-lg font-bold text-gray-900">
            Refund Amount
          </h2>

          {/* TYPE */}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

            <button
              type="button"
              onClick={() =>
                setRefundType(
                  "full",
                )
              }
              className={`rounded-xl border p-4 text-left transition ${
                refundType ===
                "full"
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">
                Full Refund
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Refund the entire remaining
                refundable amount.
              </p>

              <p className="mt-3 text-base font-bold text-gray-900">
                {formatMoney(
                  remainingRefundable,
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setRefundType(
                  "partial",
                )
              }
              className={`rounded-xl border p-4 text-left transition ${
                refundType ===
                "partial"
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">
                Partial Refund
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Refund only a specific amount.
              </p>

              <p className="mt-3 text-base font-bold text-gray-900">
                Up to{" "}
                {formatMoney(
                  remainingRefundable,
                )}
              </p>
            </button>
          </div>

          {/* PARTIAL AMOUNT */}

          {refundType ===
            "partial" && (
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Refund Amount
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  $
                </span>

                <input
                  type="number"
                  min="0.01"
                  max={
                    remainingRefundable
                  }
                  step="0.01"
                  value={
                    partialAmount
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartialAmount(
                      event.target
                        .value,
                    )
                  }
                  className="input w-full pl-8"
                  placeholder="0.00"
                />
              </div>

              <p className="mt-1 text-xs text-gray-400">
                Maximum:{" "}
                {formatMoney(
                  remainingRefundable,
                )}
              </p>
            </div>
          )}

          {/* REASON */}

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Refund Reason
              <span className="ml-1 font-normal text-gray-400">
                (optional)
              </span>
            </label>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              rows={4}
              maxLength={500}
              placeholder="Enter the reason for this refund..."
              className="input w-full resize-none"
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {reason.length}/500
            </p>
          </div>

          {/* SECURITY */}

          <div className="mt-5 flex gap-3 rounded-xl bg-gray-50 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />

            <div>
              <p className="text-sm font-semibold text-gray-700">
                Secure refund
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                The refund will be processed through
                the original payment gateway. Your
                card details are never stored or sent
                from this page.
              </p>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {success}
            </div>
          )}

          {/* ACTION */}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              disabled={
                processing
              }
              onClick={() =>
                router.push(
                  `/billing/transactions/${payment.id}`,
                )
              }
              className="rounded-xl border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                processing ||
                refundAmount <= 0
              }
              onClick={
                handleRefund
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Refund{" "}
                  {formatMoney(
                    refundAmount,
                  )}
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function AmountBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-900">
        {value}
      </p>
    </div>
  )
}