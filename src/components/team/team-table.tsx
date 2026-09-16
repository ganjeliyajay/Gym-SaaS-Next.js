"use client"

import { useState } from "react"

type Role = "Admin" | "Manager" | "Trainer"
type Status = "Active" | "Pending" | "Inactive" | "Suspended"

type TeamMember = {
  id: string
  name: string
  email: string
  role: Role
  status: Status
  joined: string
  avatar: string
}

type TeamTableProps = {
  members: TeamMember[]
  onRemove: (memberId: string) => void
  onEdit: (memberId: string) => void
}

const roleStyles: Record<Role, string> = {
  Admin:
    "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  Manager:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  Trainer:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
}

const statusStyles: Record<Status, string> = {
  Active:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  Pending:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Inactive:
    "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200",
  Suspended:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function formatJoinedDate(date: string) {
  if (!date) return "—"

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return date
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function TeamTable({
  members,
  onRemove,
  onEdit,
}: TeamTableProps) {
  const [selectedMember, setSelectedMember] =
    useState<TeamMember | null>(null)

  const closeModal = () => {
    setSelectedMember(null)
  }

  const handleEdit = (memberId: string) => {
    setSelectedMember(null)
    onEdit(memberId)
  }

  const handleRemove = () => {
    if (!selectedMember) return

    const memberId = selectedMember.id

    setSelectedMember(null)

    onRemove(memberId)
  }

  return (
    <>
      {/* ====================================================== */}
      {/* DESKTOP TEAM TABLE */}
      {/* ====================================================== */}

      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              {/* ================================================== */}
              {/* TABLE HEADER */}
              {/* ================================================== */}

              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="w-[34%] px-6 py-4 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Member
                    </span>
                  </th>

                  <th className="w-[16%] px-6 py-4 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Role
                    </span>
                  </th>

                  <th className="w-[16%] px-6 py-4 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Status
                    </span>
                  </th>

                  <th className="w-[18%] px-6 py-4 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Joined
                    </span>
                  </th>

                  <th className="w-[16%] px-6 py-4 text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                      Action
                    </span>
                  </th>
                </tr>
              </thead>

              {/* ================================================== */}
              {/* TABLE BODY */}
              {/* ================================================== */}

              <tbody className="divide-y divide-gray-100">
                {members.map((member) => {
                  const initials = getInitials(member.name)

                  return (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="group cursor-pointer transition-all duration-150 hover:bg-gray-50/80"
                    >
                      {/* ================================================= */}
                      {/* MEMBER */}
                      {/* ================================================= */}

                      <td className="px-6 py-4">
                        <div className="flex min-w-0 items-center gap-3.5">
                          {/* Avatar */}

                          <div className="relative shrink-0">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-700 shadow-sm">
                              {member.avatar &&
                              (member.avatar.startsWith("http://") ||
                                member.avatar.startsWith("https://")) ? (
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials
                              )}
                            </div>

                            {member.status === "Active" && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                            )}
                          </div>

                          {/* User information */}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {member.name || "Unknown User"}
                            </p>

                            <p className="mt-0.5 truncate text-[13px] text-gray-500">
                              {member.email || "No email available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* ================================================= */}
                      {/* ROLE */}
                      {/* ================================================= */}

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${roleStyles[member.role]}`}
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />

                          {member.role}
                        </span>
                      </td>

                      {/* ================================================= */}
                      {/* STATUS */}
                      {/* ================================================= */}

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[member.status]}`}
                        >
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full bg-current ${
                              member.status === "Pending"
                                ? "animate-pulse"
                                : ""
                            }`}
                          />

                          {member.status}
                        </span>
                      </td>

                      {/* ================================================= */}
                      {/* JOINED */}
                      {/* ================================================= */}

                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {formatJoinedDate(member.joined)}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-400">
                            Joined date
                          </p>
                        </div>
                      </td>

                      {/* ================================================= */}
                      {/* EDIT BUTTON */}
                      {/* ================================================= */}

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleEdit(member.id)
                          }}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-150 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 hover:shadow active:scale-[0.98]"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>

                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {/* ================================================== */}
                {/* EMPTY STATE */}
                {/* ================================================== */}

                {members.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                          <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>

                        <p className="text-sm font-semibold text-gray-900">
                          No team members found
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Try changing your search or filters,
                          or invite a new team member.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ====================================================== */}
          {/* TABLE FOOTER */}
          {/* ====================================================== */}

          {members.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/40 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-400">
                {members.length}{" "}
                {members.length === 1
                  ? "team member"
                  : "team members"}
              </p>

              <p className="text-xs text-gray-400">
                Click a member to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================== */}
      {/* MEMBER DETAIL MODAL */}
      {/* ====================================================== */}

      {selectedMember && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[3px]"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-detail-title"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* ================================================== */}
            {/* MODAL HEADER */}
            {/* ================================================== */}

            <div className="relative border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white px-5 pb-6 pt-6 sm:px-7">
              {/* Close */}

              <button
                type="button"
                onClick={closeModal}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close member details"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>

              {/* Profile */}

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 text-xl font-bold text-gray-700 shadow-lg">
                    {selectedMember.avatar &&
                    (selectedMember.avatar.startsWith("http://") ||
                      selectedMember.avatar.startsWith("https://")) ? (
                      <img
                        src={selectedMember.avatar}
                        alt={selectedMember.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(selectedMember.name)
                    )}
                  </div>

                  {selectedMember.status === "Active" && (
                    <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                  )}
                </div>

                <h2
                  id="member-detail-title"
                  className="text-xl font-bold tracking-tight text-gray-950"
                >
                  {selectedMember.name}
                </h2>

                <p className="mt-1 max-w-[280px] truncate text-sm text-gray-500">
                  {selectedMember.email}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${roleStyles[selectedMember.role]}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-70" />

                    {selectedMember.role}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyles[selectedMember.status]}`}
                  >
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />

                    {selectedMember.status}
                  </span>
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* MEMBER INFORMATION */}
            {/* ================================================== */}

            <div className="px-5 py-6 sm:px-7">
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Member information
                </p>

                <h3 className="mt-1 text-base font-semibold text-gray-900">
                  Account details
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Email */}

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        width="20"
                        height="16"
                        x="2"
                        y="4"
                        rx="2"
                      />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Email
                  </p>

                  <p className="mt-1 truncate text-sm font-medium text-gray-800">
                    {selectedMember.email || "Not available"}
                  </p>
                </div>

                {/* Role */}

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Role
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {selectedMember.role}
                  </p>
                </div>

                {/* Status */}

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Status
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {selectedMember.status}
                  </p>
                </div>

                {/* Joined */}

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        width="18"
                        height="18"
                        x="3"
                        y="4"
                        rx="2"
                      />
                      <path d="M16 2v4" />
                      <path d="M8 2v4" />
                      <path d="M3 10h18" />
                    </svg>
                  </div>

                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Joined
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {formatJoinedDate(selectedMember.joined)}
                  </p>
                </div>
              </div>
            </div>

            {/* ================================================== */}
            {/* MODAL ACTIONS */}
            {/* ================================================== */}

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Close
              </button>

              {/* Edit */}

              <button
                type="button"
                onClick={() => handleEdit(selectedMember.id)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>

                Edit Member
              </button>

              {/* Remove */}

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.99]"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v5" />
                  <path d="M14 11v5" />
                </svg>

                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}