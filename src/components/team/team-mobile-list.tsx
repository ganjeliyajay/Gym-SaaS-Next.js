"use client"

import TeamActionMenu from "./team-action-menu"

type TeamMember = {
  id: string
  name: string
  email: string
  role: "Admin" | "Manager" | "Trainer"
  status: "Active" | "Pending" | "Inactive" | "Suspended"
  joined: string
  avatar: string
}

type TeamMobileListProps = {
  members: TeamMember[]
  openMenu: string | null
  onMenuToggle: (id: string) => void
  onRemove: (memberId: string) => void
}

export default function TeamMobileList({
  members,
  openMenu,
  onMenuToggle,
  onRemove,
}: TeamMobileListProps) {
  return (
    <div className="space-y-3 lg:hidden">
      {members.map((member) => (
        <div
          key={member.id}
          className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {member.name
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {member.name}
                </p>

                <p className="truncate text-sm text-gray-500">{member.email}</p>
              </div>
            </div>

            <TeamActionMenu
              memberId={String(member.id)}
              open={openMenu === String(member.id)}
              onToggle={() =>
                onMenuToggle(
                  openMenu === String(member.id) ? "" : String(member.id),
                )
              }
              onRemove={onRemove}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {member.role}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                member.status === "Active"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {member.status}
            </span>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400">Joined</p>

            <p className="mt-1 text-sm text-gray-600">{member.joined}</p>
          </div>
        </div>
      ))}

      {members.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500">
          No team members found.
        </div>
      )}
    </div>
  )
}
