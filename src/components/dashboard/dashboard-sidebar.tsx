"use client"

import Link from "next/link"
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Dumbbell,
  TrendingUp,
  UserCheck,
  Users,
  LogOut,
  ShieldCheck,
  FileSignature,
  FileText,
} from "lucide-react"
import { ROLE_PERMISSIONS, UserRole } from "@/lib/auth/roles"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { usePathname, useRouter } from "next/navigation"

export default function DashboardSidebar() {
  const [role, setRole] = useState<UserRole | null>(null)
  const permissions = role ? ROLE_PERMISSIONS[role] : null

  const router = useRouter()

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role) {
        setRole(profile.role as UserRole)
      }
    }

    void loadRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        {/* Logo */}
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Dumbbell size={20} />
          </div>

          <div>
            <p className="text-[15px] font-bold tracking-tight">
              FitManage
            </p>
            <p className="text-[11px] text-slate-400">
              Gym Management
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Main Menu
          </p>

          <div className="space-y-1">
            {/* Dashboard */}
            {permissions?.dashboard && (
              <SidebarItem
                href="/dashboard"
                icon={<Activity size={18} />}
                label="Dashboard"
              />
            )}

            {/* Members */}
            {permissions?.members && (
              <SidebarItem
                href="/members"
                icon={<Users size={18} />}
                label="Members"
              />
            )}

            {/* Admin / Staff Check-in */}
            {permissions?.checkIn && (
              <SidebarItem
                href="/check-in"
                icon={<UserCheck size={18} />}
                label="Check-in"
              />
            )}

            {/* Member Only Check-ins */}
            {role === "member" && (
              <SidebarItem
                href="/member/check-ins"
                icon={<CheckCircle2 size={18} />}
                label="My Check-Ins"
              />
            )}

            {/* Products */}
            {permissions?.products && (
              <SidebarItem
                href="/products"
                icon={<Dumbbell size={18} />}
                label="Products"
              />
            )}
       {/* Signup Forms */}
            {permissions?.signupForms && (
              <SidebarItem
                href="/signup-forms"
                icon={<FileText size={18} />}
                label="Signup Forms"
              />
            )}

            {/* Calendar */}
            {permissions?.calendar && (
              <SidebarItem
                href="/calendar"
                icon={<CalendarDays size={18} />}
                label="Calendar"
              />
            )}
          </div>

          {/* Management */}
          {role !== "member" && (
            <>
              <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Management
              </p>

              <div className="space-y-1">
                {/* Billing */}
                {permissions?.billing && (
                  <SidebarItem
                    href="/billing"
                    icon={<DollarSign size={18} />}
                    label="Billing"
                  />
                )}

                {/* Reports */}
                {permissions?.reports && (
                  <SidebarItem
                    href="/reports"
                    icon={<TrendingUp size={18} />}
                    label="Reports"
                  />
                )}

                {/* Team */}
                {permissions?.team && (
                  <SidebarItem
                    href="/team"
                    icon={<Users size={18} />}
                    label="Team"
                  />
                )}

                {/* Waivers */}
                {(role === "admin" || role === "super_admin") && (
                  <SidebarItem
                    href="/waivers"
                    icon={<FileSignature size={18} />}
                    label="Waivers"
                  />
                )}

                {/* Settings */}
                {permissions?.settings && (
                  <SidebarItem
                    href="/settings"
                    icon={<Activity size={18} />}
                    label="Settings"
                  />
                )}

                {/* Super Admin */}
                {role === "super_admin" && (
                  <>
                    <p className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-600">
                      Super Admin
                    </p>

                    <SidebarItem
                      href="/super-admin"
                      icon={<ShieldCheck size={18} />}
                      label="All Users"
                    />

                    <SidebarItem
                      href="/super-admin/membership-analytics"
                      icon={<Users size={18} />}
                      label="Membership Analytics"
                    />

                    <SidebarItem
                      href="/super-admin/financial-analytics"
                      icon={<DollarSign size={18} />}
                      label="Financial Analytics"
                    />
                  </>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="mx-4 mb-5 flex w-[calc(100%-2rem)] cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

function SidebarItem({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  const pathname = usePathname()

  const isActive =
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        isActive
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}