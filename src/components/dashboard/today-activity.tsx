"use client"

import { useEffect, useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { supabase } from "@/lib/supabase"

type ActivityData = {
  checkedIn: number
  expected: number
  absent: number
  attendance: number
}

export default function TodayActivity() {
  const [activity, setActivity] = useState<ActivityData>({
    checkedIn: 0,
    expected: 0,
    absent: 0,
    attendance: 0,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadTodayActivity() {
      try {
        setLoading(true)

        // -----------------------------------------
        // Get logged-in user
        // -----------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error(
            "Unable to get logged-in user:",
            userError,
          )
          return
        }

        // -----------------------------------------
        // Get user's gym
        // -----------------------------------------

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("gym_id")
            .eq("id", user.id)
            .single()

        if (profileError || !profile?.gym_id) {
          console.error(
            "Unable to get gym:",
            profileError,
          )
          return
        }

        const gymId = profile.gym_id

        // -----------------------------------------
        // Today boundaries
        // -----------------------------------------

        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)

        // -----------------------------------------
        // Get active members
        // -----------------------------------------

        const {
          count: activeMembers,
          error: membersError,
        } = await supabase
          .from("members")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("gym_id", gymId)
          .eq("status", "active")

        if (membersError) {
          console.error(
            "Unable to get active members:",
            membersError,
          )
          return
        }

        // -----------------------------------------
        // Get today's check-ins
        // -----------------------------------------

        const {
          data: checkins,
          error: checkinsError,
        } = await supabase
          .from("checkins")
          .select("member_id")
          .eq("gym_id", gymId)
          .gte(
            "checked_in_at",
            startOfToday.toISOString(),
          )
          .lte(
            "checked_in_at",
            endOfToday.toISOString(),
          )

        if (checkinsError) {
          console.error(
            "Unable to get today's check-ins:",
            checkinsError,
          )
          return
        }

        // -----------------------------------------
        // Count unique members
        // -----------------------------------------

        const uniqueMemberIds = new Set(
          (checkins ?? []).map(
            (checkin) => checkin.member_id,
          ),
        )

        const checkedIn = uniqueMemberIds.size
        const expected = activeMembers ?? 0
        const absent = Math.max(
          expected - checkedIn,
          0,
        )

        const attendance =
          expected > 0
            ? Number(
                ((checkedIn / expected) * 100).toFixed(
                  1,
                ),
              )
            : 0

        if (mounted) {
          setActivity({
            checkedIn,
            expected,
            absent,
            attendance,
          })
        }
      } catch (error) {
        console.error(
          "Today's activity error:",
          error,
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadTodayActivity()

    return () => {
      mounted = false
    }
  }, [])

  const attendanceProgress = Math.min(
    activity.attendance,
    100,
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">
            Today&apos;s Activity
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Member attendance
          </p>
        </div>

        <MoreHorizontal
          size={19}
          className="text-slate-400"
        />
      </div>

      {/* Attendance Circle */}
      <div className="mt-7 flex items-center justify-center">
        <div
          className="relative flex h-44 w-44 items-center justify-center rounded-full border-[18px] border-slate-100"
          style={{
            background: `conic-gradient(#0f172a ${attendanceProgress}%, transparent ${attendanceProgress}%)`,
          }}
        >
          <div className="absolute inset-[0px] flex items-center justify-center rounded-full bg-white">
            <div className="text-center">
              {loading ? (
                <>
                  <div className="mx-auto h-8 w-14 animate-pulse rounded bg-slate-100" />

                  <div className="mx-auto mt-2 h-2.5 w-16 animate-pulse rounded bg-slate-100" />
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    {activity.checkedIn}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Check-ins
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mt-7 grid grid-cols-2 gap-3">
        <ActivityStat
          label="Checked in"
          value={
            loading
              ? "—"
              : String(activity.checkedIn)
          }
        />

        <ActivityStat
          label="Expected"
          value={
            loading
              ? "—"
              : String(activity.expected)
          }
        />

        <ActivityStat
          label="Absent"
          value={
            loading
              ? "—"
              : String(activity.absent)
          }
        />

        <ActivityStat
          label="Attendance"
          value={
            loading
              ? "—"
              : `${activity.attendance}%`
          }
        />
      </div>
    </section>
  )
}

function ActivityStat({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold">
        {value}
      </p>
    </div>
  )
}