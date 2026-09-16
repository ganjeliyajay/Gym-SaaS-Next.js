"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"

import { supabase } from "@/lib/supabase"

type UserRole = "super_admin" | "admin" | "manager" | "trainer" | "member"

type SignupWaiver = {
  name?: string
  content?: string
  updatedAt?: string
}

type SignupForm = {
  id: string
  name: string
  slug: string
  status: string
  waiver: SignupWaiver | null
  updated_at: string | null
}

export default function WaiversPage() {
  const [forms, setForms] = useState<SignupForm[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    try {
      setError("")
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Your session has expired. Please login again.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym information could not be found.")
      }

      setRole(profile.role as UserRole)

      const { data, error: formsError } = await supabase
        .from("signup_forms")
        .select(
          `
            id,
            name,
            slug,
            status,
            waiver,
            updated_at
          `,
        )
        .eq("gym_id", profile.gym_id)
        .order("updated_at", {
          ascending: false,
        })

      if (formsError) {
        throw new Error(formsError.message)
      }

      setForms((data ?? []) as SignupForm[])
    } catch (err) {
      console.error("Waivers load error:", err)

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading waivers.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return forms
    }

    return forms.filter((form) => {
      const formName = form.name?.toLowerCase() || ""
      const waiverName = form.waiver?.name?.toLowerCase() || ""

      return formName.includes(query) || waiverName.includes(query)
    })
  }, [forms, search])

  const waiverForms = useMemo(() => {
    return filteredForms.filter((form) => form.waiver)
  }, [filteredForms])

  const noWaiverForms = useMemo(() => {
    return filteredForms.filter((form) => !form.waiver)
  }, [filteredForms])

  const totalWaivers = forms.filter((form) => form.waiver).length
  const activeForms = forms.filter((form) => form.status === "active").length

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading waivers...
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (role === "member") {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-semibold text-gray-950">
              Access denied
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              You do not have permission to manage gym waivers.
            </p>

            <Link
              href="/member"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <span>Management</span>
              <span>/</span>
              <span className="text-gray-900">Waivers</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-950 text-white">
                <FileSignature className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Waivers
                </h1>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Manage the legal waivers used by your signup forms.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<FileSignature className="h-5 w-5" />}
            label="Total Waivers"
            value={totalWaivers}
          />

          <StatCard
            icon={<FileText className="h-5 w-5" />}
            label="Signup Forms"
            value={forms.length}
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Active Forms"
            value={activeForms}
          />
        </div>

        {/* Search */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search waiver or signup form..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>

        {/* Active Waivers */}
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Configured Waivers
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Signup forms that currently have a waiver configured.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {waiverForms.length} configured
            </span>
          </div>

          {waiverForms.length === 0 ? (
            <EmptyState
              title="No waivers configured"
              description="No signup form currently has a waiver attached."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {waiverForms.map((form) => {
                const waiverName = form.waiver?.name || "Untitled Waiver"

                const updatedAt = form.waiver?.updatedAt || form.updated_at

                return (
                  <div
                    key={form.id}
                    className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-gray-950">
                            {waiverName}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              form.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {form.status === "active"
                              ? "Active Form"
                              : "Inactive Form"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          Used by{" "}
                          <span className="font-medium text-gray-700">
                            {form.name}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          Last updated {formatDate(updatedAt)}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/signup-forms/${form.id}/waiver`}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-950"
                    >
                      Manage Waiver
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Forms Without Waiver */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-gray-950">
                Signup Forms Without Waiver
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                These forms do not currently have a legal waiver attached.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {noWaiverForms.length} without waiver
            </span>
          </div>

          {noWaiverForms.length === 0 ? (
            <EmptyState
              title="All signup forms have waivers"
              description="Every visible signup form currently has a waiver configured."
              success
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {noWaiverForms.map((form) => (
                <div
                  key={form.id}
                  className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <XCircle className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-950">
                        {form.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        No waiver is currently attached to this signup form.
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/signup-forms/${form.id}/edit`}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    Configure Waiver
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer note */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
          <FileSignature className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

          <p className="leading-6">
            Waivers are currently stored with each signup form. The existing
            waiver editor remains the place where the waiver content is managed,
            while this page gives admins one central place to find every
            configured waiver.
          </p>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
        {value}
      </p>
    </div>
  )
}

function EmptyState({
  title,
  description,
  success = false,
}: {
  title: string
  description: string
  success?: boolean
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          success ? "bg-emerald-50" : "bg-gray-100"
        }`}
      >
        {success ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <FileText className="h-5 w-5 text-gray-400" />
        )}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-950">{title}</h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return "—"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
