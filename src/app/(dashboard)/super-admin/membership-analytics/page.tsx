"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Users,
  TrendingUp,
  UserMinus,
  RotateCw,
  Clock,
  Sparkles,
  ChevronRight,
  Calendar,
  Building2,
  PieChart,
  Loader2,
  Package,
  CheckCircle2,
  Activity,
} from "lucide-react"

type DateRangeOption = "7d" | "30d" | "90d" | "1y" | "all"

export default function SuperAdminMembershipAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d")
  const [inactiveDays, setInactiveDays] = useState<number>(30)

  const [members, setMembers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [gyms, setGyms] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: memberRows },
        { data: productRows },
        { data: membershipRows },
        { data: checkinRows },
        { data: paymentRows },
        { data: gymRows },
      ] = await Promise.all([
        supabase.from("members").select("id, gym_id, status, joined_at, created_at"),
        supabase.from("products").select("id, gym_id, name, price, billing_interval"),
        supabase.from("member_memberships").select(`
          id,
          gym_id,
          member_id,
          product_id,
          price_paid,
          status,
          start_date,
          end_date,
          period_start_date,
          period_end_date,
          cancelled_at,
          created_at,
          product:products(id, name, billing_interval)
        `),
        supabase.from("checkins").select("id, member_id, checked_in_at"),
        supabase.from("payments").select("id, gym_id, product_id, amount, status, paid_at"),
        supabase.from("gyms").select("id, name"),
      ])

      setMembers(memberRows || [])
      setProducts(productRows || [])
      setMemberships(membershipRows || [])
      setCheckins(checkinRows || [])
      setPayments(paymentRows || [])
      setGyms(gymRows || [])
    } catch (err) {
      console.error("Failed to load membership analytics data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate Metrics
  const analytics = useMemo(() => {
    const now = new Date()
    let startDate = new Date(0)

    if (dateRange === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (dateRange === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else if (dateRange === "90d") startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    else if (dateRange === "1y") startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    // 1. Lifetime totals
    const totalMembers = members.length
    const activeMembers = members.filter((m) => m.status === "active").length
    const canceledMembers = members.filter(
      (m) => m.status === "canceled" || m.status === "cancelled" || m.status === "inactive"
    ).length

    // Average duration in days
    let totalDurationDays = 0
    let durationCount = 0
    members.forEach((m) => {
      const joined = new Date(m.joined_at || m.created_at)
      if (!isNaN(joined.getTime())) {
        const diffDays = Math.max(1, Math.round((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)))
        totalDurationDays += diffDays
        durationCount++
      }
    })
    const avgDurationDays = durationCount > 0 ? Math.round(totalDurationDays / durationCount) : 0
    const avgDurationMonths = (avgDurationDays / 30.4).toFixed(1)

    // 2. Range new members
    const newMembersInRange = members.filter((m) => {
      const d = new Date(m.joined_at || m.created_at)
      return d >= startDate && d <= now
    }).length

    // 3. True Churn Rate (Req 23)
    // Formula: memberships cancelled during period / (active at start of period)
    const cancellationsInRange = memberships.filter((ms) => {
      if (ms.status !== "cancelled" && ms.status !== "canceled") return false
      const cancelDate = ms.cancelled_at ? new Date(ms.cancelled_at) : null
      return cancelDate && cancelDate >= startDate && cancelDate <= now
    }).length

    const activeAtStart = Math.max(1, activeMembers + cancellationsInRange - newMembersInRange)
    const churnRatePercent = ((cancellationsInRange / activeAtStart) * 100).toFixed(1)

    // 4. True Renewal Rate (Req 22)
    // Formula: members who successfully renewed / members eligible for renewal within selected period
    // If no eligible renewals in period: display "N/A"
    const eligibleRenewals = memberships.filter((ms) => {
      if (!ms.period_end_date) return false
      const pEnd = new Date(ms.period_end_date)
      return pEnd >= startDate && pEnd <= now
    })

    const eligibleCount = eligibleRenewals.length
    const successfulRenewals = eligibleRenewals.filter((ms) => ms.status === "active").length
    const renewalRateDisplay =
      eligibleCount > 0 ? `${((successfulRenewals / eligibleCount) * 100).toFixed(1)}%` : "N/A"

    // 5. Configurable Inactive-Member Threshold (Req 24)
    const inactiveCutoff = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000)
    const recentCheckinMemberIds = new Set(
      checkins.filter((c) => new Date(c.checked_in_at) >= inactiveCutoff).map((c) => c.member_id)
    )

    const inactiveCount = members.filter(
      (m) => m.status === "active" && !recentCheckinMemberIds.has(m.id)
    ).length

    // 6. Better Membership-Plan Analytics (Req 28)
    const planBreakdown = products.map((prod) => {
      const planMemberships = memberships.filter((ms) => ms.product_id === prod.id)
      const activeCount = planMemberships.filter((ms) => ms.status === "active").length
      const totalSignups = planMemberships.length
      const cancellations = planMemberships.filter(
        (ms) => ms.status === "cancelled" || ms.status === "canceled"
      ).length

      // Plan MRR from active memberships
      let planMrr = 0
      planMemberships
        .filter((ms) => ms.status === "active")
        .forEach((ms) => {
          const price = Number(ms.price_paid || prod.price || 0)
          const interval = (prod.billing_interval || "month").toLowerCase()
          if (interval === "year" || interval === "annual") planMrr += price / 12
          else if (interval === "week") planMrr += (price * 52) / 12
          else planMrr += price
        })

      // Revenue collected for this product
      const paidForProduct = payments.filter(
        (p) => p.product_id === prod.id && p.status === "paid"
      )
      const totalRevenue = paidForProduct.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

      return {
        id: prod.id,
        name: prod.name,
        activeMembers: activeCount,
        totalSignups,
        cancellations,
        totalRevenue,
        mrr: planMrr,
        interval: prod.billing_interval || "month",
      }
    }).sort((a, b) => b.activeMembers - a.activeMembers)

    // Gym Tenant Breakdown
    const gymMap = new Map(gyms.map((g) => [g.id, g.name]))
    const tenantCounts = new Map<string, { total: number; active: number }>()
    members.forEach((m) => {
      const cur = tenantCounts.get(m.gym_id) || { total: 0, active: 0 }
      cur.total++
      if (m.status === "active") cur.active++
      tenantCounts.set(m.gym_id, cur)
    })

    const tenantBreakdown = Array.from(tenantCounts.entries())
      .map(([gymId, counts]) => ({
        gymId,
        gymName: gymMap.get(gymId) || "Unnamed Gym",
        total: counts.total,
        active: counts.active,
      }))
      .sort((a, b) => b.active - a.active)

    return {
      totalMembers,
      activeMembers,
      canceledMembers,
      avgDurationDays,
      avgDurationMonths,
      newMembersInRange,
      cancellationsInRange,
      churnRatePercent,
      renewalRateDisplay,
      eligibleRenewalsCount: eligibleCount,
      inactiveCount,
      planBreakdown,
      tenantBreakdown,
    }
  }, [members, checkins, gyms, products, memberships, payments, dateRange, inactiveDays])

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
              <span className="text-gray-600">Cross-Platform Analytics</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Membership Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Member retention, true renewal rates, subscription churn, plan breakdowns, and inactivity tracking.
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
            {/* Primary KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                title="Active Members"
                value={analytics.activeMembers.toString()}
                subtitle={`Out of ${analytics.totalMembers} total profiles`}
                icon={<Users className="h-5 w-5 text-emerald-600" />}
              />
              <MetricCard
                title="True Renewal Rate"
                value={analytics.renewalRateDisplay}
                subtitle={`${analytics.eligibleRenewalsCount} eligible in period`}
                badge="Renewed / Eligible"
                icon={<RotateCw className="h-5 w-5 text-blue-600" />}
              />
              <MetricCard
                title="Membership Churn"
                value={`${analytics.churnRatePercent}%`}
                subtitle={`${analytics.cancellationsInRange} cancellations in range`}
                badge="Period Cancellations"
                icon={<UserMinus className="h-5 w-5 text-rose-600" />}
              />
              <MetricCard
                title="Average Tenure"
                value={`${analytics.avgDurationMonths} mos`}
                subtitle={`${analytics.avgDurationDays} days average lifecycle`}
                icon={<Clock className="h-5 w-5 text-indigo-600" />}
              />
            </div>

            {/* Inactive Member Threshold Controller (Req 24) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Inactive Member Threshold
                  </h3>
                  <p className="text-xs text-gray-500">
                    Active members with no successful check-in in the last {inactiveDays} consecutive days.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Threshold:</span>
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setInactiveDays(days)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        inactiveDays === days
                          ? "bg-amber-500 text-white shadow-sm"
                          : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50/70 p-4 border border-amber-200/60">
                <Activity className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-xs text-amber-900">
                  Currently <strong className="text-amber-950 font-bold">{analytics.inactiveCount}</strong> active members have not checked in within the past {inactiveDays} days.
                </div>
              </div>
            </div>

            {/* Membership Plan Breakdown (Req 28) */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-5">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-700" />
                  <h3 className="text-base font-semibold text-gray-900">
                    Membership Plan Analytics
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Performance metrics by plan: active subscribers, total signups, MRR contribution, and collected revenue.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Plan Name</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Active Members</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Total Signups</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Cancellations</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Monthly Run Rate (MRR)</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.planBreakdown.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                          <span className="ml-2 text-xs text-gray-400 capitalize">({plan.interval})</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            {plan.activeMembers}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{plan.totalSignups}</td>
                        <td className="px-6 py-4 text-sm text-rose-600">{plan.cancellations}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-indigo-600">
                          {formatMoney(plan.mrr)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatMoney(plan.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                    {analytics.planBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">
                          No membership products configured.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gym Tenant Member Breakdown */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-5">
                <h3 className="text-base font-semibold text-gray-900">
                  Member Distribution by Gym Tenant
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Total member volume and active rosters across tenants.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Gym Tenant</th>
                      <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Active Members</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Total Profiles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.tenantBreakdown.map((t) => (
                      <tr key={t.gymId} className="hover:bg-gray-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-900">{t.gymName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {t.active} active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">{t.total}</td>
                      </tr>
                    ))}
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
