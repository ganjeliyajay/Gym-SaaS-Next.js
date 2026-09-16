"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ScanLine,
  UserCheck,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type CheckIn = {
  id: string
  checked_in_at: string
  method: string | null
}

export default function MemberCheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const loadCheckIns = useCallback(async () => {
    setError("")

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("You must be logged in.")
      }

      // ------------------------------------------
      // Get member profile
      // ------------------------------------------
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile?.gym_id) {
        throw new Error("Member profile not found.")
      }

      // ------------------------------------------
      // Resolve actual member record
      // ------------------------------------------
      const { data: memberById, error: memberByIdError } = await supabase
        .from("members")
        .select("id, email, status")
        .eq("id", user.id)
        .eq("gym_id", profile.gym_id)
        .maybeSingle()

      if (memberByIdError) {
        throw memberByIdError
      }

      let member = memberById

      if (!member) {
        const { data: memberByEmail, error: memberByEmailError } =
          await supabase
            .from("members")
            .select("id, email, status")
            .eq("gym_id", profile.gym_id)
            .eq("email", user.email ?? "")
            .maybeSingle()

        if (memberByEmailError) {
          throw memberByEmailError
        }

        member = memberByEmail
      }

      if (!member) {
        throw new Error("Your member account is not linked yet.")
      }

      // ------------------------------------------
      // Load ALL member check-ins
      // ------------------------------------------
      const { data: rows, error: checkInsError } = await supabase
        .from("checkins")
        .select("id, checked_in_at, method")
        .eq("gym_id", profile.gym_id)
        .eq("member_id", member.id)
        .order("checked_in_at", {
          ascending: false,
        })

      if (checkInsError) {
        throw checkInsError
      }

      setCheckIns(rows ?? [])
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load your check-ins.",
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadCheckIns()
  }, [loadCheckIns])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadCheckIns()
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const formatTime = (value: string) => {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getMethodLabel = (method: string | null) => {
    if (method === "qr") return "QR Check-In"
    if (method === "gym_door") return "Gym Door"
    return "Manual Check-In"
  }

  const getMethodIcon = (method: string | null) => {
    if (method === "qr") {
      return <ScanLine size={16} />
    }

    if (method === "gym_door") {
      return <CheckCircle2 size={16} />
    }

    return <UserCheck size={16} />
  }

  const getMethodClass = (method: string | null) => {
    if (method === "qr") {
      return "bg-gray-900 text-white"
    }

    if (method === "gym_door") {
      return "bg-gray-100 text-gray-700"
    }

    return "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Attendance
                </p>

                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  My Check-Ins
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm text-gray-500">
              View your complete gym check-in history.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Total Check-Ins</p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {checkIns.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">This Month</p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {
                checkIns.filter((item) => {
                  const date = new Date(item.checked_in_at)
                  const now = new Date()

                  return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                  )
                }).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Last Check-In</p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {checkIns.length > 0
                ? formatDate(checkIns[0].checked_in_at)
                : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-gray-900">
            Check-In History
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Your complete attendance activity.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Loading check-ins...
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">{error}</p>

            <button
              type="button"
              onClick={() => void loadCheckIns()}
              className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Try Again
            </button>
          </div>
        ) : checkIns.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CalendarDays size={20} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              No check-ins yet
            </h3>

            <p className="mt-1 max-w-md text-xs text-gray-500">
              Your gym check-in activity will appear here after your first
              check-in.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Date
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Time
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Method
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {checkIns.map((checkIn) => (
                    <tr
                      key={checkIn.id}
                      className="transition hover:bg-gray-50/60"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatDate(checkIn.checked_in_at)}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <Clock3 size={14} className="text-gray-400" />
                          {formatTime(checkIn.checked_in_at)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${getMethodClass(
                            checkIn.method,
                          )}`}
                        >
                          {getMethodIcon(checkIn.method)}
                          {getMethodLabel(checkIn.method)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                          Checked In
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-gray-100 md:hidden">
              {checkIns.map((checkIn) => (
                <div key={checkIn.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                      {getMethodIcon(checkIn.method)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {getMethodLabel(checkIn.method)}
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(checkIn.checked_in_at)}</span>

                        <span>•</span>

                        <span>{formatTime(checkIn.checked_in_at)}</span>
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                      <CheckCircle2 size={12} />
                      Done
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
