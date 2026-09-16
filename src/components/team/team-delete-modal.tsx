"use client"

import { Trash2, X, AlertTriangle } from "lucide-react"

type TeamDeleteModalProps = {
  open: boolean
  isDeleting?: boolean
  memberName?: string
  onClose: () => void
  onDelete: () => void
}

export default function TeamDeleteModal({
  open,
  memberName = "",
  onClose,
  onDelete,
  isDeleting,
}: TeamDeleteModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="px-6 pb-6 pt-7 sm:px-7">
          {/* Icon */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Remove team member?
          </h2>

          {/* Description */}
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Are you sure you want to remove{" "}
            <span className="font-medium text-gray-800">{memberName}</span> from
            your team? This action cannot be undone.
          </p>

          {/* Warning */}
          <div className="mt-5 flex gap-3 rounded-xl border border-red-100 bg-red-50/70 p-3.5">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

            <p className="text-xs leading-5 text-red-700">
              The team member will lose access to this gym immediately.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="h-10 rounded-lg bg-red-600 px-5 text-sm font-medium text-white transition hover:bg-red-700"
            >
              {isDeleting ? "Removing..." : "Remove Member"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
