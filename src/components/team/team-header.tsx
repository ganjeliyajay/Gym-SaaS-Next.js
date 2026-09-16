"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { ROLE_PERMISSIONS, isValidRole, type UserRole } from "@/lib/auth/roles"

export default function TeamHeader() {
  const router = useRouter()

  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role && isValidRole(profile.role)) {
        setRole(profile.role)
      }
    }

    loadRole()
  }, [])

  const canInvite = role ? ROLE_PERMISSIONS[role].invite : false

  return (
    <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-gray-900">Team</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
          Team
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your gym team members and their permissions.
        </p>
      </div>

      {canInvite && (
        <button
          type="button"
          onClick={() => router.push("/team/invite")}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
        >
          <Plus size={18} />
          Invite Member
        </button>
      )}
    </div>
  )
}
