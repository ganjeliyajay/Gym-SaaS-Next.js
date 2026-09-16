"use client"

import { useState } from "react"
import InviteRoleSelector from "./invite-role-selector"
import PermissionPreview from "./permission-preview"

type Role = "Admin" | "Manager" | "Trainer"

export default function InviteTeamForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("Trainer")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Backend invitation later
    console.log({
      name,
      email,
      role,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-950">
            Member Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter the details of the person you want to invite.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
              required
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-950">Select Role</h2>

          <p className="mt-1 text-sm text-gray-500">
            Choose the access level for this team member.
          </p>
        </div>

        <InviteRoleSelector role={role} onRoleChange={setRole} />
      </div>

      <PermissionPreview role={role} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="h-11 rounded-xl bg-gray-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
        >
          Send Invitation
        </button>
      </div>
    </form>
  )
}
