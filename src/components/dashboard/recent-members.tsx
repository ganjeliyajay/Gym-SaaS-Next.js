"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { supabase } from "@/lib/supabase"

type Member = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  joined_at: string
  status: "active" | "inactive" | "suspended"
}

export default function RecentMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadRecentMembers = async () => {
      try {
        setLoading(true)

        // Logged-in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error("Authentication error:", authError)
          return
        }

        // Get current user's gym
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

        // Get latest members from same gym
        const { data, error } = await supabase
          .from("members")
          .select(
            `
              id,
              first_name,
              last_name,
              email,
              joined_at,
              status
            `,
          )
          .eq("gym_id", profile.gym_id)
          .order("joined_at", {
            ascending: false,
          })
          .limit(4)

        if (error) {
          console.error(
            "Unable to load recent members:",
            error,
          )
          return
        }

        if (mounted) {
          setMembers(data ?? [])
        }
      } catch (error) {
        console.error(
          "Recent members error:",
          error,
        )
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadRecentMembers()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 p-5 md:p-6">
        <div>
          <h2 className="text-base font-bold">
            Recent Members
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Recently joined members
          </p>
        </div>

        <Link
          href="/members"
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline"
        >
          View all
          <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 p-5 md:px-6"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />

              <div className="flex-1">
                <div className="h-3 w-32 animate-pulse rounded bg-slate-100" />

                <div className="mt-2 h-2.5 w-40 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && members.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            No members yet
          </p>

          <p className="mt-1 text-xs text-slate-400">
            New members will appear here.
          </p>
        </div>
      )}

      {/* Real Members */}
      {!loading && members.length > 0 && (
        <div className="divide-y divide-slate-100">
          {members.map((member) => {
            const fullName = [
              member.first_name,
              member.last_name,
            ]
              .filter(Boolean)
              .join(" ")

            const initials = [
              member.first_name?.charAt(0),
              member.last_name?.charAt(0),
            ]
              .filter(Boolean)
              .join("")
              .toUpperCase()

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 p-5 md:px-6"
              >
                {/* Member information */}
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                    {initials || "M"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {fullName || "Unnamed Member"}
                    </p>

                    <p className="truncate text-xs text-slate-400">
                      {member.email || "No email"}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="hidden text-right sm:block">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      member.status === "active"
                        ? "bg-emerald-50 text-emerald-600"
                        : member.status === "inactive"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {member.status.charAt(0).toUpperCase() +
                      member.status.slice(1)}
                  </span>

                  <p className="mt-1 text-[10px] text-slate-400">
                    {formatJoinedDate(member.joined_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function formatJoinedDate(date: string) {
  const joinedDate = new Date(date)

  if (Number.isNaN(joinedDate.getTime())) {
    return "—"
  }

  const now = new Date()

  const difference =
    now.getTime() - joinedDate.getTime()

  const days = Math.floor(
    difference / (1000 * 60 * 60 * 24),
  )

  if (days === 0) {
    return "Today"
  }

  if (days === 1) {
    return "Yesterday"
  }

  if (days < 7) {
    return `${days} days ago`
  }

  return joinedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}