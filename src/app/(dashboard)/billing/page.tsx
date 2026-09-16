"use client"

import { useEffect, useMemo, useState, type ElementType } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowUpRight,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Search,
  Settings,
  TrendingUp,
  XCircle,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Payment = {
  id: string
  member_id: string | null
  product_id: string | null
  amount: number | string | null
  currency: string | null
  payment_type: string | null
  status: string
  payment_method: string | null
  paid_at: string | null
  created_at: string
  member?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  product?: {
    name: string | null
  } | null
}

const money = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "—"

export default function BillingPage() {
  const toast = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState("This month")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          throw new Error("You must be logged in.")
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        if (!profile?.gym_id) {
          throw new Error("Gym profile could not be loaded.")
        }

        const {
          data,
          error: paymentsError,
        } = await supabase
          .from("payments")
          .select(
            `
              id,
              member_id,
              product_id,
              amount,
              currency,
              payment_type,
              status,
              payment_method,
              paid_at,
              created_at,
              member:members(
                first_name,
                last_name,
                email
              ),
              product:products(
                name
              )
            `
          )
          .eq("gym_id", profile.gym_id)
          .order("created_at", {
            ascending: false,
          })

        if (paymentsError) {
          throw paymentsError
        }

        if (active) {
          setPayments((data ?? []) as unknown as Payment[])
        }
      } catch (error) {
        console.error("Billing load error:", error)

        if (active) {
          setPayments([])
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load billing."
          )
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load billing."
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [toast])

  const periodStart = useMemo(() => {
    const now = new Date()

    if (period === "This month") {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      )
    }

    if (period === "Last 6 months") {
      return new Date(
        now.getFullYear(),
        now.getMonth() - 5,
        1
      )
    }

    return new Date(now.getFullYear(), 0, 1)
  }, [period])

  const periodPayments = payments.filter(
    (payment) =>
      new Date(payment.paid_at || payment.created_at) >=
      periodStart
  )

  const paid = periodPayments.filter(
    (payment) => payment.status === "paid"
  )

  const failed = periodPayments.filter(
    (payment) => payment.status === "failed"
  )

  const revenue = paid.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0
  )

  const currencyCounts = paid.reduce(
    (counts, payment) => {
      const currency = payment.currency || "INR"
      counts[currency] = (counts[currency] || 0) + 1
      return counts
    },
    {} as Record<string, number>
  )

  const displayCurrency =
    Object.entries(currencyCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "INR"

  const avg = paid.length
    ? revenue / paid.length
    : 0

  const filtered = payments.filter((payment) => {
    const query = search.trim().toLowerCase()

    const name =
      `${payment.member?.first_name ?? ""} ${payment.member?.last_name ?? ""
        }`.toLowerCase()

    const email = (
      payment.member?.email ?? ""
    ).toLowerCase()

    return (
      !query ||
      name.includes(query) ||
      email.includes(query) ||
      payment.id.toLowerCase().includes(query)
    )
  })

  const months = Array.from(
    { length: 6 },
    (_, i) => {
      const d = new Date()

      d.setMonth(
        d.getMonth() - (5 - i)
      )

      d.setDate(1)

      const value = payments
        .filter((payment) => {
          const paymentDate = new Date(
            payment.paid_at || payment.created_at
          )

          return (
            payment.status === "paid" &&
            paymentDate.getMonth() === d.getMonth() &&
            paymentDate.getFullYear() ===
            d.getFullYear()
          )
        })
        .reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        )

      return {
        label: d.toLocaleDateString(
          "en-IN",
          {
            month: "short",
          }
        ),
        value,
      }
    }
  )

  const max = Math.max(
    ...months.map((month) => month.value),
    1
  )

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              Finance
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Payments & Billing
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Track revenue, payments, invoices and your gym billing.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/billing/invoices"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
            >
              <FileText className="h-4 w-4" />
              Invoices
            </Link>

            <Link
              href="/billing/settings"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white"
            >
              <Settings className="h-4 w-4" />
              Billing Settings
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={money(revenue, displayCurrency)}
            icon={CircleDollarSign}
          />

          <StatCard
            title="Successful Payments"
            value={paid.length.toLocaleString()}
            icon={CheckCircle2}
          />

          <StatCard
            title="Failed Payments"
            value={failed.length.toLocaleString()}
            icon={XCircle}
          />

          <StatCard
            title="Avg. Transaction"
            value={money(avg, displayCurrency)}
            icon={TrendingUp}
          />
        </div>

        {/* Revenue + Payment Methods */}
        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">

          {/* Revenue Overview */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Revenue Overview
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Monthly payment revenue performance.
                </p>
              </div>

              <select
                value={period}
                onChange={(e) =>
                  setPeriod(e.target.value)
                }
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700"
              >
                <option>This month</option>
                <option>Last 6 months</option>
                <option>This year</option>
              </select>
            </div>

            <div className="p-5 sm:p-6">
              <div className="relative h-64">

                {/* Grid */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[100, 75, 50, 25, 0].map(
                    (value) => (
                      <div
                        key={value}
                        className="flex items-center gap-3"
                      >
                        <span className="w-10 text-right text-[10px] text-gray-400">
                          {value}%
                        </span>

                        <div className="h-px flex-1 bg-gray-100" />
                      </div>
                    )
                  )}
                </div>

                {/* Bars */}
                <div className="absolute bottom-0 left-12 right-0 top-0 flex items-end justify-around gap-3 pb-7 pt-2">
                  {months.map((month) => (
                    <div
                      key={month.label}
                      className="flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className="w-full max-w-12 rounded-t-lg bg-gray-900"
                        style={{
                          height: `${(month.value / max) * 90 + 5
                            }%`,
                        }}
                      />

                      <span className="mt-3 text-[10px] font-medium text-gray-400">
                        {month.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Period */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs text-gray-400">
                    Current period
                  </p>

                  <p className="mt-1 text-sm font-bold text-gray-900">
                    {money(revenue, displayCurrency)}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Live data
                </div>
              </div>
            </div>
          </section>

          {/* Payment Methods */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5">
              <h2 className="text-base font-semibold text-gray-900">
                Payment Methods
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Methods recorded on member payments.
              </p>
            </div>

            <div className="space-y-3 p-5">
              {Array.from(
                new Set(
                  payments
                    .map(
                      (payment) =>
                        payment.payment_method
                    )
                    .filter(Boolean)
                )
              )
                .slice(0, 4)
                .map((method) => (
                  <div
                    key={method}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-4"
                  >
                    <CreditCard className="h-5 w-5 text-gray-600" />

                    <span className="text-sm font-semibold text-gray-900">
                      {method}
                    </span>
                  </div>
                ))}

              {!payments.some(
                (payment) => payment.payment_method
              ) && (
                  <p className="text-sm text-gray-500">
                    No payment methods recorded yet.
                  </p>
                )}
            </div>
          </section>
        </div>

        {/* Recent Transactions */}
        <section className="rounded-2xl border border-gray-200 bg-white">

          {/* Section Header */}
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Recent Transactions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Latest payments made by your members.
              </p>
            </div>

            <Link
              href="/billing/transactions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Search */}
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search member or transaction..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-sm text-gray-500">
              Loading payments...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-gray-500">
              No payments found in the database for this gym.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Transaction
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Member
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.slice(0, 8).map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {/* Transaction */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {payment.id.slice(0, 8)}…
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {payment.payment_method ||
                            payment.payment_type ||
                            "Payment"}
                        </p>
                      </td>

                      {/* Member */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.member?.first_name}{" "}
                          {payment.member?.last_name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {payment.member?.email || "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {payment.product?.name || "Membership / Payment"}
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {money(
                          Number(payment.amount || 0),
                          payment.currency || "INR"
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(
                          payment.paid_at ||
                          payment.created_at
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${payment.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : payment.status === "failed"
                                ? "bg-red-50 text-red-700"
                                : payment.status === "pending"
                                  ? "bg-amber-50 text-amber-700"
                                  : payment.status === "refunded"
                                    ? "bg-purple-50 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {payment.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: ElementType
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {title}
        </p>

        <Icon className="h-5 w-5 text-gray-500" />
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        From Supabase payments
      </p>
    </div>
  )
}