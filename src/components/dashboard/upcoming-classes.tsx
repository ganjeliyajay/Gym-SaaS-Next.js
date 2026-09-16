"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import {
  ArrowUpRight,
  Clock3,
  Dumbbell,
  MoreHorizontal,
} from "lucide-react"

import { supabase } from "@/lib/supabase"

type Trainer = {
  full_name: string | null
}

type ClassItem = {
  id: string
  title: string
  start_at: string
  capacity: number
  booked: number
  trainer: Trainer | null
}

type ClassRow = {
  id: string
  title: string
  start_at: string
  capacity: number
  trainer:
    | Trainer
    | Trainer[]
    | null
}

export default function UpcomingClasses() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUpcomingClasses() {
      try {
        if (mounted) {
          setLoading(true)
        }

        // --------------------------------------------------
        // Get authenticated user
        // --------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error(
            "Unable to get logged-in user:",
            userError,
          )
          return
        }

        if (!user) {
          console.error("No authenticated user found.")
          return
        }

        // --------------------------------------------------
        // Get user's gym
        // --------------------------------------------------

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("gym_id")
            .eq("id", user.id)
            .single()

        if (profileError) {
          console.error(
            "Unable to load user profile:",
            profileError,
          )
          return
        }

        if (!profile?.gym_id) {
          console.error("User is not associated with a gym.")
          return
        }

        const gymId = profile.gym_id

        // --------------------------------------------------
        // Today's local date range
        //
        // start_at is stored as timestamp/timestamptz.
        // Convert the user's local day boundaries to ISO so
        // Supabase can correctly compare against the DB value.
        // --------------------------------------------------

        const now = new Date()

        const startOfToday = new Date(now)
        startOfToday.setHours(0, 0, 0, 0)

        const endOfToday = new Date(now)
        endOfToday.setHours(23, 59, 59, 999)

        // --------------------------------------------------
        // Load today's scheduled classes
        // --------------------------------------------------

        const {
          data,
          error: classesError,
        } = await supabase
          .from("classes")
          .select(
            `
              id,
              title,
              start_at,
              capacity,
              trainer:profiles!classes_trainer_id_fkey(
                full_name
              )
            `,
          )
          .eq("gym_id", gymId)
          .eq("status", "scheduled")
          .gte(
            "start_at",
            startOfToday.toISOString(),
          )
          .lte(
            "start_at",
            endOfToday.toISOString(),
          )
          .order("start_at", {
            ascending: true,
          })
          .limit(4)

        if (classesError) {
          console.error(
            "Unable to load upcoming classes:",
            classesError,
          )
          return
        }

        const classRows = (data ?? []) as unknown as ClassRow[]

        if (classRows.length === 0) {
          if (mounted) {
            setClasses([])
          }

          return
        }

        // --------------------------------------------------
        // Get booking counts for these classes
        //
        // Only active "booked" records count toward capacity.
        // Cancelled / no-show / attended records are not
        // treated as current reservations here.
        // --------------------------------------------------

        const classIds = classRows.map(
          (classItem) => classItem.id,
        )

        const {
          data: bookings,
          error: bookingsError,
        } = await supabase
          .from("class_bookings")
          .select("class_id")
          .eq("gym_id", gymId)
          .in("class_id", classIds)
          .eq("status", "booked")

        if (bookingsError) {
          console.error(
            "Unable to load class bookings:",
            bookingsError,
          )

          // Keep classes visible even if booking count fails.
          // This is safer than hiding the complete class list.
        }

        // --------------------------------------------------
        // Build booking count map
        // --------------------------------------------------

        const bookingCounts: Record<string, number> = {}

        for (const booking of bookings ?? []) {
          if (!booking.class_id) {
            continue
          }

          bookingCounts[booking.class_id] =
            (bookingCounts[booking.class_id] ?? 0) + 1
        }

        // --------------------------------------------------
        // Normalize trainer relation
        //
        // Supabase can return either an object or an array
        // depending on the relationship shape.
        // --------------------------------------------------

        const normalizedClasses: ClassItem[] =
          classRows.map((item) => {
            const trainer = Array.isArray(item.trainer)
              ? item.trainer[0] ?? null
              : item.trainer

            return {
              id: item.id,
              title: item.title,
              start_at: item.start_at,
              capacity: Number(item.capacity ?? 0),
              booked: bookingCounts[item.id] ?? 0,
              trainer: trainer
                ? {
                    full_name:
                      trainer.full_name ?? null,
                  }
                : null,
            }
          })

        if (mounted) {
          setClasses(normalizedClasses)
        }
      } catch (error) {
        console.error(
          "Upcoming classes error:",
          error,
        )

        if (mounted) {
          setClasses([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadUpcomingClasses()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* --------------------------------------------------
          Header
      -------------------------------------------------- */}

      <div className="flex items-center justify-between border-b border-slate-100 p-5 md:p-6">
        <div>
          <h2 className="text-base font-bold">
            Upcoming Classes
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Your schedule for today
          </p>
        </div>

        <Link
          href="/calendar"
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline"
        >
          View calendar
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* --------------------------------------------------
          Loading State
      -------------------------------------------------- */}

      {loading && (
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-100" />

                <div>
                  <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />

                  <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-slate-100" />
                </div>
              </div>

              <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------
          Empty State
      -------------------------------------------------- */}

      {!loading && classes.length === 0 && (
        <div className="p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <Dumbbell size={19} />
          </div>

          <p className="mt-3 text-sm font-medium text-slate-700">
            No upcoming classes
          </p>

          <p className="mt-1 text-xs text-slate-400">
            There are no scheduled classes for today.
          </p>
        </div>
      )}

      {/* --------------------------------------------------
          Classes
      -------------------------------------------------- */}

      {!loading && classes.length > 0 && (
        <div className="divide-y divide-slate-100">
          {classes.map((item) => {
            const trainerName =
              item.trainer?.full_name?.trim() ||
              "No trainer assigned"

            const startDate = new Date(item.start_at)

            const time = Number.isNaN(
              startDate.getTime(),
            )
              ? "Invalid time"
              : startDate.toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )

            const capacity =
              Math.max(0, Number(item.capacity ?? 0))

            const booked =
              Math.max(0, Number(item.booked ?? 0))

            const capacityPercentage =
              capacity > 0
                ? Math.min(
                    100,
                    (booked / capacity) * 100,
                  )
                : 0

            const isFull =
              capacity > 0 && booked >= capacity

            return (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:px-6"
              >
                {/* --------------------------------------------------
                    Class Information
                -------------------------------------------------- */}

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Dumbbell size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.title}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock3 size={12} />
                        {time}
                      </span>

                      <span>•</span>

                      <span className="truncate">
                        {trainerName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* --------------------------------------------------
                    Capacity
                -------------------------------------------------- */}

                <div className="flex items-center gap-4 sm:w-[180px]">
                  <div className="flex-1">
                    <div className="mb-1.5 flex justify-between text-[10px] text-slate-400">
                      <span>Capacity</span>

                      <span
                        className={
                          isFull
                            ? "font-semibold text-red-500"
                            : ""
                        }
                      >
                        {booked} / {capacity}
                      </span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{
                          width: `${capacityPercentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/calendar/classes/${item.id}/edit`}
                    aria-label={`Open ${item.title}`}
                    className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 sm:flex"
                  >
                    <MoreHorizontal size={16} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}