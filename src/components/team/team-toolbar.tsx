"use client"

import { Search, SlidersHorizontal } from "lucide-react"

type TeamToolbarProps = {
  search: string
  roleFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onRoleChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export default function TeamToolbar({
  search,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: TeamToolbarProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search team members..."
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative">
          <SlidersHorizontal
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <select
            value={roleFilter}
            onChange={(e) => onRoleChange(e.target.value)}
            className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-700 outline-none focus:border-gray-400 sm:w-40"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Trainer">Trainer</option>
          </select>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-400 sm:w-40"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
        </select>
      </div>
    </div>
  )
}
