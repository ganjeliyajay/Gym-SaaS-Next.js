import Link from "next/link"
import { notFound } from "next/navigation"

import {
  ArrowLeft,
  CreditCard,
  Receipt,
  User,
} from "lucide-react"

import {
  getAuthenticatedServerUser,
  supabaseAdmin,
} from "@/lib/auth/server"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function TransactionDetailsPage({
  params,
}: PageProps) {
  const { id } = await params

  const user =
    await getAuthenticatedServerUser()

  if (!user) {
    notFound()
  }

  const allowedRoles = [
    "admin",
    "manager",
    "super_admin",
  ]

  if (!allowedRoles.includes(user.role)) {
    notFound()
  }

  const gymId = user.gymId

  if (!gymId) {
    notFound()
  }

  // --------------------------------------------------
  // PAYMENT
  // --------------------------------------------------

  const {
    data: payment,
    error: paymentError,
  } =
    await supabaseAdmin
      .from("payments")
      .select(`
        id,
        gym_id,
        member_id,
        product_id,
        membership_id,
        amount,
        currency,
        payment_type,
        status,
        authorize_net_transaction_id,
        authorize_net_subscription_id,
        payment_method,
        refund_amount,
        refunded_at,
        created_at,
        paid_at,
        metadata,
        member:members(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        product:products(
          id,
          name
        )
      `)
      .eq("id", id)
      .eq("gym_id", gymId)
      .maybeSingle()

  if (paymentError) {
    console.error(
      "Transaction detail lookup failed:",
      paymentError,
    )

    notFound()
  }

  if (!payment) {
    notFound()
  }

  const member = Array.isArray(
    payment.member,
  )
    ? payment.member[0]
    : payment.member

  const product = Array.isArray(
    payment.product,
  )
    ? payment.product[0]
    : payment.product

  const amount = Number(
    payment.amount ?? 0,
  )

  const refundAmount = Number(
    payment.refund_amount ?? 0,
  )

  const remainingRefundable =
    Math.max(
      0,
      amount - refundAmount,
    )

  const currency =
    payment.currency || "USD"

  const formatMoney = (
    value: number,
  ) =>
    new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
      },
    ).format(value)

  const formatDate = (
    value: string | null,
  ) => {
    if (!value) {
      return "—"
    }

    const date = new Date(value)

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "—"
    }

    return date.toLocaleString(
      "en-US",
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    )
  }

  const statusClass =
    payment.status === "paid"
      ? "bg-green-50 text-green-700"
      : payment.status ===
          "refunded"
        ? "bg-purple-50 text-purple-700"
        : payment.status ===
              "failed" ||
            payment.status ===
              "declined"
          ? "bg-red-50 text-red-700"
          : "bg-yellow-50 text-yellow-700"

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* BACK */}

        <Link
          href="/billing/transactions"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>

        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Payment transaction
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Transaction Details
            </h1>

            <p className="mt-1 break-all text-xs text-gray-400">
              {payment.id}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${statusClass}`}
          >
            {payment.status}
          </span>
        </div>

        {/* SUMMARY */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <SummaryCard
            icon={Receipt}
            label="Payment Amount"
            value={formatMoney(
              amount,
            )}
          />

          <SummaryCard
            icon={CreditCard}
            label="Refunded"
            value={formatMoney(
              refundAmount,
            )}
          />

          <SummaryCard
            icon={User}
            label="Member"
            value={
              `${member?.first_name ?? ""} ${
                member?.last_name ?? ""
              }`.trim() ||
              "Unknown"
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* PAYMENT INFORMATION */}

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Payment Information
            </h2>

            <div className="mt-5 space-y-4">
              <Info
                label="Amount"
                value={formatMoney(
                  amount,
                )}
              />

              <Info
                label="Currency"
                value={currency}
              />

              <Info
                label="Payment Type"
                value={
                  payment.payment_type ||
                  "—"
                }
              />

              <Info
                label="Payment Method"
                value={
                  payment.payment_method ||
                  "—"
                }
              />

              <Info
                label="Status"
                value={
                  payment.status
                }
              />

              <Info
                label="Created"
                value={formatDate(
                  payment.created_at,
                )}
              />

              <Info
                label="Paid At"
                value={formatDate(
                  payment.paid_at,
                )}
              />

              <Info
                label="Refunded At"
                value={formatDate(
                  payment.refunded_at,
                )}
              />
            </div>
          </section>

          {/* MEMBER INFORMATION */}

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Member Information
            </h2>

            <div className="mt-5 space-y-4">
              <Info
                label="Name"
                value={
                  `${member?.first_name ?? ""} ${
                    member?.last_name ?? ""
                  }`.trim() ||
                  "—"
                }
              />

              <Info
                label="Email"
                value={
                  member?.email ||
                  "—"
                }
              />

              <Info
                label="Phone"
                value={
                  member?.phone ||
                  "—"
                }
              />

              <Info
                label="Product"
                value={
                  product?.name ||
                  "—"
                }
              />

              <Info
                label="Membership ID"
                value={
                  payment.membership_id ||
                  "—"
                }
              />
            </div>
          </section>

          {/* AUTHORIZE.NET */}

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Gateway Information
            </h2>

            <div className="mt-5 space-y-4">
              <Info
                label="Transaction ID"
                value={
                  payment.authorize_net_transaction_id ||
                  "—"
                }
              />

              <Info
                label="Subscription ID"
                value={
                  payment.authorize_net_subscription_id ||
                  "—"
                }
              />
            </div>
          </section>

          {/* REFUND */}

          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Refund
            </h2>

            <div className="mt-5 space-y-4">
              <Info
                label="Original Amount"
                value={formatMoney(
                  amount,
                )}
              />

              <Info
                label="Already Refunded"
                value={formatMoney(
                  refundAmount,
                )}
              />

              <Info
                label="Remaining Refundable"
                value={formatMoney(
                  remainingRefundable,
                )}
              />

              {payment.status ===
                "paid" &&
                remainingRefundable >
                  0 && (
                  <Link
                    href={`/billing/transactions/${payment.id}/refund`}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Process Refund
                  </Link>
                )}

              {payment.status ===
                "refunded" && (
                <div className="rounded-xl bg-purple-50 p-4 text-sm font-medium text-purple-700">
                  This payment has been
                  fully refunded.
                </div>
              )}

              {payment.status !==
                "paid" &&
                payment.status !==
                  "refunded" && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    Refund is available only
                    for successful paid
                    transactions.
                  </div>
                )}
            </div>
          </section>
        </div>

        {/* METADATA */}

        {payment.metadata &&
          typeof payment.metadata ===
            "object" && (
            <section className="mt-6 rounded-2xl border bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900">
                Payment Metadata
              </h2>

              <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs text-gray-700">
                {JSON.stringify(
                  payment.metadata,
                  null,
                  2,
                )}
              </pre>
            </section>
          )}
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gray-100 p-2.5">
          <Icon className="h-5 w-5 text-gray-600" />
        </div>

        <div>
          <p className="text-xs text-gray-500">
            {label}
          </p>

          <p className="mt-1 text-lg font-bold text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 pb-3 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>

      <span className="break-all text-sm font-medium text-gray-800">
        {value}
      </span>
    </div>
  )
}