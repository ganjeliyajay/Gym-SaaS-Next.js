"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import TeamHeader from "@/components/team/team-header"
import TeamStats from "@/components/team/team-stats"
import TeamRoleOverview from "@/components/team/team-role-overview"
import TeamToolbar from "@/components/team/team-toolbar"
import TeamTable from "@/components/team/team-table"
import TeamMobileList from "@/components/team/team-mobile-list"
import TeamEmptyState from "@/components/team/team-empty-state"
import TeamFooter from "@/components/team/team-footer"
import TeamDeleteModal from "@/components/team/team-delete-modal"

import { supabase } from "@/lib/supabase"
import {
  isValidRole,
  ROLE_PERMISSIONS,
  type UserRole,
} from "@/lib/auth/roles"
import { useToast } from "@/components/ui/toast"

type Role = "Admin" | "Manager" | "Trainer"

type Status = "Active" | "Pending" | "Inactive" | "Suspended"

export type TeamMember = {
  id: string
  name: string
  email: string
  role: Role
  status: Status
  joined: string
  avatar: string
}

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  gym_id: string
  role: string
  status: "active" | "pending" | "inactive" | "suspended"
  avatar_url: string | null
  created_at: string
}

const getStatusClassName = (status: Status) =>
  status === "Active"
    ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
    : "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-200"

