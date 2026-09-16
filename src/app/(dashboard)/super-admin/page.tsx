"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import {
  Search,
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Filter,
  RefreshCw,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react"

type SaaSUser = {
  id: string
  email: string
  fullName: string
  role: string
  status: string
  gymId: string | null
  gymName: string
  createdAt: string
}

type GymOption = {
  id: string
  name: string
}

export default function SuperAdminPage() {
  const toast = useToast()
  const [users, setUsers] = useState<SaaSUser[]>([])
  const [gyms, setGyms] = useState<GymOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [gymFilter, setGymFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Gyms
      const { data: gymRows } = await supabase
        .from("gyms")
        .select("id, name")
        .order("name")

      const gymList = gymRows || []
      setGyms(gymList)
      const gymMap = new Map(gymList.map((g) => [g.id, g.name]))

      // 2. Fetch Profiles with gym info
      const { data: profileRows, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, status, gym_id, created_at")
        .order("created_at", { ascending: false })

      if (profileErr) throw profileErr

      const mapped: SaaSUser[] = (profileRows || []).map((p: any) => ({
        id: p.id,
        email: p.email || "",
        fullName: p.full_name || "Anonymous User",
        role: p.role || "member",
        status: p.status || "active",
        gymId: p.gym_id || null,
        gymName: p.gym_id ? gymMap.get(p.gym_id) || "Unknown Gym" : "System / Global",
        createdAt: p.created_at || new Date().toISOString(),
      }))

      setUsers(mapped)
    } catch (err: any) {
      console.error("Super admin load error:", err)
      toast.error(err.message || "Failed to load super-admin data.")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.gymName.toLowerCase().includes(q)

      const matchRole = roleFilter === "all" || u.role === roleFilter
      const matchGym = gymFilter === "all" || u.gymId === gymFilter
      const matchStatus = statusFilter === "all" || u.status === statusFilter

      return matchSearch && matchRole && matchGym && matchStatus
    })
  }, [users, search, roleFilter, gymFilter, statusFilter])

  const handleImpersonate = async (user: SaaSUser) => {
    setImpersonatingId(user.id)
    const toastId = toast.loading(`Starting impersonation for ${user.fullName}...`)
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Impersonation failed.")
      }

      toast.dismiss(toastId)
      if (data.actionLink) {
        toast.success(`Generated login link for ${user.fullName}. Redirecting...`)
        window.location.href = data.actionLink
      } else {
        toast.success(`Redirecting as ${user.fullName}...`)
        window.location.href = data.suggestedRedirect || "/dashboard"
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(`Impersonation error: ${err.message}`)
    } finally {
      setImpersonatingId(null)
    }
  }

  const stats = useMemo(() => {
    const totalUsers = users.length
    const totalGyms = gyms.length
    const activeMembers = users.filter((u) => u.role === "member" && u.status === "active").length
    const adminsCount = users.filter((u) => u.role === "admin" || u.role === "manager").length
    return { totalUsers, totalGyms, activeMembers, adminsCount }
  }, [users, gyms])

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-amber-600 font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>Super Administrator</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Cross-Tenant User Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              All Platform Users
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage accounts, roles, and impersonate users across all gym tenants.
            </p>
          </div>

          <button
            onClick={loadData}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatBox icon={<Users className="h-5 w-5 text-gray-700" />} label="Total SaaS Users" value={stats.totalUsers} />
          <StatBox icon={<Building2 className="h-5 w-5 text-indigo-600" />} label="Active Gyms" value={stats.totalGyms} />
          <StatBox icon={<UserCheck className="h-5 w-5 text-emerald-600" />} label="Active Members" value={stats.activeMembers} />
          <StatBox icon={<ShieldCheck className="h-5 w-5 text-amber-600" />} label="Gym Admins & Staff" value={stats.adminsCount} />
        </div>

        {/* Filter Bar */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search user, email or gym..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2 text-sm outline-none focus:border-gray-900"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="trainer">Trainer</option>
                <option value="member">Member</option>
              </select>
            </div>

            <div>
              <select
                value={gymFilter}
                onChange={(e) => setGymFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
              >
                <option value="all">All Gym Tenants</option>
                {gyms.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">User</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Tenant Gym</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Role</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Created</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading platform users...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {user.gymName}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.role === "super_admin"
                            ? "bg-amber-100 text-amber-800"
                            : user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "trainer"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.status === "active" ? "text-emerald-600" : "text-gray-400"
                        }`}>
                          <span className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-gray-300"}`} />
                          {user.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={impersonatingId === user.id}
                          onClick={() => handleImpersonate(user)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-900 hover:text-white disabled:opacity-50"
                        >
                          {impersonatingId === user.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Login As
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
        {icon}
      </div>
      <p className="mt-3 text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  )
}
