"use client"

import Link from "next/link"

import { CalendarDays, Plus } from "lucide-react"

import DashboardStats from "@/components/dashboard/dashboard-stats"
import RevenueOverview from "@/components/dashboard/revenue-overview"
import TodayActivity from "@/components/dashboard/today-activity"
import UpcomingClasses from "@/components/dashboard/upcoming-classes"
import RecentMembers from "@/components/dashboard/recent-members"
import QuickActions from "@/components/dashboard/quick-actions"

export default function DashboardPage() {
  return (
    <div className="p-5 md:p-8">
      {/* Page Header */}
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-400">Dashboard</p>

          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">
            Gym Dashboard 👋
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s what&apos;s happening at your gym today.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/members/create"
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={17} />
            Add Member
          </Link>

          <Link
            href="/calendar/classes/create"
            className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex"
          >
            <CalendarDays size={17} />
            New Class
          </Link>
        </div>
      </div>

      {/* Stats */}
      <DashboardStats />

      {/* Revenue + Activity */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <RevenueOverview />
        <TodayActivity />
      </div>

      {/* Classes + Members */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <UpcomingClasses />
        <RecentMembers />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
