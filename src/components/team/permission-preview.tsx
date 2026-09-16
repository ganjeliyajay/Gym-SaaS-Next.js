"use client"

import {
  ShieldCheck,
  CalendarDays,
  Settings,
  UserPlus,
  UserMinus,
  Users,
} from "lucide-react"

type Role = "Admin" | "Manager" | "Trainer"

type PermissionPreviewProps = {
  role: Role
}

const permissions = {
  Admin: [
    {
      label: "Full gym access",
      icon: ShieldCheck,
    },
    {
      label: "Manage team members",
      icon: Users,
    },
    {
      label: "Invite team members",
      icon: UserPlus,
    },
    {
      label: "Remove team members",
      icon: UserMinus,
    },
    {
      label: "Calendar & classes",
      icon: CalendarDays,
    },
    {
      label: "Settings",
      icon: Settings,
    },
  ],

  Manager: [
    {
      label: "Full gym management",
      icon: ShieldCheck,
    },
    {
      label: "Manage gym members",
      icon: Users,
    },
    {
      label: "Calendar & classes",
      icon: CalendarDays,
    },
    {
      label: "Settings",
      icon: Settings,
    },
  ],

  Trainer: [
    {
      label: "Calendar & classes",
      icon: CalendarDays,
    },
    {
      label: "Settings",
      icon: Settings,
    },
  ],
}

export default function PermissionPreview({ role }: PermissionPreviewProps) {
  const rolePermissions = permissions[role]

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Permission Preview
        </h3>

        <p className="mt-1 text-xs text-gray-500">
          Access that will be available for the selected role.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rolePermissions.map((permission) => {
          const Icon = permission.icon

          return (
            <div
              key={permission.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Icon size={16} className="text-gray-600" />
              </div>

              <span className="text-sm text-gray-700">{permission.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
