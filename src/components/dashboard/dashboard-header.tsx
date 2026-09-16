"use client"

import { useEffect, useState } from "react"
import { Bell, ChevronDown, Dumbbell, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DashboardHeader() {
  const [userName, setUserName] = useState("User")
  const [userRole, setUserRole] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !active) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle()

      if (!active) return

      const name =
        profile?.full_name?.trim() ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "User"

      setUserName(name)
      setUserRole(profile?.role || "")
      setAvatarUrl(profile?.avatar_url || "")
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  const initials =
    userName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile Logo */}
        <div className="lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Dumbbell size={18} />
          </div>
        </div>

        {/* Search */}
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex md:w-[280px]">
          <Search size={16} className="text-slate-400" />

          <input
            placeholder="Search anything..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />

          <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
            /
          </span>
        </div>

        {/* Mobile Title */}
        <div className="md:hidden">
          <p className="text-sm font-bold">Dashboard</p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
          <Bell size={18} />

          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="hidden h-7 w-px bg-slate-200 sm:block" />

        {/* Profile */}
        <button className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {initials}
            </div>
          )}

          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold">{userName}</p>

            <p className="text-[10px] capitalize text-slate-400">
              {userRole || "Account"}
            </p>
          </div>

          <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
        </button>
      </div>
    </header>
  )
}
