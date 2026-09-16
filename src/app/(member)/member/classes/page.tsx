"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import Link from "next/link"

import {
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type ClassItem = {
  id: string
  title: string
  category: string
  trainer: string
  date: string
  time: string
  duration: string
  room: string
  spots: number
  capacity: number
  booked: boolean
}

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
  status: string | null
  trainer:
    | TrainerRelation
    | TrainerRelation[]
    | null
}

type BookingRow = {
  id: string
  class_id: string
  member_id: string
  status:
    | "booked"
    | "attended"
    | "no_show"
    | "cancelled"
}

export default function MemberClassesPage() {
  const {
    error: showError,
    success: showSuccess,
  } = useToast()

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] =
    useState("All")
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [categories, setCategories] = useState<string[]>([
    "All",
  ])
  const [memberId, setMemberId] = useState<string | null>(
    null,
  )
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingId, setBookingId] = useState<string | null>(
    null,
  )

  const loadClasses = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("You must be logged in.")
      }

      const authUser = authData.user

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, gym_id, role")
        .eq("id", authUser.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Member profile not found.")
      }

      const currentGymId = profile.gym_id

      let actualMemberId: string | null = null

      const {
        data: memberById,
        error: memberByIdError,
      } = await supabase
        .from("members")
        .select(
          `
            id,
            gym_id,
            status,
            email
          `,
        )
        .eq("id", authUser.id)
        .eq("gym_id", currentGymId)
        .maybeSingle()

      if (memberByIdError) {
        throw memberByIdError
      }

      if (memberById) {
        actualMemberId = memberById.id
      }

      if (!actualMemberId && authUser.email) {
        const {
          data: memberByEmail,
          error: memberByEmailError,
        } = await supabase
          .from("members")
          .select(
            `
              id,
              gym_id,
              status,
              email
            `,
          )
          .eq("gym_id", currentGymId)
          .eq("email", authUser.email)
          .maybeSingle()

        if (memberByEmailError) {
          throw memberByEmailError
        }

        if (memberByEmail) {
          actualMemberId = memberByEmail.id
        }
      }

      if (!actualMemberId) {
        setMemberId(null)
        setGymId(currentGymId)
        setClasses([])
        setCategories(["All"])

        showError(
          "Your member account is not linked yet. Please contact your gym administrator.",
        )

        return
      }

      setMemberId(actualMemberId)
      setGymId(currentGymId)

      const now = new Date()

      const {
        data: classRows,
        error: classError,
      } = await supabase
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
            trainer:profiles!classes_trainer_id_fkey(
              full_name
            )
          `,
        )
        .eq("gym_id", currentGymId)
        .eq("status", "scheduled")
        .gte("start_at", now.toISOString())
        .order("start_at", {
          ascending: true,
        })

      if (classError) {
        throw classError
      }

      const rows =
        (classRows ?? []) as unknown as ClassRow[]

      if (rows.length === 0) {
        setClasses([])
        setCategories(["All"])
        return
      }

      const classIds = rows.map((item) => item.id)

      const {
        data: bookings,
        error: bookingError,
      } = await supabase
        .from("class_bookings")
        .select(
          `
            id,
            class_id,
            member_id,
            status
          `,
        )
        .eq("gym_id", currentGymId)
        .in("class_id", classIds)
        .in("status", [
          "booked",
          "attended",
        ])

      if (bookingError) {
        throw bookingError
      }

      const bookingCounts = new Map<string, number>()
      const memberBookings = new Set<string>()

      for (const booking of (
        (bookings ?? []) as BookingRow[]
      )) {
        bookingCounts.set(
          booking.class_id,
          (bookingCounts.get(booking.class_id) ?? 0) + 1,
        )

        if (
          booking.member_id === actualMemberId &&
          booking.status === "booked"
        ) {
          memberBookings.add(booking.class_id)
        }
      }

      const mapped: ClassItem[] = rows
        .map((item) => {
          const start = new Date(item.start_at)

          if (Number.isNaN(start.getTime())) {
            return null
          }

          const trainer = Array.isArray(item.trainer)
            ? item.trainer[0]?.full_name
            : item.trainer?.full_name

          const capacity = Math.max(
            0,
            Number(item.capacity ?? 0),
          )

          const bookedCount =
            bookingCounts.get(item.id) ?? 0

          const spots =
            capacity > 0
              ? Math.max(
                  0,
                  capacity - bookedCount,
                )
              : 0

          return {
            id: item.id,
            title: item.title,
            category: item.category ?? "General",
            trainer:
              trainer?.trim() ||
              "Trainer not assigned",
            date: formatClassDate(start),
            time: formatTime(start),
            duration: `${Math.max(
              1,
              Number(item.duration_minutes ?? 60),
            )} min`,
            room:
              item.room?.trim() ||
              "Gym Floor",
            spots,
            capacity,
            booked: memberBookings.has(item.id),
          }
        })
        .filter(
          (item): item is ClassItem =>
            item !== null,
        )

      setClasses(mapped)

      const uniqueCategories = Array.from(
        new Set(
          mapped
            .map((item) => item.category)
            .filter(Boolean),
        ),
      )

      setCategories([
        "All",
        ...uniqueCategories,
      ])
    } catch (error) {
      console.error(
        "Member classes load error:",
        error,
      )

      showError(
        error instanceof Error
          ? error.message
          : "Failed to load classes.",
      )

      setClasses([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  const filteredClasses = useMemo(() => {
    const value = search.toLowerCase().trim()

    return classes.filter((item) => {
      const matchesSearch =
        !value ||
        item.title
          .toLowerCase()
          .includes(value) ||
        item.trainer
          .toLowerCase()
          .includes(value)

      const matchesCategory =
        selectedCategory === "All" ||
        item.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [
    classes,
    search,
    selectedCategory,
  ])

  const toggleBooking = async (
    classId: string,
  ) => {
    if (
      !memberId ||
      !gymId ||
      bookingId
    ) {
      return
    }

    const selectedClass = classes.find(
      (item) => item.id === classId,
    )

    if (!selectedClass) {
      return
    }

    setBookingId(classId)

    try {
      if (selectedClass.booked) {
        const {
          error: cancelError,
        } = await supabase
          .from("class_bookings")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("gym_id", gymId)
          .eq("class_id", classId)
          .eq("member_id", memberId)
          .eq("status", "booked")

        if (cancelError) {
          throw cancelError
        }

        await loadClasses()

        showSuccess(
          "Booking cancelled successfully.",
        )

        return
      }

      if (selectedClass.spots <= 0) {
        throw new Error(
          "This class is full.",
        )
      }

      const response = await fetch(
        "/api/classes/book",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
          }),
        },
      )

      let result:
        | {
            error?: string
            message?: string
            success?: boolean
          }
        | null = null

      try {
        result = await response.json()
      } catch {
        result = null
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to book this class.",
        )
      }

      await loadClasses()

      showSuccess(
        result?.message ||
          "Class booked successfully.",
      )
    } catch (error) {
      console.error(
        "Booking update error:",
        error,
      )

      showError(
        error instanceof Error
          ? error.message
          : "Failed to update booking.",
      )
    } finally {
      setBookingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Member Area
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
                Classes
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Discover classes and reserve
                your spot.
              </p>
            </div>

            <Link
              href="/schedule"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <CalendarDays size={16} />
              View Schedule
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search classes or trainers..."
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-900/5"
              />
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setSelectedCategory(category)
                }
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                  selectedCategory === category
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 mt-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Available Classes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredClasses.length}{" "}
              {filteredClasses.length === 1
                ? "class"
                : "classes"}{" "}
              available
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                <div className="h-40 animate-pulse bg-gray-900" />

                <div className="space-y-4 p-5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-11 w-full animate-pulse rounded-xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredClasses.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClasses.map((item) => {
              const isBooked = item.booked
              const isFull =
                !isBooked &&
                item.spots <= 0

              const capacity = Math.max(
                1,
                item.capacity,
              )

              const bookedCount = Math.max(
                0,
                capacity - item.spots,
              )

              const availability = Math.min(
                100,
                Math.max(
                  0,
                  (bookedCount / capacity) *
                    100,
                ),
              )

              const isUpdating =
                bookingId === item.id

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative bg-gray-900 p-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                        {item.category}
                      </span>

                      {isBooked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-900">
                          <Check size={12} />
                          Booked
                        </span>
                      )}

                      {isFull && (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80">
                          Full
                        </span>
                      )}
                    </div>

                    <h3 className="mt-5 text-xl font-bold">
                      {item.title}
                    </h3>

                    <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                      <UserRound size={15} />
                      {item.trainer}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <CalendarDays
                          size={17}
                          className="text-gray-400"
                        />

                        <span>{item.date}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Clock3
                          size={17}
                          className="text-gray-400"
                        />

                        <span>
                          {item.time} ·{" "}
                          {item.duration}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin
                          size={17}
                          className="text-gray-400"
                        />

                        <span>{item.room}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Users
                          size={17}
                          className="text-gray-400"
                        />

                        <span>
                          {item.spots} spots left ·{" "}
                          {item.capacity} capacity
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Availability
                        </span>

                        <span
                          className={`font-medium ${
                            isFull
                              ? "text-red-600"
                              : item.spots <= 4
                                ? "text-amber-600"
                                : "text-gray-700"
                          }`}
                        >
                          {isFull
                            ? "Class Full"
                            : `${item.spots} spots left`}
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gray-900 transition-all"
                          style={{
                            width: `${availability}%`,
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        toggleBooking(item.id)
                      }
                      disabled={
                        isUpdating ||
                        isFull
                      }
                      className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isBooked
                          ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      {isUpdating ? (
                        "Updating..."
                      ) : isBooked ? (
                        <>
                          <Check size={16} />
                          Cancel Booking
                        </>
                      ) : isFull ? (
                        "Class Full"
                      ) : (
                        "Book Class"
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Search size={20} />
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-900">
              No classes found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Try another search or category.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
              <InfoIcon />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Booking Information
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Please arrive at least 10
                minutes before your class. If
                you need to cancel, please do
                so in advance so another member
                can take your spot.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InfoIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />

      <line
        x1="12"
        y1="16"
        x2="12"
        y2="12"
      />

      <line
        x1="12"
        y1="8"
        x2="12.01"
        y2="8"
      />
    </svg>
  )
}

function formatClassDate(date: Date) {
  const today = new Date()
  const tomorrow = new Date()

  tomorrow.setDate(
    today.getDate() + 1,
  )

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return "Today"
  }

  if (
    date.toDateString() ===
    tomorrow.toDateString()
  ) {
    return "Tomorrow"
  }

  return date.toLocaleDateString(
    [],
    {
      weekday: "long",
      month: "short",
      day: "numeric",
    },
  )
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )
}