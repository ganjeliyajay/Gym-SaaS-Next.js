"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock3,
  Users,
  Dumbbell,
  Search,
  LayoutGrid,
  CalendarRange,
  UserRound,
} from "lucide-react"

type ViewMode = "month" | "week" | "day"

type TrainerRelation = {
  full_name: string | null
}

type ClassRow = {
  id: string
  title: string
  category: string | null
  room: string | null
  start_at: string
  duration_minutes: number | null
  capacity: number | null
  status: string
  trainer: TrainerRelation | TrainerRelation[] | null
}

type BookingRow = {
  class_id: string
  status: string
}

type ClassItem = {
  id: string
  title: string
  trainer: string
  time: string
  start: number
  duration: number
  capacity: number
  booked: number
  room: string
  category: string
  date: Date
  status: string
}

export default function CalendarPage() {
  const toast = useToast()

  const [view, setView] = useState<ViewMode>("week")
  const [search, setSearch] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [activeTrainerCount, setActiveTrainerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasInitializedDate, setHasInitializedDate] = useState(false)

  const loadClasses = useCallback(async () => {
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("You must be logged in.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", authData.user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile not found.")
      }

      const { count: trainerCount, error: trainerCountError } = await supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("gym_id", profile.gym_id)
        .eq("role", "trainer")
        .eq("status", "active")

      if (trainerCountError) {
        throw trainerCountError
      }

      setActiveTrainerCount(trainerCount ?? 0)

      const { data: rows, error: classError } = await supabase
        .from("classes")
        .select(
          `
          id,
          title,
          category,
          room,
          start_at,
          duration_minutes,
          capacity,
          status,
          trainer:profiles!classes_trainer_id_fkey(full_name)
        `,
        )
        .eq("gym_id", profile.gym_id)
        .order("start_at", { ascending: true })

      if (classError) {
        throw classError
      }

      const classRows = (rows ?? []) as ClassRow[]

      const classIds = classRows.map((row) => row.id)

      const { data: bookings, error: bookingError } = classIds.length
        ? await supabase
            .from("class_bookings")
            .select("class_id, status")
            .eq("gym_id", profile.gym_id)
            .in("class_id", classIds)
            .in("status", ["booked", "attended"])
        : {
            data: [],
            error: null,
          }

      if (bookingError) {
        throw bookingError
      }

      const bookingRows = (bookings ?? []) as BookingRow[]

      const bookingCounts = new Map<string, number>()

      bookingRows.forEach((booking) => {
        bookingCounts.set(
          booking.class_id,
          (bookingCounts.get(booking.class_id) ?? 0) + 1,
        )
      })

      const mapped: ClassItem[] = classRows.map((row) => {
        const date = new Date(row.start_at)

        const trainer = Array.isArray(row.trainer)
          ? row.trainer[0]?.full_name
          : row.trainer?.full_name

        return {
          id: row.id,
          title: row.title,
          trainer: trainer ?? "Trainer not assigned",
          time: formatTime(date),
          start: date.getHours() + date.getMinutes() / 60,
          duration: (row.duration_minutes ?? 60) / 60,
          capacity: row.capacity ?? 0,
          booked: bookingCounts.get(row.id) ?? 0,
          room: row.room ?? "Gym Floor",
          category: row.category ?? "General",
          date,
          status: row.status,
        }
      })

      setClasses(mapped)

      /*
       * IMPORTANT:
       * If the current calendar date is today but there are future
       * classes in the database, open the calendar on the first
       * upcoming class automatically.
       *
       * This fixes the case where the admin creates a class for
       * 2027 while the current date is still 2026.
       */
      if (!hasInitializedDate && mapped.length > 0) {
        const now = new Date()

        const upcomingClass = mapped.find(
          (item) => item.date.getTime() >= now.getTime(),
        )

        if (upcomingClass) {
          setCurrentDate(
            new Date(
              upcomingClass.date.getFullYear(),
              upcomingClass.date.getMonth(),
              upcomingClass.date.getDate(),
            ),
          )
        } else {
          setCurrentDate(new Date())
        }

        setHasInitializedDate(true)
      }
    } catch (err) {
      console.error("Calendar load error:", err)

      toast.error(
        "We couldn't load the calendar classes. Please refresh to try again.",
      )
    } finally {
      setLoading(false)
    }
  }, [hasInitializedDate, toast])

  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

  const filteredClasses = useMemo(() => {
    const value = search.toLowerCase().trim()

    if (!value) {
      return classes
    }

    return classes.filter(
      (item) =>
        item.title.toLowerCase().includes(value) ||
        item.trainer.toLowerCase().includes(value) ||
        item.category.toLowerCase().includes(value),
    )
  }, [classes, search])

  const monthLabel = currentDate.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  })

  const goMonth = (amount: number) => {
    setCurrentDate(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + amount, 1),
    )
  }

  const goToday = () => {
    setCurrentDate(new Date())
  }

  const goToNextClass = () => {
    const now = new Date()

    const nextClass = [...classes]
      .filter((item) => item.date.getTime() >= now.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0]

    if (!nextClass) {
      toast.info("There are no upcoming classes.")
      return
    }

    setCurrentDate(
      new Date(
        nextClass.date.getFullYear(),
        nextClass.date.getMonth(),
        nextClass.date.getDate(),
      ),
    )

    setView("day")
  }

  const todayClasses = filteredClasses.filter((item) =>
    isSameDay(item.date, new Date()),
  )

  const monthClasses = filteredClasses.filter(
    (item) =>
      item.date.getMonth() === currentDate.getMonth() &&
      item.date.getFullYear() === currentDate.getFullYear(),
  )

  const totalBookings = monthClasses.reduce((sum, item) => sum + item.booked, 0)

  const totalCapacity = monthClasses.reduce(
    (sum, item) => sum + item.capacity,
    0,
  )

  const peakClass = [...monthClasses].sort((a, b) => b.booked - a.booked)[0]

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
              <Dumbbell className="h-4 w-4" />
              <span>Gym Management</span>
              <ChevronRight className="h-4 w-4" />
              <span>Calendar</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Calendar
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage classes, trainers, schedules and bookings.
            </p>
          </div>

          <Link
            href="/calendar/classes/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create Class
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Today's Classes"
            value={todayClasses.length.toString()}
            detail={`${
              todayClasses.filter((item) => item.status === "scheduled").length
            } scheduled`}
          />

          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Bookings"
            value={totalBookings.toLocaleString()}
            detail={
              totalCapacity
                ? `${Math.round(
                    (totalBookings / totalCapacity) * 100,
                  )}% average capacity`
                : "No capacity data"
            }
          />

          <StatCard
            icon={<UserRound className="h-5 w-5" />}
            label="Active Trainers"
            value={activeTrainerCount.toString()}
            detail={`${
              todayClasses.filter((item) => item.status === "scheduled").length
            } classes today`}
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Peak Class"
            value={peakClass ? peakClass.time : "—"}
            detail={
              peakClass
                ? `${peakClass.booked} of ${peakClass.capacity} spots booked`
                : "No classes this month"
            }
          />
        </div>

        {/* Calendar */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => goMonth(1)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={goToday}
                className="ml-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={goToNextClass}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Next Class
              </button>

              <h2 className="ml-1 text-base font-semibold text-gray-900 sm:ml-2 sm:text-lg">
                {monthLabel}
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search classes..."
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-gray-300 focus:bg-white sm:w-52"
                />
              </div>

              <div className="flex items-center rounded-lg bg-gray-100 p-1">
                <ViewButton
                  active={view === "month"}
                  onClick={() => setView("month")}
                  icon={<LayoutGrid className="h-3.5 w-3.5" />}
                  label="Month"
                />

                <ViewButton
                  active={view === "week"}
                  onClick={() => setView("week")}
                  icon={<CalendarRange className="h-3.5 w-3.5" />}
                  label="Week"
                />

                <ViewButton
                  active={view === "day"}
                  onClick={() => setView("day")}
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Day"
                />
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-[500px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

                <p className="mt-3 text-sm text-gray-500">
                  Loading calendar...
                </p>
              </div>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="flex min-h-[500px] items-center justify-center px-6">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                  <CalendarDays className="h-6 w-6 text-gray-500" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-gray-900">
                  No classes found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Create a class to start managing your gym schedule.
                </p>

                <Link
                  href="/calendar/classes/create"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800"
                >
                  <Plus className="h-4 w-4" />
                  Create Class
                </Link>
              </div>
            </div>
          ) : (
            <>
              {view === "month" && (
                <MonthView
                  classes={filteredClasses}
                  currentDate={currentDate}
                />
              )}

              {view === "week" && (
                <WeekView classes={filteredClasses} currentDate={currentDate} />
              )}

              {view === "day" && (
                <DayView classes={filteredClasses} currentDate={currentDate} />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

function WeekView({
  classes,
  currentDate,
}: {
  classes: ClassItem[]
  currentDate: Date
}) {
  const weekStart = getMonday(currentDate)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return date
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-gray-200">
          <div />

          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className="border-r border-gray-100 p-3 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                {day.toLocaleDateString([], {
                  weekday: "short",
                })}
              </p>

              <div
                className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isSameDay(day, new Date())
                    ? "bg-gray-900 text-white"
                    : "text-gray-700"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[70px_repeat(7,1fr)]">
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b border-r border-gray-100 px-2 pt-2 text-[10px] text-gray-400"
              >
                {hour}
              </div>
            ))}
          </div>

          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`relative border-r border-gray-100 ${
                isSameDay(day, new Date()) ? "bg-gray-50/40" : ""
              }`}
            >
              {hours.map((hour) => (
                <div key={hour} className="h-20 border-b border-gray-100" />
              ))}

              {classes
                .filter((item) => isSameDay(item.date, day))
                .map((item) => (
                  <ClassBlock key={item.id} item={item} />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MonthView({
  classes,
  currentDate,
}: {
  classes: ClassItem[]
  currentDate: Date
}) {
  const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  const start = getMonday(first)

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[850px]">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div
              key={day}
              className="border-r border-gray-100 p-3 text-center text-xs font-semibold text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date) => {
            const dayClasses = classes.filter((item) =>
              isSameDay(item.date, date),
            )

            const inMonth =
              date.getMonth() === currentDate.getMonth() &&
              date.getFullYear() === currentDate.getFullYear()

            return (
              <div
                key={date.toISOString()}
                className={`min-h-[145px] border-b border-r border-gray-100 p-2 ${
                  inMonth ? "" : "bg-gray-50/40"
                }`}
              >
                <div
                  className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    isSameDay(date, new Date())
                      ? "bg-gray-900 text-white"
                      : inMonth
                        ? "text-gray-600"
                        : "text-gray-300"
                  }`}
                >
                  {date.getDate()}
                </div>

                <div className="space-y-1">
                  {dayClasses.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={`/calendar/classes/${item.id}/edit`}
                      className="block rounded-md bg-gray-100 px-2 py-1.5 hover:bg-gray-200"
                    >
                      <p className="truncate text-[10px] font-semibold text-gray-800">
                        {item.title}
                      </p>

                      <p className="mt-0.5 text-[9px] text-gray-400">
                        {item.time}
                      </p>
                    </Link>
                  ))}

                  {dayClasses.length > 3 && (
                    <p className="px-2 text-[9px] font-medium text-gray-400">
                      +{dayClasses.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayView({
  classes,
  currentDate,
}: {
  classes: ClassItem[]
  currentDate: Date
}) {
  const dayClasses = classes.filter((item) => isSameDay(item.date, currentDate))

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="border-b border-gray-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            {currentDate.toLocaleDateString([], {
              weekday: "long",
            })}
          </p>

          <p className="mt-1 text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString([], {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-[80px_1fr]">
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-20 border-b border-r border-gray-100 px-3 pt-2 text-xs text-gray-400"
              >
                {hour}
              </div>
            ))}
          </div>

          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="h-20 border-b border-gray-100" />
            ))}

            {dayClasses.map((item) => {
              const top = (item.start - 6) * 80 + 5
              const height = item.duration * 80 - 10

              return (
                <Link
                  key={item.id}
                  href={`/calendar/classes/${item.id}/edit`}
                  className="absolute left-3 right-3 rounded-xl border border-gray-300 bg-gray-100 p-4 text-left hover:bg-gray-200"
                  style={{
                    top: `${Math.max(top, 5)}px`,
                    height: `${Math.max(height, 70)}px`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {item.trainer} · {item.room}
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        {item.category}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-gray-600">
                      {item.booked}/{item.capacity}
                    </span>
                  </div>
                </Link>
              )
            })}

            {dayClasses.length === 0 && (
              <div className="absolute inset-x-0 top-24 text-center">
                <p className="text-sm text-gray-400">
                  No classes scheduled for this day.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClassBlock({ item }: { item: ClassItem }) {
  const top = (item.start - 6) * 80 + 5
  const height = item.duration * 80 - 10

  return (
    <Link
      href={`/calendar/classes/${item.id}/edit`}
      className="absolute left-1.5 right-1.5 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 p-2 text-left transition hover:bg-gray-200"
      style={{
        top: `${Math.max(top, 5)}px`,
        height: `${Math.max(height, 58)}px`,
      }}
    >
      <p className="truncate text-[11px] font-semibold text-gray-900">
        {item.title}
      </p>

      <p className="mt-1 truncate text-[10px] text-gray-500">{item.trainer}</p>

      <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
        <Users className="h-3 w-3" />
        {item.booked}/{item.capacity}
      </div>
    </Link>
  )
}

const hours = [
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
]

function getMonday(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)

  return result
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <p className="mt-4 text-xs font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400">{detail}</p>
    </div>
  )
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}

      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
