"use client"

import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { supabase } from "@/lib/supabase"

type RevenuePoint = {
  month: string
  value: number
}

export default function RevenueOverview() {

  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([])
  const [currency, setCurrency] = useState("INR")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRevenue = async () => {
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setRevenueData([])
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.gym_id) {
          setRevenueData([])
          return
        }

        const { data: settings } = await supabase
          .from("gym_settings")
          .select("currency")
          .eq("gym_id", profile.gym_id)
          .maybeSingle()

        setCurrency(settings?.currency || "INR")

        const now = new Date()

        const startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 8,
          1
        )

        const { data: payments, error } = await supabase
          .from("payments")
          .select("amount, paid_at, status")
          .eq("gym_id", profile.gym_id)
          .eq("status", "paid")
          .gte("paid_at", startDate.toISOString())
          .lte("paid_at", now.toISOString())
          .order("paid_at", { ascending: true })

        if (error) {
          console.error("Revenue fetch error:", error)
          setRevenueData([])
          return
        }

        const months: RevenuePoint[] = []

        for (let i = 8; i >= 0; i--) {
          const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
          )

          const monthName = date.toLocaleString("en-US", {
            month: "short",
          })

          months.push({
            month: monthName,
            value: 0,
          })
        }

        payments?.forEach((payment) => {
          if (!payment.paid_at) return

          const paymentDate = new Date(payment.paid_at)

          const monthIndex =
            (paymentDate.getFullYear() - startDate.getFullYear()) * 12 +
            (paymentDate.getMonth() - startDate.getMonth())

          if (monthIndex >= 0 && monthIndex < months.length) {
            months[monthIndex].value += Number(payment.amount) || 0
          }
        })

        setRevenueData(months)
      } catch (error) {
        console.error("Revenue loading error:", error)
        setRevenueData([])
      } finally {
        setLoading(false)
      }
    }

    loadRevenue()
  }, [])

  const maxRevenue = Math.max(
    ...revenueData.map((item) => item.value),
    0
  )

  const chartMax = Math.max(maxRevenue, 5000)

  const formatRevenue = (value: number) => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value)
    } catch {
      return `${currency} ${Math.round(value)}`
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">Revenue Overview</h2>

          <p className="mt-1 text-xs text-slate-400">
            Track your gym revenue over time
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
        >
          Last 9 months
          <ChevronDown size={13} />
        </button>
      </div>

      <div className="mt-7 flex">
        {/* Y Axis */}
        <div className="flex h-[250px] flex-col justify-between pb-6 pr-3 text-[10px] text-slate-400">
          <span>{formatRevenue(chartMax)}</span>
          <span>{formatRevenue(chartMax * 0.75)}</span>
          <span>{formatRevenue(chartMax * 0.5)}</span>
          <span>{formatRevenue(chartMax * 0.25)}</span>
          <span>{formatRevenue(0)}</span>
        </div>

        {/* Chart */}
        <div className="relative flex h-[250px] flex-1 items-end justify-between gap-2 border-b border-slate-100">
          {/* Grid Lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <span className="border-t border-dashed border-slate-100" />
            <span className="border-t border-dashed border-slate-100" />
            <span className="border-t border-dashed border-slate-100" />
            <span className="border-t border-dashed border-slate-100" />
            <span />
          </div>

          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-xl bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm font-medium text-slate-700">
                  Loading revenue...
                </p>
              </div>
            </div>
          ) : revenueData.length === 0 ||
            revenueData.every((item) => item.value === 0) ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-xl bg-slate-50 px-5 py-4 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No revenue data
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Revenue will appear here once payments are recorded.
                </p>
              </div>
            </div>
          ) : (
            revenueData.map((item) => {
              const height =
                item.value > 0
                  ? Math.max((item.value / chartMax) * 100, 3)
                  : 0

              return (
                <div
                  key={item.month}
                  className="relative z-10 flex h-full flex-1 items-end justify-center"
                >
                  <div className="group relative flex h-full w-full items-end justify-center">
                    {item.value > 0 && (
                      <div
                        className="w-5 rounded-t-md bg-slate-900 transition-all group-hover:bg-slate-700"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${item.month}: ${formatRevenue(
                          item.value
                        )}`}
                      />
                    )}

                    <span className="absolute -bottom-5 text-[10px] text-slate-400">
                      {item.month}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}