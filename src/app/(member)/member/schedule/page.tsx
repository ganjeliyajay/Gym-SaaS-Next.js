"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type BookingRow = {
  id: string
  class_id: string
  status: string
  booked_at: string
  class: {
    id: string
    title: string
    category: string | null
    room: string | null
    start_at: string
    duration_minutes: number
    timezone: string
    trainer:
    | {
      full_name: string | null
    }
    | {
      full_name: string | null
    }[]
    | null
  } | null
}

type MemberRow = {
  id: string
  status: string
}

export default function MemberSchedulePage() {
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [member, setMember] = useState<MemberRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const loadSchedule = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("You must be logged in.")
      }

      const user = authData.user

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("gym_id, email")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      if (!profile?.gym_id) {
        throw new Error("Gym profile not found.")
      }

      let resolvedMember: MemberRow | null = null

      const {
        data: memberById,
        error: memberByIdError,
      } = await supabase
        .from("members")
        .select("id, status")
        .eq("gym_id", profile.gym_id)
        .eq("id", user.id)
        .maybeSingle()

      if (memberByIdError) {
        throw memberByIdError
      }

      if (memberById) {
        resolvedMember = memberById
      }

      if (!resolvedMember) {
        const email = (
          profile.email ??
          user.email ??
          ""
        )
          .trim()
          .toLowerCase()

        if (email) {
          const {
            data: memberByEmail,
            error: memberByEmailError,
          } = await supabase
            .from("members")
            .select("id, status")
            .eq("gym_id", profile.gym_id)
            .ilike("email", email)
            .maybeSingle()

          if (memberByEmailError) {
            throw memberByEmailError
          }

          if (memberByEmail) {
            resolvedMember = memberByEmail
          }
        }
      }

      if (!resolvedMember) {
        throw new Error(
          "Member record not found.",
        )
      }

      setMember(resolvedMember)

      const range = getWeekRange(weekOffset)

      const {
        data: rows,
        error: bookingError,
      } = await supabase
        .from("class_bookings")
        .select(`
          id,
          class_id,
          status,
          booked_at,
          class:classes!class_bookings_class_id_fkey(
            id,
            title,
            category,
            room,
            start_at,
            duration_minutes,
            timezone,
            trainer:profiles!classes_trainer_id_fkey(
              full_name
            )
          )
        `)
        .eq("gym_id", profile.gym_id)
        .eq("member_id", resolvedMember.id)
        .gte("booked_at", range.queryStart)
        .lte("booked_at", range.queryEnd)
        .in("status", [
          "booked",
          "attended",
          "no_show",
          "cancelled",
        ])

      if (bookingError) {
        throw bookingError
      }

      const validRows = (
        (rows ?? []) as unknown as BookingRow[]
      ).filter((booking) => {
        if (!booking.class?.start_at) {
          return false
        }

        const start = new Date(
          booking.class.start_at,
        )

        return (
          start >= range.start &&
          start <= range.end
        )
      })

      validRows.sort((a, b) => {
        const first = new Date(
          a.class!.start_at,
        ).getTime()

        const second = new Date(
          b.class!.start_at,
        ).getTime()

        return first - second
      })

      setBookings(validRows)
    } catch (error) {
      console.error(
        "Member schedule load error:",
        error,
      )

      setBookings([])
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [weekOffset])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  const week = useMemo(
    () => getWeekDays(weekOffset),
    [weekOffset],
  )

  const upcomingBookings = useMemo(() => {
    const now = Date.now()

    return bookings
      .filter(
        (booking) =>
          booking.status === "booked" &&
          booking.class &&
          new Date(
            booking.class.start_at,
          ).getTime() > now,
      )
      .sort(
        (a, b) =>
          new Date(
            a.class!.start_at,
          ).getTime() -
          new Date(
            b.class!.start_at,
          ).getTime(),
      )
  }, [bookings])

  const getDayBookings = (date: Date) => {
    return bookings.filter((booking) => {
      if (!booking.class) {
        return false
      }

      return isSameDay(
        new Date(
          booking.class.start_at,
        ),
        date,
      )
    })
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              My Schedule
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View your booked classes and upcoming sessions.
            </p>
          </div>

          <Link
            href="/member/classes"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Browse Classes
          </Link>
        </div>

        {member && member.status !== "active" && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Your member account is currently{" "}
            <span className="font-semibold">
              {member.status}
            </span>
            .
          </div>
        )}

        <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setWeekOffset((value) => value - 1)
            }
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">
              {formatWeekLabel(
                week[0],
                week[6],
              )}
            </p>

            {weekOffset === 0 && (
              <p className="mt-0.5 text-xs text-gray-400">
                This week
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setWeekOffset((value) => value + 1)
            }
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
            Loading schedule...
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {week.map((day) => {
                  const dayBookings =
                    getDayBookings(day)

                  const today = isSameDay(
                    day,
                    new Date(),
                  )

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[130px] border-r border-gray-100 p-2 last:border-r-0 sm:p-3 ${today
                          ? "bg-gray-50"
                          : ""
                        }`}
                    >
                      <div className="mb-3 text-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
                          {day.toLocaleDateString(
                            [],
                            {
                              weekday: "short",
                            },
                          )}
                        </p>

                        <div
                          className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 ${today
                              ? "bg-gray-900 text-white"
                              : "text-gray-700"
                            }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {dayBookings.length === 0 ? (
                          <p className="hidden text-center text-[10px] text-gray-300 sm:block">
                            No classes
                          </p>
                        ) : (
                          dayBookings.map(
                            (booking) => (
                              <ScheduleCard
                                key={booking.id}
                                booking={booking}
                              />
                            ),
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 p-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Classes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Your next booked sessions.
                </p>
              </div>

              {upcomingBookings.length === 0 ? (
                <div className="p-8 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-gray-300" />

                  <p className="mt-3 text-sm font-medium text-gray-700">
                    No upcoming booked classes
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Browse available classes to book your next session.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingBookings
                    .slice(0, 5)
                    .map((booking) => (
                      <UpcomingRow
                        key={booking.id}
                        booking={booking}
                      />
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function ScheduleCard({
  booking,
}: {
  booking: BookingRow
}) {
  if (!booking.class) {
    return null
  }

  const start = new Date(
    booking.class.start_at,
  )

  const isCancelled =
    booking.status === "cancelled"

  const isAttended =
    booking.status === "attended"

  return (
    <div
      className={`rounded-lg border p-2 ${isCancelled
          ? "border-gray-200 bg-gray-50 opacity-60"
          : "border-gray-200 bg-white"
        }`}
    >
      <p className="truncate text-[10px] font-semibold text-gray-800">
        {booking.class.title}
      </p>

      <p className="mt-1 text-[9px] text-gray-400">
        {start.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      <div className="mt-1">
        <span className="text-[9px] text-gray-500">
          {isCancelled
            ? "Cancelled"
            : isAttended
              ? "Attended"
              : "Booked"}
        </span>
      </div>
    </div>
  )
}

function UpcomingRow({
  booking,
}: {
  booking: BookingRow
}) {
  if (!booking.class) {
    return null
  }

  const start = new Date(
    booking.class.start_at,
  )

  const trainer = Array.isArray(
    booking.class.trainer,
  )
    ? booking.class.trainer[0]?.full_name
    : booking.class.trainer?.full_name

  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <CalendarDays className="h-5 w-5 text-gray-600" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {booking.class.title}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {booking.class.category ??
              "General"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />

              {start.toLocaleDateString(
                [],
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                },
              )}{" "}
              ·{" "}
              {start.toLocaleTimeString(
                [],
                {
                  hour: "numeric",
                  minute: "2-digit",
                },
              )}
            </span>

            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {booking.class.room ??
                "Gym Floor"}
            </span>

            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              {trainer ??
                "Trainer not assigned"}
            </span>
          </div>
        </div>
      </div>

      <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
        Booked
      </span>
    </div>
  )
}

function getWeekDays(offset: number) {
  const today = new Date()
  const monday = getMonday(today)

  monday.setDate(
    monday.getDate() + offset * 7,
  )

  return Array.from(
    { length: 7 },
    (_, index) => {
      const day = new Date(monday)

      day.setDate(
        monday.getDate() + index,
      )

      return day
    },
  )
}

function getWeekRange(offset: number) {
  const days = getWeekDays(offset)

  const start = new Date(days[0])
  start.setHours(0, 0, 0, 0)

  const end = new Date(days[6])
  end.setHours(23, 59, 59, 999)

  const queryStart = new Date(start)
  queryStart.setDate(
    queryStart.getDate() - 7,
  )

  const queryEnd = new Date(end)
  queryEnd.setDate(
    queryEnd.getDate() + 7,
  )

  return {
    start,
    end,
    queryStart: queryStart.toISOString(),
    queryEnd: queryEnd.toISOString(),
  }
}

function getMonday(date: Date) {
  const result = new Date(date)

  result.setHours(0, 0, 0, 0)

  const day = result.getDay()
  const diff =
    day === 0
      ? -6
      : 1 - day

  result.setDate(
    result.getDate() + diff,
  )

  return result
}

function isSameDay(
  first: Date,
  second: Date,
) {
  return (
    first.getFullYear() ===
    second.getFullYear() &&
    first.getMonth() ===
    second.getMonth() &&
    first.getDate() ===
    second.getDate()
  )
}

function formatWeekLabel(
  start: Date,
  end: Date,
) {
  const startLabel =
    start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })

  const endLabel =
    end.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  return `${startLabel} – ${endLabel}`
}