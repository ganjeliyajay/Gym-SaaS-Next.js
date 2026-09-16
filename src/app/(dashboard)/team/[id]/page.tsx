"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Clock3,
  Dumbbell,
  Edit3,
  Mail,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react"

import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ROLE_PERMISSIONS, isValidRole, type UserRole } from "@/lib/auth/roles"
import { useToast } from "@/components/ui/toast"

type Role = "Admin" | "Manager" | "Trainer"

type UserType = {
  id: string
  name: string
  email: string
  role: Role
  status: string
  joined: string
  lastActive: string
  avatar: string
}

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  status?: string | null
  gym_id: string
  created_at: string | null
  updated_at: string | null
  avatar_url: string | null
}

const roleInfo = {
  admin: {
    icon: ShieldCheck,
    description: "Full access to the gym management system.",
    permissions: [
      "Manage all gym members",
      "Manage products and payments",
      "Create and manage classes",
      "Invite and remove team members",
      "Access all gym settings",
    ],
  },

  manager: {
    icon: BriefcaseBusiness,
    description: "Management access without team administration.",
    permissions: [
      "Manage gym members",
      "Manage products and payments",
      "Create and manage classes",
      "View team members",
      "Access gym settings",
    ],
  },

  trainer: {
    icon: Dumbbell,
    description: "Access to calendar and trainer-related features.",
    permissions: [
      "View assigned classes",
      "Access calendar",
      "Manage assigned class details",
      "View relevant member information",
      "Access trainer settings",
    ],
  },
}

