"use client"

import { ShieldCheck, BriefcaseBusiness, Dumbbell } from "lucide-react"

type TeamRoleOverviewProps = {
  admins: number
  managers: number
  trainers: number
}

export default function TeamRoleOverview({
  admins,
  managers,
  trainers,
}: TeamRoleOverviewProps) {
  const roles = [
    {
      role: "Admin",
      description: "Full access to gym management and team controls.",
      count: admins,
      icon: ShieldCheck,
    },
    {
      role: "Manager",
      description: "Manage gym operations without team invite/remove access.",
      count: managers,
      icon: BriefcaseBusiness,
    },
    {
      role: "Trainer",
      description: "Access to calendar and gym settings.",
      count: trainers,
      icon: Dumbbell,
    },
  ]

  return (
    <div className="mb-7">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-950">
          Roles & Permissions
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Overview of your team roles and their access levels.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => {
          const Icon = role.icon

          return (
            <div
              key={role.role}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <Icon size={19} className="text-gray-700" />
                </div>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {role.count} {role.count === 1 ? "member" : "members"}
                </span>
              </div>

              <h3 className="mt-4 text-base font-semibold text-gray-950">
                {role.role}
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                {role.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
