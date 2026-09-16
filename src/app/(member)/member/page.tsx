"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Dumbbell,
  Flame,
  UserRound,
  CreditCard,
} from "lucide-react"

type UpcomingClass = {
  id: string
  title: string
  category: string
  date: string
  time: string
  trainer: string
  room: string
}

type MembershipState = {
  name: string
  status: string
  price: number
  interval: string
  started: string
  renews: string
}

export default function MemberDashboardPage() {
  const [memberName, setMemberName] = useState("Member")
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])

  const [stats, setStats] = useState({
    booked: 0,
    attended: 0,
    streak: 0,
    workoutHours: 0,
    attendanceRate: 0,
    checkIns: 0,
    missed: 0,
  })

  const [membership, setMembership] = useState<MembershipState>({
    name: "No active membership",
    status: "Inactive",
    price: 0,
    interval: "month",
    started: "—",
    renews: "—",
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setError("")

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser()

        if (authError || !authData.user) {
          throw new Error("You must be logged in.")
        }

        const authUser = authData.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, gym_id, full_name")
          .eq("id", authUser.id)
          .single()

        if (profileError || !profile?.gym_id) {
          throw new Error("Member profile not found.")
        }

        const gymId = profile.gym_id

        // ---------------------------------------------------------
        // Resolve member record
        // ---------------------------------------------------------
        const { data: memberById, error: memberByIdError } = await supabase
          .from("members")
          .select("id, first_name, last_name, email, status, joined_at")
          .eq("id", authUser.id)
          .eq("gym_id", gymId)
          .maybeSingle()

        if (memberByIdError) {
          throw memberByIdError
        }

        let member = memberById

        if (!member) {
          const { data: memberByEmail, error: memberByEmailError } =
            await supabase
              .from("members")
              .select("id, first_name, last_name, email, status, joined_at")
              .eq("gym_id", gymId)
              .eq("email", authUser.email ?? "")
              .maybeSingle()

          if (memberByEmailError) {
            throw memberByEmailError
          }

          member = memberByEmail
        }

        if (!member) {
          throw new Error(
            "Your member account is not linked yet. Please contact your gym administrator.",
          )
        }

        const fullName =
          [member.first_name, member.last_name].filter(Boolean).join(" ") ||
          profile.full_name ||
          "Member"

        setMemberName(fullName)

        const now = new Date()

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        )

        // ---------------------------------------------------------
        // Load dashboard data
        // ---------------------------------------------------------
        const [bookingsRes, checkinsRes, membershipRes] = await Promise.all([
          supabase
            .from("class_bookings")
            .select(
              `
              id,
              class_id,
              status,
              booked_at,
              class:classes(
                id,
                title,
                category,
                room,
                start_at,
                duration_minutes,
                status,
                trainer:profiles!classes_trainer_id_fkey(full_name)
              )
            `,
            )
            .eq("gym_id", gymId)
            .eq("member_id", member.id)
            .order("booked_at", { ascending: false }),

          supabase
            .from("checkins")
            .select("id, checked_in_at")
            .eq("gym_id", gymId)
            .eq("member_id", member.id)
            .order("checked_in_at", { ascending: false }),

          supabase
            .from("member_memberships")
            .select(
              `
              id,
              status,
              price_paid,
              start_date,
              end_date,
              period_start_date,
              period_end_date,
              remaining_visits,
              created_at,
              product:products(
                id,
                name,
                price,
                billing_interval,
                duration_type,
                duration_value,
                duration_unit,
                payment_type,
                active
              )
            `,
            )
            .eq("gym_id", gymId)
            .eq("member_id", member.id)
            .eq("status", "active")
            .order("start_date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(10),
        ])

        if (bookingsRes.error) {
          throw bookingsRes.error
        }

        if (checkinsRes.error) {
          throw checkinsRes.error
        }

        if (membershipRes.error) {
          throw membershipRes.error
        }

        // ---------------------------------------------------------
        // Bookings
        // ---------------------------------------------------------
        const bookings = bookingsRes.data ?? []

        const getRelatedClass = (booking: any) =>
          Array.isArray(booking.class) ? booking.class[0] : booking.class

        const trainerName = (trainer: any) =>
          Array.isArray(trainer) ? trainer[0]?.full_name : trainer?.full_name

        // Only future classes that THIS MEMBER has booked
        const futureBookedClasses = bookings
          .filter((booking: any) => {
            const classData = getRelatedClass(booking)

            if (!classData?.start_at) {
              return false
            }

            if (booking.status !== "booked") {
              return false
            }

            if (classData.status && classData.status !== "scheduled") {
              return false
            }

            return new Date(classData.start_at) >= now
          })
          .sort((a: any, b: any) => {
            const classA = getRelatedClass(a)
            const classB = getRelatedClass(b)

            return (
              new Date(classA.start_at).getTime() -
              new Date(classB.start_at).getTime()
            )
          })

        setUpcomingClasses(
          futureBookedClasses.slice(0, 3).map((booking: any) => {
            const item = getRelatedClass(booking)
            const start = new Date(item.start_at)

            return {
              id: item.id,
              title: item.title || "Class",
              category: item.category || "General",
              date: start.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
              }),
              time: start.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              trainer: trainerName(item.trainer) || "Trainer",
              room: item.room || "—",
            }
          }),
        )

        // ---------------------------------------------------------
        // Monthly attendance stats
        // ---------------------------------------------------------
        const monthBookings = bookings.filter((booking: any) => {
          if (!booking.booked_at) {
            return false
          }

          const bookedAt = new Date(booking.booked_at)

          return bookedAt >= monthStart
        })

        const attended = monthBookings.filter(
          (booking: any) => booking.status === "attended",
        ).length

        const booked = monthBookings.filter((booking: any) =>
          ["booked", "attended"].includes(booking.status),
        ).length

        const missed = Math.max(0, booked - attended)

        const attendanceRate =
          booked > 0 ? Math.round((attended / booked) * 100) : 0

        // ---------------------------------------------------------
        // Check-in stats + streak
        // ---------------------------------------------------------
        const checkins = checkinsRes.data ?? []

        const monthCheckins = checkins.filter((checkin: any) => {
          if (!checkin.checked_in_at) {
            return false
          }

          return new Date(checkin.checked_in_at) >= monthStart
        })

        const checkInDays = new Set(
          checkins.map((checkin: any) => {
            const date = new Date(checkin.checked_in_at)

            return date.toLocaleDateString("en-CA")
          }),
        )

        let streak = 0

        for (let i = 0; i < 365; i++) {
          const date = new Date(todayStart)

          date.setDate(date.getDate() - i)

          const key = date.toLocaleDateString("en-CA")

          if (checkInDays.has(key)) {
            streak += 1
          } else if (i > 0) {
            break
          }
        }

        // ---------------------------------------------------------
        // Workout time
        // ---------------------------------------------------------
        const workoutMinutes = monthBookings
          .filter((booking: any) => booking.status === "attended")
          .reduce((sum: number, booking: any) => {
            const classData = getRelatedClass(booking)

            return sum + Number(classData?.duration_minutes || 0)
          }, 0)

        setStats({
          booked,
          attended,
          streak,
          workoutHours: Math.round((workoutMinutes / 60) * 10) / 10,
          attendanceRate,
          checkIns: monthCheckins.length,
          missed,
        })

        // ---------------------------------------------------------
        // Active membership
        // ---------------------------------------------------------
        const memberships = membershipRes.data ?? []

        const validMembership = memberships.find((item: any) => {
          if (item.status !== "active") {
            return false
          }

          if (!item.end_date) {
            return true
          }

          return new Date(item.end_date) >= now
        })

        if (validMembership) {
          const product = Array.isArray(validMembership.product)
            ? validMembership.product[0]
            : validMembership.product

          const startDate =
            validMembership.start_date ||
            validMembership.period_start_date ||
            validMembership.created_at

          const endDate =
            validMembership.end_date || validMembership.period_end_date

          let renews = "—"

          if (endDate) {
            renews = new Date(endDate).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          } else if (product?.billing_interval && startDate) {
            const renewal = new Date(startDate)

            if (product.billing_interval === "month") {
              renewal.setMonth(renewal.getMonth() + 1)
            } else if (product.billing_interval === "year") {
              renewal.setFullYear(renewal.getFullYear() + 1)
            } else if (product.billing_interval === "week") {
              renewal.setDate(renewal.getDate() + 7)
            }

            renews = renewal.toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          }

          const membershipStatus =
            member.status === "active" ? "Active" : member.status || "Active"

          setMembership({
            name: product?.name || "Membership",
            status: membershipStatus,
            price: Number(validMembership.price_paid ?? product?.price ?? 0),
            interval:
              product?.billing_interval || product?.duration_unit || "month",
            started: startDate
              ? new Date(startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })
              : "—",
            renews,
          })
        } else {
          setMembership({
            name: "No active membership",
            status: "Inactive",
            price: 0,
            interval: "month",
            started: "—",
            renews: "—",
          })
        }
      } catch (err: any) {
        console.error("Member dashboard error:", err)

        setError(err?.message || "Failed to load dashboard.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const todayKey = new Date().toLocaleDateString("en-CA")

  const todayClasses = upcomingClasses.filter((item) => {
    const classDate = new Date(
      `${item.date}, ${new Date().getFullYear()}`,
    ).toLocaleDateString("en-CA")

    return classDate === todayKey
  }).length

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome */}
        <section className="rounded-2xl bg-gray-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-white/50">{todayLabel}</p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Good morning, {memberName.split(" ")[0]} 👋
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                Stay consistent, keep moving and make today count. You have{" "}
                {todayClasses} {todayClasses === 1 ? "class" : "classes"}{" "}
                scheduled today.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<CalendarDays size={18} />}
            value={loading ? "—" : String(stats.booked)}
            label="Classes Booked"
          />

          <StatCard
            icon={<CheckCircle2 size={18} />}
            value={loading ? "—" : String(stats.attended)}
            label="Classes Attended"
          />

          <StatCard
            icon={<Flame size={18} />}
            value={loading ? "—" : String(stats.streak)}
            label="Day Streak"
          />

          <StatCard
            icon={<Clock3 size={18} />}
            value={loading ? "—" : `${stats.workoutHours}h`}
            label="Workout Time"
          />
        </section>

        {/* Main Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          {/* Upcoming Classes */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Upcoming Classes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Your next booked sessions
                </p>
              </div>

              <Link
                href="/schedule"
                className="text-sm font-medium text-gray-900 hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {error ? (
                <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                  {error}
                </p>
              ) : loading ? (
                <>
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gray-200" />

                        <div className="flex-1">
                          <div className="h-4 w-40 rounded bg-gray-200" />
                          <div className="mt-2 h-3 w-56 rounded bg-gray-200" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : upcomingClasses.length === 0 ? (
                <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                  You have no upcoming booked classes.
                </p>
              ) : (
                upcomingClasses.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                          <Dumbbell size={18} />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {item.title}
                            </h3>

                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500">
                              {item.category}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span>{item.date}</span>
                            <span>{item.time}</span>
                            <span>{item.room}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <UserRound size={14} />
                        {item.trainer}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Membership */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Membership
                </p>

                <h2 className="mt-2 text-lg font-bold text-gray-900">
                  {membership.name}
                </h2>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <CreditCard size={18} />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
                  <CheckCircle2 size={12} />
                  {membership.status}
                </span>
              </div>

              {membership.price > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Price</span>

                  <span className="text-sm font-semibold text-gray-900">
                    ₹{membership.price.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Started</span>

                <span className="text-sm font-semibold text-gray-900">
                  {membership.started}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">Next renewal</span>

                <span className="text-sm font-semibold text-gray-900">
                  {membership.renews}
                </span>
              </div>
            </div>

            <Link
              href="/membership"
              className="mt-4 flex h-10 items-center justify-center rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white"
            >
              Manage Membership
            </Link>
          </section>
        </div>

        {/* Quick Actions */}
        <section className="mt-6">
          <h2 className="text-base font-semibold text-gray-900">
            Quick Actions
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/member/classes"
              icon={<Dumbbell size={19} />}
              title="Book a Class"
              description="Find your next workout"
            />

            <QuickAction
              href="/member/schedule"
              icon={<CalendarDays size={19} />}
              title="My Schedule"
              description="View upcoming classes"
            />

            <QuickAction
              href="/member/check-in"
              icon={<CheckCircle2 size={19} />}
              title="Check-In QR"
              description="Show your QR at the front desk"
            />

            <QuickAction
              href="/member/profile"
              icon={<UserRound size={19} />}
              title="My Profile"
              description="Update your information"
            />
          </div>
        </section>

        {/* Attendance */}
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Attendance Overview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your gym attendance this month.
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-gray-900">
                {stats.attendanceRate}%
              </p>

              <p className="mt-1 text-xs text-gray-500">Attendance rate</p>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900 transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, stats.attendanceRate))}%`,
              }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <span>{stats.checkIns} check-ins this month</span>

            <span>{stats.missed} missed sessions</span>
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        {icon}
      </div>

      <p className="mt-4 text-xl font-bold text-gray-900">{value}</p>

      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>

        <ArrowRight
          size={16}
          className="text-gray-300 transition group-hover:translate-x-1 group-hover:text-gray-700"
        />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>

      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </Link>
  )
}
