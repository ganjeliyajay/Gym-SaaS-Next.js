import Link from "next/link"
import { CalendarDays, Dumbbell, UserCheck, UserPlus } from "lucide-react"

export default function QuickActions() {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold">Quick Actions</h2>

        <p className="mt-1 text-xs text-slate-400">
          Common actions you may need
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          href="/members/create"
          icon={<UserPlus size={19} />}
          title="Add Member"
          description="Create a new member"
        />

        <QuickAction
          href="/calendar/classes/create"
          icon={<CalendarDays size={19} />}
          title="Create Class"
          description="Schedule a new class"
        />

        <QuickAction
          href="/check-in"
          icon={<UserCheck size={19} />}
          title="Check-in"
          description="Record member attendance"
        />

        <QuickAction
          href="/products/create"
          icon={<Dumbbell size={19} />}
          title="Add Product"
          description="Add gym inventory"
        />
      </div>
    </section>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold">{title}</p>

        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {description}
        </p>
      </div>
    </Link>
  )
}
