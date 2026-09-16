"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertOctagon,
  RotateCcw,
  Building2,
  ChevronRight,
  PieChart,
  Calendar,
  Loader2,
  Receipt,
  ArrowUpRight,
  Repeat,
  ShieldAlert,
  Clock,
} from "lucide-react"

type DateRangeOption = "7d" | "30d" | "90d" | "1y" | "all"

export default function SuperAdminFinancialAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d")
  const [payments, setPayments] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [activeMemberships, setActiveMemberships] = useState<any[]>([])
  const [chargebacks, setChargebacks] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: paymentRows },
        { data: gymRows },
        { data: productRows },
        { data: membershipRows },
        { data: chargebackRows },
      ] = await Promise.all([
        supabase.from("payments").select(`
          id,
          gym_id,
          member_id,
          product_id,
          amount,
          amount_due,
          amount_paid,
          outstanding_amount,
          due_at,
          currency,
          payment_type,
          status,
          paid_at,
          failed_at,
          refunded_at,
          refund_amount,
          created_at,
          products(id, name, billing_interval)
        `),
        supabase.from("gyms").select("id, name"),
        supabase.from("products").select("id, name, price"),
        supabase.from("member_memberships").select(`
          id,
          gym_id,
          member_id,
          price_paid,
          status,
          product:products(id, name, billing_interval)
        `).eq("status", "active"),
        supabase.from("chargebacks").select("*"),
      ])

      setPayments(paymentRows || [])
      setGyms(gymRows || [])
      setProducts(productRows || [])
      setActiveMemberships(membershipRows || [])
      setChargebacks(chargebackRows || [])
    } catch (err) {
      console.error("Failed to load financial analytics data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const analytics = useMemo(() => {
    const now = new Date()
    let startDate = new Date(0)

    if (dateRange === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (dateRange === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else if (dateRange === "90d") startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    else if (dateRange === "1y") startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    // 1. Authoritative MRR & ARR from active recurring subscriptions (Req 20, 21)
    let mrr = 0
    activeMemberships.forEach((m) => {
      const price = Number(m.price_paid || 0)
      const interval = (m.product?.billing_interval || "month").toLowerCase()

      if (interval === "year" || interval === "annual" || interval === "yearly") {
        mrr += price / 12
      } else if (interval === "week" || interval === "weekly") {
        mrr += (price * 52) / 12
      } else {
        // default monthly
        mrr += price
      }
    })

    const arr = mrr * 12

    // 2. Lifetime calculations & LTV (Gross - Refunds / unique members) (Req 29)
    const paidPayments = payments.filter((p) => p.status === "paid")
    const grossLifetimeRevenue = paidPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const lifetimeRefunds = payments.reduce(
      (acc, p) => acc + (Number(p.refund_amount) || (p.status === "refunded" ? Number(p.amount) : 0)),
      0
    )
    const netLifetimeRevenue = Math.max(0, grossLifetimeRevenue - lifetimeRefunds)
    const uniquePaidMembers = new Set(paidPayments.map((p) => p.member_id).filter(Boolean)).size
    const ltv = uniquePaidMembers > 0 ? netLifetimeRevenue / uniquePaidMembers : 0

    // 3. Range payments
    const rangePayments = payments.filter((p) => {
      const d = new Date(p.paid_at || p.created_at)
      return d >= startDate && d <= now
    })

    const rangePaid = rangePayments.filter((p) => p.status === "paid")
    const rangeRevenue = rangePaid.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

    // Recurring vs One-time breakdown
    const rangeRecurring = rangePaid.filter((p) => p.payment_type === "recurring")
    const rangeRecurringRevenue = rangeRecurring.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
    const rangeOneTimeRevenue = rangeRevenue - rangeRecurringRevenue

    const rangeMembersCount = new Set(rangePaid.map((p) => p.member_id).filter(Boolean)).size
    const arpu = rangeMembersCount > 0 ? rangeRevenue / rangeMembersCount : 0

    // 4. Failed Payment Rate (Req 25)
    const failedPayments = rangePayments.filter((p) => p.status === "failed" || p.status === "declined")
    const failedCount = failedPayments.length
    const totalPaymentAttempts = rangePaid.length + failedCount
    const failedPaymentRate =
      totalPaymentAttempts > 0
        ? `${((failedCount / totalPaymentAttempts) * 100).toFixed(1)}%`
        : "N/A"

    // 5. Refunds in Range
    const refundedPayments = rangePayments.filter(
      (p) => p.status === "refunded" || (p.refund_amount && Number(p.refund_amount) > 0)
    )
    const refundedCount = refundedPayments.length
    const totalRefundAmount = refundedPayments.reduce(
      (acc, p) => acc + (Number(p.refund_amount) || Number(p.amount) || 0),
      0
    )

    // 6. Outstanding & Overdue Payments (Req 26)
    const pendingPayments = rangePayments.filter((p) => p.status === "pending")
    const overduePayments = rangePayments.filter(
      (p) =>
        p.status === "overdue" ||
        (p.due_at && new Date(p.due_at) < now && p.status !== "paid" && p.status !== "refunded")
    )
    const outstandingAmount = rangePayments.reduce((acc, p) => {
      if (p.outstanding_amount && Number(p.outstanding_amount) > 0) {
        return acc + Number(p.outstanding_amount)
      }
      if (p.status === "pending" || p.status === "failed" || p.status === "overdue") {
        return acc + (Number(p.amount) || 0)
      }
      return acc
    }, 0)

    // 7. Chargebacks (Req 27)
    const rangeChargebacks = chargebacks.filter((c) => {
      const d = new Date(c.dispute_date || c.created_at)
      return d >= startDate && d <= now
    })
    const chargebackPayments = rangePayments.filter((p) => p.status === "chargeback")
    const totalChargebackCount = rangeChargebacks.length + chargebackPayments.length
    const totalChargebackAmount =
      rangeChargebacks.reduce((acc, c) => acc + (Number(c.amount) || 0), 0) +
      chargebackPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

    // 8. Tenant breakdown
    const gymMap = new Map(gyms.map((g) => [g.id, g.name]))
    const tenantMap = new Map<string, { revenue: number; txCount: number; refunds: number }>()

    payments.forEach((p) => {
      const cur = tenantMap.get(p.gym_id) || { revenue: 0, txCount: 0, refunds: 0 }
      if (p.status === "paid") {
        cur.revenue += Number(p.amount) || 0
        cur.txCount++
      }
      if (p.status === "refunded") {
        cur.refunds += Number(p.refund_amount) || Number(p.amount) || 0
      }
      tenantMap.set(p.gym_id, cur)
    })

    const tenantBreakdown = Array.from(tenantMap.entries())
      .map(([gymId, val]) => ({
        gymId,
        gymName: gymMap.get(gymId) || "Unnamed Gym",
        revenue: val.revenue,
        txCount: val.txCount,
        refunds: val.refunds,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return {
      grossLifetimeRevenue,
      netLifetimeRevenue,
      ltv,
      uniquePaidMembers,
      activeSubscriptionsCount: activeMemberships.length,
      rangeRevenue,
      rangeRecurringRevenue,
      rangeOneTimeRevenue,
      mrr,
      arr,
      arpu,
      failedCount,
      failedPaymentRate,
      refundedCount,
      totalRefundAmount,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      outstandingAmount,
      totalChargebackCount,
      totalChargebackAmount,
      tenantBreakdown,
    }
  }, [payments, gyms, activeMemberships, chargebacks, dateRange])

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0)
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-600">
              <span>Super Admin</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Cross-Platform Financial Performance</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Financial Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Platform-wide MRR, ARR, Lifetime Value, Authorize.Net transactions, and tenant revenue.
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
            {(["7d", "30d", "90d", "1y", "all"] as DateRangeOption[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setDateRange(opt)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  dateRange === opt ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {opt === "7d"
                  ? "7 Days"
                  : opt === "30d"
                    ? "30 Days"
                    : opt === "90d"
                      ? "90 Days"
                      : opt === "1y"
                        ? "1 Year"
                        : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recurring & Lifetime Metrics */}
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                Subscription & Recurring Revenue (Active Subscriptions)
              </h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  title="Monthly Recurring Revenue (MRR)"
                  value={formatMoney(analytics.mrr)}
                  badge={`${analytics.activeSubscriptionsCount} active`}
                  subtitle="From active recurring subscriptions"
                  icon={<Repeat className="h-5 w-5 text-indigo-600" />}
                />
                <MetricCard
                  title="Annualized Run Rate (ARR)"
                  value={formatMoney(analytics.arr)}
                  subtitle="MRR × 12 annualized"
                  icon={<ArrowUpRight className="h-5 w-5 text-emerald-600" />}
                />
                <MetricCard
                  title="Average Member LTV"
                  value={formatMoney(analytics.ltv)}
                  badge="Net Revenue"
                  subtitle={`Across ${analytics.uniquePaidMembers} paying customers`}
                  icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
                />
                <MetricCard
                  title="Lifetime Net Revenue"
                  value={formatMoney(analytics.netLifetimeRevenue)}
                  subtitle={`Gross: ${formatMoney(analytics.grossLifetimeRevenue)}`}
                  icon={<DollarSign className="h-5 w-5 text-gray-900" />}
                />
              </div>
            </div>

            {/* Range Performance */}
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                Period Performance ({dateRange.toUpperCase()})
              </h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  title="Period Revenue"
                  value={formatMoney(analytics.rangeRevenue)}
                  subtitle={`Recurring: ${formatMoney(analytics.rangeRecurringRevenue)} | One-time: ${formatMoney(analytics.rangeOneTimeRevenue)}`}
                  icon={<Receipt className="h-5 w-5 text-gray-900" />}
                />
                <MetricCard
                  title="Failed Payment Rate"
                  value={analytics.failedPaymentRate}
                  subtitle={`${analytics.failedCount} failed attempts`}
                  badge={analytics.failedCount > 0 ? "Requires Review" : "Optimal"}
                  icon={<AlertOctagon className="h-5 w-5 text-red-600" />}
                />
                <MetricCard
                  title="Outstanding / Overdue"
                  value={formatMoney(analytics.outstandingAmount)}
                  subtitle={`${analytics.overdueCount} overdue, ${analytics.pendingCount} pending`}
                  icon={<Clock className="h-5 w-5 text-amber-600" />}
                />
                <MetricCard
                  title="Disputes & Chargebacks"
                  value={analytics.totalChargebackCount.toString()}
                  subtitle={`Total disputed: ${formatMoney(analytics.totalChargebackAmount)}`}
                  badge={analytics.totalChargebackCount > 0 ? "Action Required" : "None"}
                  icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
                />
              </div>
            </div>

            {/* Tenant Revenue Breakdown */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-900">
                  Revenue Breakdown by Gym Tenant
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Realized revenue, transaction count, and refund volume per tenant.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Gym Tenant
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Gross Revenue
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Paid Transactions
                      </th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Refunds Issued
                      </th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Net Contribution
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.tenantBreakdown.map((t) => {
                      const net = t.revenue - t.refunds
                      return (
                        <tr key={t.gymId} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-gray-400" />
                              <span className="text-sm font-semibold text-gray-900">
                                {t.gymName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {formatMoney(t.revenue)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{t.txCount}</td>
                          <td className="px-6 py-4 text-sm text-rose-600">
                            {t.refunds > 0 ? formatMoney(t.refunds) : "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              {formatMoney(net)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  badge,
  icon,
}: {
  title: string
  value: string
  subtitle?: string
  badge?: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
          {badge && (
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}
