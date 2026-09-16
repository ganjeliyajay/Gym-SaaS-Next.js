"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Transaction = {
  id: string
  amount: number | string | null
  currency: string | null
  status: string
  payment_type: string | null
  payment_method: string | null
  authorize_net_transaction_id?: string | null
  authorize_net_subscription_id?: string | null
  refund_amount?: number | string | null
  refunded_at?: string | null
  created_at: string
  paid_at: string | null
  member?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  product?: {
    name: string | null
  } | null
}

const money = (
  value: number,
  currency = "INR",
) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value)

const formatDate = (
  value: string | null,
) => {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const statusClasses = (
  status: string,
) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-green-50 text-green-700"

    case "failed":
    case "declined":
      return "bg-red-50 text-red-700"

    case "refunded":
      return "bg-purple-50 text-purple-700"

    case "pending":
      return "bg-yellow-50 text-yellow-700"

    default:
      return "bg-gray-100 text-gray-700"
  }
}

export default function TransactionsPage() {
  const toast = useToast()

  const [rows, setRows] = useState<
    Transaction[]
  >([])

  const [search, setSearch] =
    useState("")

  const [status, setStatus] =
    useState("All")

  const [method, setMethod] =
    useState("All")

  const [type, setType] =
    useState("All")

  const [selected, setSelected] =
    useState<Transaction | null>(null)

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const loadTransactions = async (
    showRefresh = false,
  ) => {
    if (showRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

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
      } = await supabase
        .from("profiles")
        .select(
          "id, gym_id, role",
        )
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile?.gym_id) {
        throw new Error(
          "Gym profile could not be loaded.",
        )
      }

      const {
        data,
        error: transactionError,
      } = await supabase
        .from("payments")
        .select(
          `
            id,
            amount,
            currency,
            status,
            payment_type,
            payment_method,
            authorize_net_transaction_id,
            authorize_net_subscription_id,
            refund_amount,
            refunded_at,
            created_at,
            paid_at,
            member:members(
              first_name,
              last_name,
              email
            ),
            product:products(
              name
            )
          `,
        )
        .eq(
          "gym_id",
          profile.gym_id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )

      if (transactionError) {
        throw transactionError
      }

      setRows(
        (data ?? []) as unknown as Transaction[],
      )
    } catch (error) {
      console.error(
        "Transactions load error:",
        error,
      )

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load transactions.",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const run = async () => {
      if (!mounted) return

      await loadTransactions()
    }

    run()

    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase()

    return rows.filter((row) => {
      const memberName =
        `${row.member?.first_name ?? ""} ${row.member?.last_name ?? ""
          }`.trim()

      const transactionId =
        row.id.toLowerCase()

      const gatewayId =
        (
          row.authorize_net_transaction_id ??
          ""
        ).toLowerCase()

      const email =
        (
          row.member?.email ??
          ""
        ).toLowerCase()

      const productName =
        (
          row.product?.name ??
          ""
        ).toLowerCase()

      const matchesSearch =
        !query ||
        transactionId.includes(query) ||
        gatewayId.includes(query) ||
        memberName
          .toLowerCase()
          .includes(query) ||
        email.includes(query) ||
        productName.includes(query)

      const matchesStatus =
        status === "All" ||
        row.status.toLowerCase() ===
        status.toLowerCase()

      const matchesMethod =
        method === "All" ||
        (
          row.payment_method ??
          ""
        )
          .toLowerCase()
          .includes(
            method.toLowerCase(),
          )

      const matchesType =
        type === "All" ||
        (
          row.payment_type ??
          ""
        ).toLowerCase() ===
        type.toLowerCase()

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMethod &&
        matchesType
      )
    })
  }, [
    rows,
    search,
    status,
    method,
    type,
  ])

  const revenue = rows
    .filter(
      (row) =>
        row.status === "paid",
    )
    .reduce(
      (sum, row) =>
        sum +
        Number(
          row.amount || 0,
        ),
      0,
    )

  const successful =
    rows.filter(
      (row) =>
        row.status === "paid",
    ).length

  const failed =
    rows.filter(
      (row) =>
        row.status === "failed" ||
        row.status === "declined",
    ).length

  const refunded =
    rows.reduce(
      (sum, row) =>
        sum +
        Number(
          row.refund_amount || 0,
        ),
      0,
    )

  const resetFilters = () => {
    setSearch("")
    setStatus("All")
    setMethod("All")
    setType("All")
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <Link
          href="/billing"
          className="mb-5 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              Finance
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              Transactions
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View payment transactions from
              your gym.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadTransactions(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing
                  ? "animate-spin"
                  : ""
                }`}
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Total Revenue"
            value={money(revenue)}
            icon={CircleDollarSign}
          />

          <Stat
            title="Successful"
            value={String(
              successful,
            )}
            icon={CheckCircle2}
          />

          <Stat
            title="Failed"
            value={String(
              failed,
            )}
            icon={XCircle}
          />

          <Stat
            title="Refunded"
            value={money(
              refunded,
            )}
            icon={RefreshCw}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border bg-white">

          <div className="flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search member, email or transaction..."
                className="input w-full pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-3">

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className="input"
              >
                <option value="All">
                  All Status
                </option>

                <option value="Paid">
                  Paid
                </option>

                <option value="Failed">
                  Failed
                </option>

                <option value="Declined">
                  Declined
                </option>

                <option value="Refunded">
                  Refunded
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>

              <select
                value={method}
                onChange={(event) =>
                  setMethod(
                    event.target.value,
                  )
                }
                className="input"
              >
                <option value="All">
                  All Methods
                </option>

                <option value="Visa">
                  Visa
                </option>

                <option value="Mastercard">
                  Mastercard
                </option>

                <option value="Credit Card">
                  Credit Card
                </option>
              </select>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value,
                  )
                }
                className="input"
              >
                <option value="All">
                  All Types
                </option>

                <option value="recurring">
                  Recurring
                </option>

                <option value="one-time">
                  One-time
                </option>
              </select>

              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="rounded-xl border px-4 text-sm font-semibold hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-gray-500">
              Loading transactions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <CircleDollarSign className="mx-auto h-10 w-10 text-gray-300" />

              <p className="mt-3 text-sm font-semibold text-gray-700">
                No transactions found
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or
                filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">

                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">
                      Transaction
                    </th>

                    <th className="px-6 py-3">
                      Member
                    </th>

                    <th className="px-6 py-3">
                      Description
                    </th>

                    <th className="px-6 py-3">
                      Amount
                    </th>

                    <th className="px-6 py-3">
                      Date
                    </th>

                    <th className="px-6 py-3">
                      Status
                    </th>

                    <th className="px-6 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(
                    (row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                      >
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {row.id.slice(
                              0,
                              8,
                            )}
                            …
                          </p>

                          {row.authorize_net_transaction_id && (
                            <p className="mt-1 text-xs text-gray-400">
                              ANET:{" "}
                              {row.authorize_net_transaction_id.slice(
                                0,
                                12,
                              )}
                              …
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {row.member
                              ?.first_name ||
                              ""}{" "}
                            {row.member
                              ?.last_name ||
                              ""}
                          </p>

                          <p className="text-xs text-gray-500">
                            {row.member
                              ?.email ||
                              "No email"}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {row.product
                            ?.name ||
                            row.payment_type ||
                            "Payment"}
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {money(
                              Number(
                                row.amount ||
                                0,
                              ),
                              row.currency ||
                              "INR",
                            )}
                          </p>

                          {Number(
                            row.refund_amount ||
                            0,
                          ) > 0 && (
                              <p className="mt-1 text-xs text-purple-600">
                                Refunded:{" "}
                                {money(
                                  Number(
                                    row.refund_amount ||
                                    0,
                                  ),
                                  row.currency ||
                                  "INR",
                                )}
                              </p>
                            )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(
                            row.paid_at ||
                            row.created_at,
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(
                              row.status,
                            )}`}
                          >
                            {row.status.replaceAll(
                              "_",
                              " ",
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected(
                                row,
                              )
                            }
                            className="rounded-lg p-2 hover:bg-gray-100"
                            title="View transaction"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {!loading && (
          <p className="mt-4 text-xs text-gray-500">
            Showing{" "}
            {filtered.length} of{" "}
            {rows.length} transactions
          </p>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelected(null)
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Payment
                </p>

                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  Transaction details
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">

              <Detail
                label="Transaction ID"
                value={selected.id}
              />

              <Detail
                label="Member"
                value={`${selected.member?.first_name ?? ""} ${selected.member?.last_name ?? ""
                  }`.trim() || "—"}
              />

              <Detail
                label="Email"
                value={
                  selected.member
                    ?.email ||
                  "—"
                }
              />

              <Detail
                label="Product"
                value={
                  selected.product
                    ?.name ||
                  "—"
                }
              />

              <Detail
                label="Amount"
                value={money(
                  Number(
                    selected.amount ||
                    0,
                  ),
                  selected.currency ||
                  "INR",
                )}
              />

              <Detail
                label="Payment type"
                value={
                  selected.payment_type ||
                  "—"
                }
              />

              <Detail
                label="Payment method"
                value={
                  selected.payment_method ||
                  "—"
                }
              />

              <Detail
                label="Status"
                value={
                  selected.status
                    .replaceAll(
                      "_",
                      " ",
                    )
                    .replace(
                      /^\w/,
                      (char) =>
                        char.toUpperCase(),
                    )
                }
              />

              <Detail
                label="Paid at"
                value={formatDate(
                  selected.paid_at,
                )}
              />

              <Detail
                label="Created at"
                value={formatDate(
                  selected.created_at,
                )}
              />

              {Number(
                selected.refund_amount ||
                0,
              ) > 0 && (
                  <Detail
                    label="Refunded amount"
                    value={money(
                      Number(
                        selected.refund_amount ||
                        0,
                      ),
                      selected.currency ||
                      "INR",
                    )}
                  />
                )}

              {selected.refunded_at && (
                <Detail
                  label="Refunded at"
                  value={formatDate(
                    selected.refunded_at,
                  )}
                />
              )}

              {selected.authorize_net_transaction_id && (
                <Detail
                  label="Authorize.Net transaction"
                  value={
                    selected.authorize_net_transaction_id
                  }
                />
              )}

              {selected.authorize_net_subscription_id && (
                <Detail
                  label="Authorize.Net subscription"
                  value={
                    selected.authorize_net_subscription_id
                  }
                />
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setSelected(null)
              }
              className="mt-6 w-full rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({
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

function Stat({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {title}
        </p>

        <Icon className="h-5 w-5 text-gray-500" />
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  )
}
