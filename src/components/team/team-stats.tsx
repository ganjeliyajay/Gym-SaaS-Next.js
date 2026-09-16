"use client"

import { Users, ShieldCheck, Clock3, UserCheck } from "lucide-react"

type TeamStatsProps = {
  totalMembers: number
  admins: number
  managers: number
  trainers: number
}

export default function TeamStats({
  totalMembers,
  admins,
  managers,
  trainers,
}: TeamStatsProps) {
  const stats = [
    {
      label: "Total Members",
      value: totalMembers,
      icon: Users,
    },
    {
      label: "Admins",
      value: admins,
      icon: ShieldCheck,
    },
    {
      label: "Managers",
      value: managers,
      icon: UserCheck,
    },
    {
      label: "Trainers",
      value: trainers,
      icon: Users,
    },
  ]

  return (
    <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <Icon size={19} className="text-gray-700" />
              </div>
            </div>

            <p className="text-2xl font-semibold tracking-tight text-gray-950">
              {stat.value}
            </p>

            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}
