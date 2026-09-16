"use client"

import { useEffect, useState } from "react"
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"

type Stats = {
  totalMembers: number
  activeMembers: number
  todayCheckIns: number
  monthlyRevenue: number
  revenueChange: number | null
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    monthlyRevenue: 0,
    revenueChange: null,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadStats() {
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        // --------------------------------------------------
        // GET GYM
        // --------------------------------------------------

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.gym_id) {
          console.error(
            "Unable to load gym information:",
            profileError
          )
          return
        }

        const gymId = profile.gym_id

        // --------------------------------------------------
        // TOTAL MEMBERS
        // --------------------------------------------------

        const {
          count: totalMembers,
          error: totalMembersError,
        } = await supabase
          .from("members")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("gym_id", gymId)

        if (totalMembersError) {
          console.error(
            "Unable to load total members:",
            totalMembersError
          )
        }

        // --------------------------------------------------
        // ACTIVE MEMBERS
        // --------------------------------------------------

        const {
          count: activeMembers,
          error: activeMembersError,
        } = await supabase
          .from("members")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("gym_id", gymId)
          .eq("status", "active")

        if (activeMembersError) {
          console.error(
            "Unable to load active members:",
            activeMembersError
          )
        }

        // --------------------------------------------------
        // TODAY CHECK-INS
        // --------------------------------------------------

        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)

        const {
          count: todayCheckIns,
          error: checkInsError,
        } = await supabase
          .from("checkins")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("gym_id", gymId)
          .gte(
            "checked_in_at",
            startOfToday.toISOString()
          )
          .lte(
            "checked_in_at",
            endOfToday.toISOString()
          )

        if (checkInsError) {
          console.error(
            "Unable to load today's check-ins:",
            checkInsError
          )
        }

        // --------------------------------------------------
        // CURRENT MONTH REVENUE
        // --------------------------------------------------

        const now = new Date()

        const startOfCurrentMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        )

        const startOfNextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        )

        const {
          data: currentMonthPayments,
          error: currentRevenueError,
        } = await supabase
          .from("payments")
          .select("amount")
          .eq("gym_id", gymId)
          .eq("status", "paid")
          .gte(
            "paid_at",
            startOfCurrentMonth.toISOString()
          )
          .lt(
            "paid_at",
            startOfNextMonth.toISOString()
          )

        if (currentRevenueError) {
          console.error(
            "Unable to load current month revenue:",
            currentRevenueError
          )
        }

        const monthlyRevenue =
          currentMonthPayments?.reduce(
            (total, payment) =>
              total + (Number(payment.amount) || 0),
            0
          ) ?? 0

        // --------------------------------------------------
        // PREVIOUS MONTH REVENUE
        // --------------------------------------------------

        const startOfPreviousMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        )

        const {
          data: previousMonthPayments,
          error: previousRevenueError,
        } = await supabase
          .from("payments")
          .select("amount")
          .eq("gym_id", gymId)
          .eq("status", "paid")
          .gte(
            "paid_at",
            startOfPreviousMonth.toISOString()
          )
          .lt(
            "paid_at",
            startOfCurrentMonth.toISOString()
          )

        if (previousRevenueError) {
          console.error(
            "Unable to load previous month revenue:",
            previousRevenueError
          )
        }

        const previousMonthRevenue =
          previousMonthPayments?.reduce(
            (total, payment) =>
              total + (Number(payment.amount) || 0),
            0
          ) ?? 0

        // --------------------------------------------------
        // REVENUE CHANGE
        // --------------------------------------------------

        let revenueChange: number | null = null

        if (previousMonthRevenue > 0) {
          revenueChange =
            ((monthlyRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
            100
        } else if (monthlyRevenue > 0) {
          revenueChange = 100
        }

        // --------------------------------------------------
        // SET STATS
        // --------------------------------------------------

        if (mounted) {
          setStats({
            totalMembers: totalMembers ?? 0,
            activeMembers: activeMembers ?? 0,
            todayCheckIns: todayCheckIns ?? 0,
            monthlyRevenue,
            revenueChange,
          })
        }
      } catch (error) {
        console.error("Dashboard stats error:", error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadStats()

    return () => {
      mounted = false
    }
  }, [])

  const revenueChangeText =
    stats.revenueChange === null
      ? "—"
      : `${stats.revenueChange >= 0 ? "+" : ""}${stats.revenueChange.toFixed(
          1
        )}%`

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Total Members"
        value={
          loading
            ? "..."
            : stats.totalMembers.toString()
        }
        change="—"
        description="Current members"
        icon={<Users size={20} />}
      />

      <StatCard
        title="Active Members"
        value={
          loading
            ? "..."
            : stats.activeMembers.toString()
        }
        change="—"
        description="Currently active"
        icon={<UserCheck size={20} />}
      />

      <StatCard
        title="Monthly Revenue"
        value={
          loading
            ? "..."
            : `$${stats.monthlyRevenue.toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`
        }
        change={loading ? "—" : revenueChangeText}
        description="This month"
        icon={<DollarSign size={20} />}
      />

      <StatCard
        title="Today Check-ins"
        value={
          loading
            ? "..."
            : stats.todayCheckIns.toString()
        }
        change="—"
        description="Today's check-ins"
        icon={<UserCheck size={20} />}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  change,
  description,
  icon,
}: {
  title: string
  value: string
  change: string
  description: string
  icon: React.ReactNode
}) {
  const isPositive = change.startsWith("+")
  const isNegative = change.startsWith("-")

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>

        <span
          className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
            isNegative
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {isPositive && <TrendingUp size={11} />}
          {isNegative && <TrendingDown size={11} />}
          {change}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium text-slate-400">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight">
          {value}
        </p>

        <p className="mt-1 text-[10px] text-slate-400">
          {description}
        </p>
      </div>
    </div>
  )
}