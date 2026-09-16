"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { MoreHorizontal } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { ROLE_PERMISSIONS, type UserRole, isValidRole } from "@/lib/auth/roles"

type TeamActionMenuProps = {
  memberId: string
  open: boolean
  onToggle: () => void
  onRemove: (memberId: string) => void
}

export default function TeamActionMenu({
  memberId,
  open,
  onToggle,
  onRemove,
}: TeamActionMenuProps) {
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Unable to load user role:", error)
        return
      }

      if (profile?.role && isValidRole(profile.role)) {
        setRole(profile.role)
      }
    }

    loadRole()
  }, [])

  const permissions = role ? ROLE_PERMISSIONS[role] : null

  // Only Admin can edit team members
  const canEdit = role === "admin"

  // Only Admin can remove team members
  const canRemove = permissions?.removeTeamMember === true

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-40 rounded-xl border border-gray-200 bg-white p-1 text-left shadow-lg">
          {/* View */}
          <Link
            href={`/team/${memberId}`}
            className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            View
          </Link>

          {/* Edit - Admin only */}
          {canEdit && (
            <Link
              href={`/team/${memberId}/edit`}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
          )}

          {/* Remove - Admin only */}
          {canRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove(memberId)
                onToggle()
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
