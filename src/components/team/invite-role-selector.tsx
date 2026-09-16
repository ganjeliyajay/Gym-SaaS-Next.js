"use client"

import { ShieldCheck, BriefcaseBusiness, Dumbbell } from "lucide-react"

type Role = "Admin" | "Manager" | "Trainer"

type InviteRoleSelectorProps = {
  role: Role
  onRoleChange: (role: Role) => void
}

const roles = [
  {
    value: "Admin" as Role,
    label: "Admin",
    description: "Full access to gym management",
    icon: ShieldCheck,
  },
  {
    value: "Manager" as Role,
    label: "Manager",
    description: "Manage gym operations",
    icon: BriefcaseBusiness,
  },
  {
    value: "Trainer" as Role,
    label: "Trainer",
    description: "Calendar & settings access",
    icon: Dumbbell,
  },
]

export default function InviteRoleSelector({
  role,
  onRoleChange,
}: InviteRoleSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Role
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        {roles.map((item) => {
          const Icon = item.icon
          const selected = role === item.value

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onRoleChange(item.value)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-gray-950 bg-gray-50 ring-1 ring-gray-950"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    selected
                      ? "bg-gray-950 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Icon size={17} />
                </div>

                <span className="text-sm font-semibold text-gray-900">
                  {item.label}
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                {item.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
