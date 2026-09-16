"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CircleDollarSign,
  Eye,
  Plus,
  Search,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type Row = {
  id: string
  member_id: string | null
  product_id: string | null
  amount: number | string | null
  currency: string | null
  status: string
  payment_method: string | null
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

const money = (n: number, c = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 0,
  }).format(n)

const date = (v: string) =>
  new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

export default function InvoicesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Row | null>(null)

  useEffect(() => {
    let active = true

    const loadInvoices = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("You must be logged in.")
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.gym_id) {
          throw new Error("Gym profile could not be loaded.")
        }

        const { data, error: invoicesError } = await supabase
          .from("payments")
          .select(
            `
              id,
              member_id,
              product_id,
              amount,
              currency,
              status,
              payment_method,
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
            `
          )
          .eq("gym_id", profile.gym_id)
          .order("created_at", { ascending: false })

        if (invoicesError) {
          throw invoicesError
        }

        if (active) {
          setRows((data ?? []) as unknown as Row[])
        }
      } catch (err) {
        if (active) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Unable to load invoices."
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadInvoices()

    return () => {
      active = false
    }
  }, [toast])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const query = search.toLowerCase()

      const name =
        `${row.member?.first_name ?? ""} ${
          row.member?.last_name ?? ""
        }`.toLowerCase()

      const matchesStatus =
        status === "All" ||
        (status === "Paid" && row.status === "paid") ||
        (status === "Pending" && row.status === "pending") ||
        (status === "Overdue" && row.status === "failed")

      const matchesSearch =
        row.id.toLowerCase().includes(query) ||
        name.includes(query) ||
        (row.member?.email ?? "").toLowerCase().includes(query)

      return matchesSearch && matchesStatus
    })
  }, [rows, search, status])

  const total = rows.reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  )

  const paid = rows
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const pending = rows
    .filter((row) => row.status === "pending")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const overdue = rows
    .filter((row) => row.status === "failed")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0)

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <Link
          href="/billing"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              Finance
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              Invoices
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Payment records presented as invoices for your gym.
            </p>
          </div>

          <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Create Invoice
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            title="Total Invoiced"
            value={money(total)}
            icon={CircleDollarSign}
          />

          <Stat
            title="Paid"
            value={money(paid)}
            icon={CheckCircle2}
          />

          <Stat
            title="Pending"
            value={money(pending)}
            icon={Clock3}
          />

          <Stat
            title="Overdue / Failed"
            value={money(overdue)}
            icon={XCircle}
          />
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">

          <div className="flex flex-col gap-4 border-b p-5 sm:p-6 lg:flex-row lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or member..."
                className="input pl-10"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input sm:w-40"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Pending</option>
              <option>Overdue</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-gray-500">
              Loading invoices...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-sm text-gray-500">
              No invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-3">Invoice</th>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 last:border-0"
                    >

                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        INV-{row.id.slice(0, 8)}
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium">
                          {row.member?.first_name}{" "}
                          {row.member?.last_name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {row.member?.email}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row.product?.name ?? "Payment"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold">
                        {money(
                          Number(row.amount || 0),
                          row.currency || "INR"
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {date(row.paid_at || row.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold capitalize">
                          {row.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelected(row)}
                          className="rounded-lg p-2 hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">

            <div className="flex justify-between">
              <h2 className="text-lg font-bold">
                Invoice INV-{selected.id.slice(0, 8)}
              </h2>

              <button onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-2 text-sm text-gray-600">
              <p>
                Member:{" "}
                <b>
                  {selected.member?.first_name}{" "}
                  {selected.member?.last_name}
                </b>
              </p>

              <p>
                Product:{" "}
                <b>{selected.product?.name ?? "Payment"}</b>
              </p>

              <p>
                Amount:{" "}
                <b>
                  {money(
                    Number(selected.amount || 0),
                    selected.currency || "INR"
                  )}
                </b>
              </p>

              <p>
                Status:{" "}
                <b className="capitalize">
                  {selected.status}
                </b>
              </p>

              <p>
                Payment method:{" "}
                <b>
                  {selected.payment_method ?? "Not recorded"}
                </b>
              </p>
            </div>
          </div>
        </div>
      )}
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
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">
          {title}
        </p>

        <Icon className="h-5 w-5 text-gray-500" />
      </div>

      <p className="mt-3 text-2xl font-bold">
        {value}
      </p>
    </div>
  )
}
