"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { supabase } from "@/lib/supabase"
import { ROLE_PERMISSIONS, type UserRole, isValidRole } from "@/lib/auth/roles"

import DashboardSidebar from "@/components/dashboard/dashboard-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import ImpersonationBanner from "@/components/dashboard/impersonation-banner"

const routePermissions = [
  { prefix: "/dashboard", permission: "dashboard" },
  { prefix: "/members", permission: "members" },
  { prefix: "/products", permission: "products" },
  { prefix: "/signup-forms", permission: "signupForms" },
  { prefix: "/waivers", permission: "waivers" },
  { prefix: "/calendar", permission: "calendar" },
  { prefix: "/check-in", permission: "checkIn" },
  { prefix: "/billing", permission: "billing" },
  { prefix: "/team", permission: "team" },
  { prefix: "/reports", permission: "reports" },
  { prefix: "/settings", permission: "settings" },
] as const

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      setLoading(true)
      setAllowed(false)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error || !profile || !isValidRole(profile.role)) {
        console.error("Unable to load valid user role:", error)
        router.replace("/")
        return
      }

      const role: UserRole = profile.role

      if (role === "super_admin") {
        if (mounted) {
          setAllowed(true)
          setLoading(false)
        }
        return
      }

      if (pathname.startsWith("/super-admin")) {
        router.replace("/dashboard")
        return
      }

      // --------------------------------------------------
      // TEAM INVITE - ADMIN ONLY
      // --------------------------------------------------

      const isTeamInviteRoute =
        pathname === "/team/invite" || pathname.startsWith("/team/invite/")

      if (isTeamInviteRoute && role !== "admin") {
        router.replace("/team")
        return
      }

      // --------------------------------------------------
      // TEAM EDIT - ADMIN ONLY
      // --------------------------------------------------

      const isTeamEditRoute =
        pathname.startsWith("/team/") && pathname.endsWith("/edit")

      if (isTeamEditRoute && role !== "admin") {
        router.replace("/team")
        return
      }

      // --------------------------------------------------
      // GENERAL ROUTE PERMISSIONS
      // --------------------------------------------------

      const matchedRoute = routePermissions.find((route) =>
        pathname.startsWith(route.prefix),
      )

      if (!matchedRoute) {
        if (mounted) {
          setAllowed(true)
          setLoading(false)
        }

        return
      }

      const hasAccess = ROLE_PERMISSIONS[role][matchedRoute.permission]

      if (!hasAccess) {
        // Member
        if (role === "member") {
          router.replace("/member")
          return
        }

        // Trainer
        if (role === "trainer") {
          router.replace("/calendar")
          return
        }

        // Admin / Manager fallback
        router.replace("/dashboard")
        return
      }

      if (mounted) {
        setAllowed(true)
        setLoading(false)
      }
    }

    checkAccess()

    return () => {
      mounted = false
    }
  }, [pathname, router])

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access...</div>
      </div>
    )
  }

  // --------------------------------------------------
  // BLOCKED
  // --------------------------------------------------

  if (!allowed) {
    return null
  }

  // --------------------------------------------------
  // DASHBOARD SHELL
  // Sidebar + Header are now shared across
  // every page inside (dashboard)
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <ImpersonationBanner />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {/* Header */}
          <DashboardHeader />

          {/* Page Content */}
          {children}
        </main>
      </div>
    </div>
  )
}
