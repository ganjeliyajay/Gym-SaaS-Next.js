"use client"

import { Users } from "lucide-react"

type TeamEmptyStateProps = {
  title?: string
  description?: string
}

export default function TeamEmptyState({
  title = "No team members found",
  description = "Try changing your search or filters.",
}: TeamEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Users size={21} className="text-gray-500" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>

      <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
        {description}
      </p>
    </div>
  )
}