export default function TeamPage() {
  const router = useRouter()
  const { success, error, warning } = useToast()

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"All" | Role>("All")
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All")

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [currentGymId, setCurrentGymId] = useState<string | null>(null)

  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let mounted = true

    const getTeamMembers = async () => {
      try {
        setLoading(true)

        /*
         * ---------------------------------------------------------
         * 1. Get authenticated user
         * ---------------------------------------------------------
         */
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authData.user) {
          console.error(
            "Authentication error:",
            authError?.message || "User not found",
          )

          if (mounted) {
            router.replace("/login")
          }

          return
        }

        const userId = authData.user.id

        if (mounted) {
          setCurrentUserId(userId)
        }

        /*
         * ---------------------------------------------------------
         * 2. Get current user's profile
         * ---------------------------------------------------------
         */
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("gym_id, role, status")
          .eq("id", userId)
          .single()

        if (profileError || !profile) {
          console.error(
            "Profile error:",
            profileError?.message || "Profile not found",
          )

          if (mounted) {
            router.replace("/dashboard")
          }

          return
        }

        /*
         * ---------------------------------------------------------
         * 3. Validate current user's role
         * ---------------------------------------------------------
         */
        if (!isValidRole(profile.role)) {
          console.error("Invalid user role:", profile.role)

          if (mounted) {
            router.replace("/dashboard")
          }

          return
        }

        const userRole = profile.role as UserRole
        const gymId = profile.gym_id

        if (mounted) {
          setCurrentRole(userRole)
          setCurrentGymId(gymId)
        }

        /*
         * ---------------------------------------------------------
         * 4. Only Admin and Manager can access Team page
         * ---------------------------------------------------------
         */
        if (userRole !== "admin" && userRole !== "manager") {
          if (mounted) {
            router.replace("/dashboard")
          }

          return
        }

        /*
         * ---------------------------------------------------------
         * 5. Fetch real team members from Supabase
         *
         * IMPORTANT:
         * avatar_url + created_at are intentionally selected
         * because the UI uses both fields below.
         * ---------------------------------------------------------
         */
        const {
          data: teamData,
          error: teamError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              email,
              full_name,
              gym_id,
              role,
              status,
              avatar_url,
              created_at
            `,
          )
          .eq("gym_id", gymId)
          .in("role", ["admin", "manager", "trainer"])
          .order("created_at", { ascending: false })

        if (teamError) {
          console.error("Team query error:", teamError)

          if (mounted) {
            error("Unable to load team members. Please try again.")
          }

          return
        }

        /*
         * ---------------------------------------------------------
         * 6. Convert DB profiles into UI TeamMember objects
         * ---------------------------------------------------------
         */
        const formattedMembers: TeamMember[] =
          (teamData as Profile[] | null)
            ?.filter((member) => {
              return (
                member.gym_id === gymId &&
                (member.role === "admin" ||
                  member.role === "manager" ||
                  member.role === "trainer")
              )
            })
            .map((member) => {
              /*
               * DB role -> UI role
               */
              const displayRole: Role =
                member.role === "admin"
                  ? "Admin"
                  : member.role === "manager"
                    ? "Manager"
                    : "Trainer"

              /*
               * Safe member name
               */
              const name = member.full_name?.trim() || "Unknown"

              /*
               * Use real avatar if available.
               * Otherwise generate initials.
               */
              const avatar = member.avatar_url
                ? member.avatar_url
                : name
                  .split(" ")
                  .filter(Boolean)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

              /*
               * DB status -> UI status
               */
              const displayStatus: Status =
                member.status === "pending"
                  ? "Pending"
                  : member.status === "inactive"
                    ? "Inactive"
                    : member.status === "suspended"
                      ? "Suspended"
                      : "Active"

              return {
                id: member.id,
                name,
                email: member.email || "",
                role: displayRole,
                status: displayStatus,
                joined: member.created_at,
                avatar,
              }
            }) ?? []

        if (mounted) {
          setMembers(formattedMembers)
        }
      } catch (err) {
        console.error("Failed to load team members:", err)

        if (mounted) {
          error("Something went wrong while loading the team.")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getTeamMembers()

    return () => {
      mounted = false
    }
  }, [router, error])

  /*
   * ---------------------------------------------------------
   * Search + Role + Status filters
   * ---------------------------------------------------------
   */
  const filteredMembers = useMemo(() => {
    const searchValue = search.toLowerCase().trim()

    return members.filter((member) => {
      const matchesSearch =
        !searchValue ||
        member.name.toLowerCase().includes(searchValue) ||
        member.email.toLowerCase().includes(searchValue)

      const matchesRole =
        roleFilter === "All" || member.role === roleFilter

      const matchesStatus =
        statusFilter === "All" || member.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, search, roleFilter, statusFilter])

  /*
   * ---------------------------------------------------------
   * Dashboard counts
   * ---------------------------------------------------------
   */
  const adminCount = useMemo(
    () => members.filter((member) => member.role === "Admin").length,
    [members],
  )

  const managerCount = useMemo(
    () => members.filter((member) => member.role === "Manager").length,
    [members],
  )

  const trainerCount = useMemo(
    () => members.filter((member) => member.role === "Trainer").length,
    [members],
  )

  /*
   * ---------------------------------------------------------
   * Permission
   * ---------------------------------------------------------
   */
  const canRemove =
    currentRole !== null &&
    ROLE_PERMISSIONS[currentRole].removeTeamMember

  /*
   * ---------------------------------------------------------
   * Open delete modal
   * ---------------------------------------------------------
   */
  const handleRemoveRequest = (memberId: string) => {
    if (!canRemove) {
      warning("You do not have permission to remove team members.")
      return
    }

    /*
     * Never allow deleting yourself
     */
    if (memberId === currentUserId) {
      warning("You cannot remove yourself from the team.")
      return
    }

    const member = members.find((item) => item.id === memberId)

    if (!member) {
      error("Team member not found.")
      return
    }

    setDeleteMember(member)
    setOpenMenu(null)
  }

  /*
   * ---------------------------------------------------------
   * Close delete modal
   * ---------------------------------------------------------
   */
  const onClose = () => {
    if (isDeleting) {
      return
    }

    setDeleteMember(null)
    setOpenMenu(null)
  }

  /*
   * ---------------------------------------------------------
   * Delete team member
   * ---------------------------------------------------------
   */
  const onDelete = async (deleteId: string) => {
    if (!canRemove) {
      warning("You do not have permission to remove team members.")
      return
    }

    /*
     * Never allow self delete
     */
    if (deleteId === currentUserId) {
      warning("You cannot remove yourself from the team.")
      return
    }

    /*
     * Gym ID is required
     */
    if (!currentGymId) {
      error("Gym information not found.")
      return
    }

    try {
      setIsDeleting(true)

      /*
       * -------------------------------------------------------
       * 1. Verify target member
       * -------------------------------------------------------
       */
      const {
        data: targetMember,
        error: targetError,
      } = await supabase
        .from("profiles")
        .select("id, gym_id, role")
        .eq("id", deleteId)
        .single()

      if (targetError || !targetMember) {
        console.error("Target member error:", targetError)

        error("Team member not found.")
        return
      }

      /*
       * -------------------------------------------------------
       * 2. Make sure target belongs to same gym
       * -------------------------------------------------------
       */
      if (targetMember.gym_id !== currentGymId) {
        error("You cannot remove a member from another gym.")
        return
      }

      /*
       * -------------------------------------------------------
       * 3. Make sure target is actually a team member
       * -------------------------------------------------------
       */
      if (
        targetMember.role !== "admin" &&
        targetMember.role !== "manager" &&
        targetMember.role !== "trainer"
      ) {
        error("This user is not a team member.")
        return
      }

      /*
       * -------------------------------------------------------
       * 4. Delete profile
       * -------------------------------------------------------
       */
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deleteId)
        .eq("gym_id", currentGymId)

      if (deleteError) {
        console.error("Delete team member error:", deleteError)

        error(
          "We couldn't remove the team member. Please try again.",
        )

        return
      }

      /*
       * -------------------------------------------------------
       * 5. Update local UI immediately
       * -------------------------------------------------------
       */
      setMembers((currentMembers) =>
        currentMembers.filter((member) => member.id !== deleteId),
      )

      setDeleteMember(null)
      setOpenMenu(null)

      success("Team member removed successfully.")
    } catch (err) {
      console.error("Failed to remove team member:", err)

      error(
        "Something went wrong while removing the team member.",
      )
    } finally {
      setIsDeleting(false)
    }
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <TeamHeader />

        <TeamStats
          totalMembers={members.length}
          admins={adminCount}
          managers={managerCount}
          trainers={trainerCount}
         
        />

        <TeamRoleOverview
          admins={adminCount}
          managers={managerCount}
          trainers={trainerCount}
        />

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <TeamToolbar
              search={search}
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              onSearchChange={setSearch}
              onRoleChange={(value) =>
                setRoleFilter(value as "All" | Role)
              }
              onStatusChange={(value) =>
                setStatusFilter(value as "All" | Status)
              }
            />
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
              Loading team members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <TeamEmptyState />
          ) : (
            <>
              <TeamTable
                members={filteredMembers}
                onRemove={handleRemoveRequest}
                onEdit={(memberId) => {
                  router.push(`/team/${memberId}/edit`)
                }}
              />

              <TeamMobileList
                members={filteredMembers}
                openMenu={openMenu}
                onRemove={handleRemoveRequest}
                onMenuToggle={(id) => {
                  setOpenMenu((current) =>
                    current === id ? null : id,
                  )
                }}
              />

              {deleteMember && (
                <TeamDeleteModal
                  open={!!deleteMember}
                  isDeleting={isDeleting}
                  memberName={deleteMember.name}
                  onClose={onClose}
                  onDelete={() => onDelete(deleteMember.id)}
                />
              )}
            </>
          )}

          {/* <TeamFooter
            showing={filteredMembers.length}
            total={members.length}
          /> */}
        </section>
      </div>
    </main>
  )
}