export default function TeamMemberDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { error: toastError, success: toastSuccess, warning: toastWarning } = useToast()

  const memberId = Array.isArray(params.id) ? params.id[0] : params.id

  const [showMenu, setShowMenu] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  const [user, setUser] = useState<UserType | null>(null)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [currentGymId, setCurrentGymId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [isRemoving, setIsRemoving] = useState(false)

  const roleKey =
    user?.role === "Admin"
      ? "admin"
      : user?.role === "Manager"
        ? "manager"
        : "trainer"

  const role = roleInfo[roleKey]
  const RoleIcon = role.icon

  const canEdit = currentRole === "admin"

  const canRemove =
    currentRole !== null && ROLE_PERMISSIONS[currentRole].removeTeamMember

  useEffect(() => {
    const userDetails = async () => {
      try {
        setLoading(true)

        // --------------------------------------------------
        // 1. Get logged-in user
        // --------------------------------------------------
        const { data: authData, error: authError } =
          await supabase.auth.getUser()

        if (authError || !authData.user) {
          router.replace("/login")
          return
        }

        const loggedInUserId = authData.user.id

        setCurrentUserId(loggedInUserId)

        // --------------------------------------------------
        // 2. Get logged-in user's profile
        // --------------------------------------------------
        const { data: currentProfile, error: currentProfileError } =
          await supabase
            .from("profiles")
            .select("gym_id, role")
            .eq("id", loggedInUserId)
            .single()

        if (currentProfileError || !currentProfile) {
          router.replace("/dashboard")
          return
        }

        // --------------------------------------------------
        // 3. Validate current application role
        // --------------------------------------------------
        if (!isValidRole(currentProfile.role)) {
          router.replace("/dashboard")
          return
        }

        const loggedInRole = currentProfile.role as UserRole

        const gymId = currentProfile.gym_id

        setCurrentRole(loggedInRole)
        setCurrentGymId(gymId)

        // --------------------------------------------------
        // 4. Only Admin + Manager can view Team details
        // --------------------------------------------------
        if (loggedInRole !== "admin" && loggedInRole !== "manager") {
          router.replace("/dashboard")
          return
        }

        // --------------------------------------------------
        // 5. Validate member ID
        // --------------------------------------------------
        if (!memberId) {
          router.replace("/team")
          return
        }

        // --------------------------------------------------
        // 6. Get target team member
        // Same gym + team roles only
        // --------------------------------------------------
        const { data, error: userError } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, gym_id, status, avatar_url, created_at, updated_at")
          .eq("id", memberId)
          .eq("gym_id", gymId)
          .in("role", ["admin", "manager", "trainer"])
          .single()

        if (userError || !data) {
          console.error(userError?.message || "Team member not found")

          router.replace("/team")
          return
        }

        const profile = data as Profile

        // --------------------------------------------------
        // 7. Convert DB role to UI role
        // --------------------------------------------------
        const displayRole: Role =
          profile.role === "admin"
            ? "Admin"
            : profile.role === "manager"
              ? "Manager"
              : "Trainer"

        const fullName = profile.full_name?.trim() || "Unknown User"

        const avatar = fullName
          .split(" ")
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()

        // --------------------------------------------------
        // 8. Set real member data
        // --------------------------------------------------
        setUser({
          id: profile.id,
          name: fullName,
          email: profile.email || "",
          role: displayRole,
          status: profile.status === "inactive" ? "Inactive" : profile.status === "suspended" ? "Suspended" : profile.status === "pending" ? "Pending" : "Active",
          joined: profile.created_at
            ? new Date(profile.created_at).toLocaleDateString()
            : "—",
          lastActive: profile.updated_at
            ? new Date(profile.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—",
          avatar: profile.avatar_url || avatar,
        })
      } catch (error) {
        console.error("Failed to load team member:", error)

        router.replace("/team")
      } finally {
        setLoading(false)
      }
    }

    userDetails()
  }, [memberId, router])

  // --------------------------------------------------
  // Remove member
  // --------------------------------------------------
  const handleRemoveMember = async () => {
    if (!user) return

    // Only Admin can remove
    if (!canRemove) {
      return
    }

    // Cannot remove yourself
    if (user.id === currentUserId) {
      toastWarning("You cannot remove yourself from the team.")
      setShowRemoveModal(false)
      return
    }

    // Gym validation
    if (!currentGymId) {
      toastError("Gym information not found.")
      return
    }

    try {
      setIsRemoving(true)

      // --------------------------------------------------
      // Verify target member again
      // --------------------------------------------------
      const { data: targetMember, error: targetError } = await supabase
        .from("profiles")
        .select("id, gym_id, role")
        .eq("id", user.id)
        .single()

      if (targetError || !targetMember) {
        toastError("Team member not found.")
        return
      }

      // --------------------------------------------------
      // Same gym check
      // --------------------------------------------------
      if (targetMember.gym_id !== currentGymId) {
        toastError("You cannot remove a member from another gym.")
        return
      }

      // --------------------------------------------------
      // Team role check
      // --------------------------------------------------
      if (
        targetMember.role !== "admin" &&
        targetMember.role !== "manager" &&
        targetMember.role !== "trainer"
      ) {
        toastError("This user is not a team member.")
        return
      }

      // --------------------------------------------------
      // Delete profile
      // --------------------------------------------------
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id)
        .eq("gym_id", currentGymId)

      if (deleteError) {
        toastError("We couldn't remove the team member. Please try again.")
        return
      }

      // --------------------------------------------------
      // Member removed successfully
      // --------------------------------------------------
      setShowRemoveModal(false)
      toastSuccess("Team member removed successfully.")

      router.replace("/team")
    } catch (err) {
      console.error("Failed to remove team member:", err)
      toastError("Something went wrong while removing the team member.")
    } finally {
      setIsRemoving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[400px] max-w-6xl items-center justify-center">
          <p className="text-sm text-gray-500">Loading team member...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Back */}
        <Link
          href="/team"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
        >
          <ArrowLeft size={17} />
          Back to Team
        </Link>

        {/* Header */}
        <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-lg font-semibold text-white">
              {user.avatar}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  {user.name}
                </h1>

                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-700" />
                  {user.status}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <Mail size={14} />
                {user.email}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="relative flex gap-2">
            {canEdit && (
              <Link
                href={`/team/${user.id}/edit`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Edit3 size={16} />
                Edit
              </Link>
            )}

            {canRemove && (
              <>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  <MoreHorizontal size={18} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowRemoveModal(true)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Remove Member
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left */}
          <div className="space-y-6">
            {/* Profile */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-950">
                  Profile information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Basic information about this team member.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <InfoItem
                  icon={<UserRound size={17} />}
                  label="Full name"
                  value={user.name}
                />

                <InfoItem
                  icon={<Mail size={17} />}
                  label="Email address"
                  value={user.email}
                />

                <InfoItem
                  icon={<CalendarDays size={17} />}
                  label="Joined"
                  value={user.joined}
                />

                <InfoItem
                  icon={<Clock3 size={17} />}
                  label="Last active"
                  value={user.lastActive}
                />
              </div>
            </section>

            {/* Permissions */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-950">
                    Permissions
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Access granted based on this member&apos;s role.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800">
                  <RoleIcon size={16} />
                  {user.role}
                </span>
              </div>

              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">
                  {user.role} access
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {role.description}
                </p>
              </div>

              {/* Permission list intentionally kept hidden */}
            </section>

            {/* Activity */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
              <div>
                <h2 className="text-base font-semibold text-gray-950">
                  Recent activity
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Recent activity from this team member.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                {user?.lastActive && user.lastActive !== "—" ? (
                  <ActivityItem
                    title="Profile last updated"
                    description="This is the latest activity timestamp available in the team profile."
                    time={user.lastActive}
                  />
                ) : null}

                {user?.joined && user.joined !== "—" ? (
                  <ActivityItem
                    title="Team member joined"
                    description="Team member profile was created."
                    time={user.joined}
                  />
                ) : null}

                {(!user?.lastActive || user.lastActive === "—") &&
                (!user?.joined || user.joined === "—") ? (
                  <p className="text-sm text-gray-500">
                    No activity history is available for this team member.
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          {/* Right */}
          <aside className="space-y-6">
            {/* Role card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Current role
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <RoleIcon size={20} />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-950">
                    {user.role}
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500">
                    {role.description}
                  </p>
                </div>
              </div>

              {canEdit && (
                <Link
                  href={`/team/${user.id}/edit`}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Edit3 size={15} />
                  Change role
                </Link>
              )}
            </section>

            {/* Status */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Account status
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Active</p>

                  <p className="mt-1 text-xs text-gray-500">
                    Member has access to the dashboard.
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                  <Check size={17} className="text-gray-700" />
                </div>
              </div>
            </section>

            {/* Danger zone */}
            {canRemove && user.id !== currentUserId && (
              <section className="rounded-2xl border border-red-100 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Danger zone
                </p>

                <h3 className="mt-3 text-sm font-semibold text-gray-950">
                  Remove team member
                </h3>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Remove this person from your gym team. They will lose access
                  to the dashboard.
                </p>

                <button
                  onClick={() => setShowRemoveModal(true)}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Remove member
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Remove modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 size={19} />
              </div>

              <button
                onClick={() => {
                  if (!isRemoving) {
                    setShowRemoveModal(false)
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-gray-950">
              Remove team member?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Are you sure you want to remove{" "}
              <span className="font-medium text-gray-900">{user.name}</span>{" "}
              from your team? This action will remove their dashboard access.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  if (!isRemoving) {
                    setShowRemoveModal(false)
                  }
                }}
                disabled={isRemoving}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemoving ? "Removing..." : "Remove member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | undefined
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>

        <p className="mt-1 truncate text-sm font-medium text-gray-900">
          {value}
        </p>
      </div>
    </div>
  )
}

function ActivityItem({
  title,
  description,
  time,
}: {
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex gap-3">
      <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
        <div className="h-2 w-2 rounded-full bg-gray-700" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-900">{title}</p>

          <span className="text-xs text-gray-400">{time}</span>
        </div>

        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}
