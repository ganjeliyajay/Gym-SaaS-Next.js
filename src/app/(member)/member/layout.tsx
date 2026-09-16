"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  CalendarDays,
  Dumbbell,
  Home,
  LogOut,
  Menu,
  UserRound,
  X,
  CreditCard,
  CheckCircle2,
} from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import ImpersonationBanner from "@/components/dashboard/impersonation-banner"

const navigation = [
  {
    name: "Dashboard",
    href: "/member",
    icon: Home,
  },
  {
    name: "Classes",
    href: "/member/classes",
    icon: Dumbbell,
  },
  {
    name: "My Schedule",
    href: "/member/schedule",
    icon: CalendarDays,
  },
  {
    name: "My Check-Ins",
    href: "/member/check-ins",
    icon: CheckCircle2,
  },
  {
    name: "Membership",
    href: "/member/membership",
    icon: CreditCard,
  },
  {
    name: "Profile",
    href: "/member/profile",
    icon: UserRound,
  },
]

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [memberName, setMemberName] = useState("Member")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let active = true

    const loadMember = async () => {
      setCheckingAuth(true)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace("/login")
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, gym_id, role, full_name, email, avatar_url")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        if (!profile?.gym_id) {
          router.replace("/login")
          return
        }

        const role = String(profile.role || "").toLowerCase()

        if (role && !["member", "user"].includes(role)) {
          router.replace("/dashboard")
          return
        }

        let member: {
          id: string
          first_name: string | null
          last_name: string | null
          profile_image_url: string | null
          status: string | null
        } | null = null

        const { data: memberById } = await supabase
          .from("members")
          .select("id, first_name, last_name, profile_image_url, status")
          .eq("id", user.id)
          .eq("gym_id", profile.gym_id)
          .maybeSingle()

        if (memberById) {
          member = memberById
        }

        if (!member && user.email) {
          const email = user.email.trim().toLowerCase()

          const { data: memberByEmail } = await supabase
            .from("members")
            .select("id, first_name, last_name, profile_image_url, status")
            .eq("gym_id", profile.gym_id)
            .ilike("email", email)
            .maybeSingle()

          if (memberByEmail) {
            member = memberByEmail
          }
        }

        if (!member) {
          router.replace("/login")
          return
        }

        const fullName =
          `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
          profile.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Member"

        if (!active) {
          return
        }

        setMemberName(fullName)

        setAvatarUrl(member.profile_image_url || profile.avatar_url || "")
      } catch (error) {
        console.error("Member layout auth error:", error)

        if (active) {
          router.replace("/login")
        }
      } finally {
        if (active) {
          setCheckingAuth(false)
        }
      }
    }

    loadMember()

    return () => {
      active = false
    }
  }, [router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
          <p className="mt-3 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <ImpersonationBanner />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-gray-100 px-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white">
              <Dumbbell size={18} />
            </div>

            <div>
              <p className="text-sm font-bold text-gray-900">FitSpace</p>

              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                Member Portal
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>

          {navigation.map((item) => {
            const Icon = item.icon

            const active =
              item.href === "/member"
                ? pathname === "/member"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={17} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white">
            <Dumbbell size={18} />
          </div>

          <div>
            <p className="text-sm font-bold text-gray-900">FitSpace</p>

            <p className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
              Member
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute right-0 top-0 flex h-full w-[290px] flex-col bg-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
              <p className="text-sm font-bold text-gray-900">Member Menu</p>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X size={19} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const Icon = item.icon

                const active =
                  item.href === "/member"
                    ? pathname === "/member"
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                      active
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={17} />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
              >
                <LogOut size={17} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="hidden h-16 items-center justify-between border-b border-gray-200 bg-white px-6 lg:flex">
          <div>
            <p className="text-xs text-gray-400">Welcome back</p>

            <p className="text-sm font-semibold text-gray-900">{memberName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <Bell size={18} />

              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gray-900" />
            </button>

            <Link
              href="/member/profile"
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-50"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={memberName}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                  {memberName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "ME"}
                </div>
              )}

              <span className="text-sm font-medium text-gray-700">
                {memberName}
              </span>
            </Link>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
