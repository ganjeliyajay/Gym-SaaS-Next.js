"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Dumbbell,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { useEffect, useState } from "react"

import { supabase } from "@/lib/supabase"
import { isValidRole, type UserRole } from "@/lib/auth/roles"
import { useToast } from "@/components/ui/toast"

type Role = "Admin" | "Manager" | "Trainer"

type UserType = {
  name: string
  email: string
  role: Role
}

const roleData = {
  Admin: {
    icon: ShieldCheck,
    description: "Full access to all gym management features.",
    permissions: [
      "Manage all gym members",
      "Manage products and payments",
      "Create and manage classes",
      "Invite and remove team members",
      "Access all gym settings",
    ],
  },

  Manager: {
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

  Trainer: {
    icon: Dumbbell,
    description: "Focused access for trainers and class management.",
    permissions: [
      "View assigned classes",
      "Access calendar",
      "Manage assigned class details",
      "View relevant member information",
      "Access trainer settings",
    ],
  },
}

export default function EditTeamMemberPage() {
  const router = useRouter()
  const { id } = useParams()
  const { error: toastError, success: toastSuccess, loading: toastLoading, dismiss } = useToast()

  const memberId = Array.isArray(id) ? id[0] : id

  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)

  const [checkingAccess, setCheckingAccess] = useState(true)

  const [role, setRole] = useState<Role>("Trainer")

  const [roleOpen, setRoleOpen] = useState(false)

  const [user, setUser] = useState<UserType | null>(null)

  const [name, setName] = useState("")

  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!memberId) return

    let mounted = true

    const loadData = async () => {
      try {
        setCheckingAccess(true)

        // -----------------------------------------
        // 1. Get logged-in user
        // -----------------------------------------
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          router.replace("/login")
          return
        }

        // -----------------------------------------
        // 2. Get logged-in user's profile
        // -----------------------------------------
        const { data: currentUserProfile, error: currentUserError } =
          await supabase
            .from("profiles")
            .select("role, gym_id")
            .eq("id", authUser.id)
            .single()

        if (
          currentUserError ||
          !currentUserProfile ||
          !isValidRole(currentUserProfile.role)
        ) {
          router.replace("/")
          return
        }

        // -----------------------------------------
        // 3. Only Admin can edit team members
        // -----------------------------------------
        if (currentUserProfile.role !== "admin") {
          router.replace("/team")
          return
        }

        if (mounted) {
          setCurrentRole(currentUserProfile.role)
        }

        // -----------------------------------------
        // 4. Get selected team member
        // Same gym + team role only
        // -----------------------------------------
        const { data: memberData, error: memberError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, gym_id")
          .eq("id", memberId)
          .eq("gym_id", currentUserProfile.gym_id)
          .in("role", ["admin", "manager", "trainer"])
          .single()

        if (memberError || !memberData) {
          console.error(memberError?.message || "Team member not found")

          router.replace("/team")
          return
        }

        // -----------------------------------------
        // 5. Convert database role to UI role
        // -----------------------------------------
        const displayRole: Role =
          memberData.role === "admin"
            ? "Admin"
            : memberData.role === "manager"
              ? "Manager"
              : "Trainer"

        const memberName = memberData.full_name || ""

        const memberEmail = memberData.email || ""

        const member: UserType = {
          name: memberName,
          email: memberEmail,
          role: displayRole,
        }

        // -----------------------------------------
        // 6. Set fetched data into fields
        // -----------------------------------------
        if (mounted) {
          setUser(member)

          setName(memberName)
          setEmail(memberEmail)
          setRole(displayRole)

          setCheckingAccess(false)
        }
      } catch (error) {
        console.error("Failed to load team member:", error)

        router.replace("/team")
      } finally {
        if (mounted) {
          setCheckingAccess(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [memberId, router])

  const selectedRole = roleData[role]

  const RoleIcon = selectedRole.icon

  const handleSave = async () => {
    if (!memberId || !user || saving) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      toastError("Full name is required.")
      return
    }

    if (!trimmedEmail) {
      toastError("Email address is required.")
      return
    }

    setSaving(true)
    const toastId = toastLoading("Saving team member changes...")

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !authUser) {
        dismiss(toastId)
        router.replace("/login")
        return
      }

      const { data: currentProfile, error: currentProfileError } =
        await supabase
          .from("profiles")
          .select("gym_id, role")
          .eq("id", authUser.id)
          .single()

      if (
        currentProfileError ||
        !currentProfile ||
        currentProfile.role !== "admin"
      ) {
        dismiss(toastId)
        toastError("You do not have permission to edit team members.")
        return
      }

      const { data: targetProfile, error: targetError } = await supabase
        .from("profiles")
        .select("id, gym_id, role")
        .eq("id", memberId)
        .eq("gym_id", currentProfile.gym_id)
        .in("role", ["admin", "manager", "trainer"])
        .single()

      if (targetError || !targetProfile) {
        dismiss(toastId)
        toastError("Team member not found.")
        return
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          email: trimmedEmail,
          role: role.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetProfile.id)
        .eq("gym_id", currentProfile.gym_id)

      if (updateError) {
        dismiss(toastId)
        toastError("We couldn't save the team member. Please try again.")
        return
      }

      dismiss(toastId)
      toastSuccess("Team member updated successfully.")
      router.replace(`/team/${targetProfile.id}`)
    } catch (err) {
      dismiss(toastId)
      console.error("Failed to update team member:", err)
      toastError("Something went wrong while saving the team member.")
    } finally {
      setSaving(false)
    }
  }

  if (checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-sm text-gray-500">Checking access...</div>
      </div>
    )
  }

  if (currentRole !== "admin") {
    return null
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/team"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
        >
          <ArrowLeft size={17} />
          Back to Team
        </Link>

        {/* Header */}
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <span>Team</span>
            <span>/</span>
            <span>{user?.name}</span>
            <span>/</span>
            <span className="text-gray-900">Edit</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Edit team member
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update the member&apos;s information and access permissions.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
            {/* Profile heading */}
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                {user?.name.charAt(0).toUpperCase() || "U"}
              </div>

              <div>
                <h2 className="text-base font-semibold text-gray-950">
                  Profile information
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Update the basic details of this team member.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Full name
                </label>

                <div className="relative">
                  <UserRound
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
                  />
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  This email is used to sign in to the dashboard.
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Role
                </label>

                <div className="relative">
                  {/* Selected Role */}
                  <button
                    type="button"
                    onClick={() => setRoleOpen(!roleOpen)}
                    className="flex min-h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-left transition hover:border-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                        <RoleIcon size={16} />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {role}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {selectedRole.description}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      size={17}
                      className={`text-gray-400 transition ${
                        roleOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Role Dropdown */}
                  {roleOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                      {(Object.keys(roleData) as Role[]).map((item) => {
                        const Icon = roleData[item].icon

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setRole(item)
                              setRoleOpen(false)
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition ${
                              role === item ? "bg-gray-100" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                              <Icon size={17} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-500">
                                {roleData[item].description}
                              </p>
                            </div>

                            {role === item && (
                              <Check
                                size={17}
                                className="shrink-0 text-gray-800"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Changing the role changes what this person can access.
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="my-7 h-px bg-gray-100" />

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/team"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </section>

          {/* Permission preview */}
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Permission preview
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <RoleIcon size={20} />
              </div>

              <div>
                <h3 className="text-base font-semibold text-gray-950">
                  {role}
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">Access level</p>
              </div>
            </div>

            <div className="my-5 h-px bg-gray-100" />

            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Permissions
            </p>

            <div className="space-y-3">
              {selectedRole.permissions.map((permission) => (
                <div key={permission} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
                    <Check size={11} strokeWidth={3} />
                  </div>

                  <p className="text-sm leading-5 text-gray-600">
                    {permission}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <p className="text-xs leading-5 text-gray-500">
                This is a preview of the permissions that will apply after
                saving the changes.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
