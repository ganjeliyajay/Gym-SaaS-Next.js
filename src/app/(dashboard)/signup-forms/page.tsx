"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  FileText,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  XCircle,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type FormStatus = "Active" | "Inactive"

type Product = {
  id: string | number
  name: string
  price: number
  type?: string
}

type CustomerField = {
  id?: string
  label: string
  type?: string
  required?: boolean
}

type SignupForm = {
  id: string
  name: string
  slug: string
  status: FormStatus
  products: number

  // Optional fields kept here so this page remains compatible
  // with normalized signup form data used elsewhere.
  selected_products?: unknown
  customer_fields?: unknown
}

function normalizeProducts(value: unknown): Product[] {
  if (!Array.isArray(value)) return []

  const products: Product[] = []

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue

    const product = item as Record<string, unknown>

    products.push({
      id:
        typeof product.id === "string" || typeof product.id === "number"
          ? product.id
          : crypto.randomUUID(),
      name: typeof product.name === "string" ? product.name : "Unnamed Product",
      price:
        typeof product.price === "number"
          ? product.price
          : Number(product.price) || 0,
      type: typeof product.type === "string" ? product.type : "Product",
    })
  }

  return products
}

function normalizeCustomerFields(value: unknown): CustomerField[] {
  if (!Array.isArray(value)) return []

  const fields: CustomerField[] = []

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue

    const field = item as Record<string, unknown>

    fields.push({
      id: typeof field.id === "string" ? field.id : undefined,
      label:
        typeof field.label === "string"
          ? field.label
          : typeof field.name === "string"
            ? field.name
            : "Unnamed Field",
      type: typeof field.type === "string" ? field.type : "text",
      required: typeof field.required === "boolean" ? field.required : false,
    })
  }

  return fields
}

export default function SignupFormsPage() {
  const toast = useToast()

  const [forms, setForms] = useState<SignupForm[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"All" | FormStatus>("All")
  const [selectedForm, setSelectedForm] = useState<SignupForm | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSignupForms()
  }, [])

  const loadSignupForms = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User not found:", userError)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        console.error("Gym not found:", profileError)
        return
      }

      const { data, error } = await supabase
        .from("signup_forms")
        .select("id, name, slug, status, selected_products, customer_fields")
        .eq("gym_id", profile.gym_id)
        .order("created_at", {
          ascending: false,
        })

      if (error) {
        console.error("Signup forms fetch error:", error)
        toast.error("We couldn't load signup forms. Please try again.")
        return
      }

      const formattedForms: SignupForm[] = (data || []).map((form) => {
        const products = normalizeProducts(form.selected_products)

        // Keep customer fields normalized here so TypeScript
        // has a concrete CustomerField[] where needed.
        const customerFields = normalizeCustomerFields(form.customer_fields)

        return {
          id: form.id,
          name: form.name,
          slug: form.slug,
          status: form.status === "active" ? "Active" : "Inactive",
          products: products.length,

          selected_products: form.selected_products,
          customer_fields: customerFields,
        }
      })

      setForms(formattedForms)
    } catch (error) {
      console.error("Signup forms error:", error)

      toast.error("Something went wrong while loading signup forms.")
    } finally {
      setLoading(false)
    }
  }

  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      const searchValue = search.toLowerCase().trim()

      const matchesSearch =
        form.name.toLowerCase().includes(searchValue) ||
        form.slug.toLowerCase().includes(searchValue)

      const matchesStatus =
        statusFilter === "All" || form.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [forms, search, statusFilter])

  const activeForms = forms.filter((form) => form.status === "Active").length

  const deleteForm = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this signup form?",
    )

    if (!confirmed) return

    const toastId = toast.loading("Deleting signup form...")

    try {
      const { error } = await supabase
        .from("signup_forms")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("Delete signup form error:", error)

        toast.dismiss(toastId)

        toast.error("We couldn't delete the signup form. Please try again.")

        return
      }

      toast.dismiss(toastId)

      toast.success("Signup form deleted successfully.")

      setForms((current) => current.filter((form) => form.id !== id))

      setSelectedForm(null)
    } catch (error) {
      console.error("Delete error:", error)

      toast.dismiss(toastId)

      toast.error("Something went wrong while deleting the signup form.")
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400 sm:text-sm">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-slate-700">Signup Forms</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              Signup Forms
            </h1>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Create and manage signup forms for your gym.
            </p>
          </div>

          <Link
            href="/signup-forms/create"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
          >
            <Plus size={18} />
            Create Signup Form
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:mb-7">
          <StatCard
            icon={<FileText size={19} />}
            label="Total Forms"
            value={forms.length}
          />

          <StatCard
            icon={<CheckCircle2 size={19} />}
            label="Active Forms"
            value={activeForms}
          />
        </div>

        {/* Main Card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
          {/* Toolbar */}
          <div className="border-b border-slate-100 bg-white/80 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative w-full sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search signup forms..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "All" | FormStatus)
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 sm:w-40"
                >
                  <option value="All">All status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-5 py-16 text-center sm:px-6">
              <p className="text-sm text-slate-500">Loading signup forms...</p>
            </div>
          )}

          {/* Desktop Table */}
          {!loading && (
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:px-6">
                      Signup Form
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:px-6">
                      Status
                    </th>

                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 lg:px-6">
                      Products
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredForms.map((form) => (
                    <tr
                      key={form.id}
                      className="border-b border-slate-100 last:border-0 transition hover:bg-slate-50/70"
                    >
                      {/* Form */}
                      <td className="px-4 py-4 lg:px-6">
                        <button
                          type="button"
                          onClick={() => setSelectedForm(form)}
                          className="group flex w-full cursor-pointer items-center gap-3 text-left"
                          aria-label={`View details for ${form.name}`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 transition group-hover:bg-slate-900 group-hover:text-white">
                            <FileText size={18} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 transition group-hover:text-slate-700">
                              {form.name}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-400">
                              /{form.slug}
                            </p>
                          </div>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 lg:px-6">
                        <StatusBadge status={form.status} />
                      </td>

                      {/* Products */}
                      <td className="px-4 py-4 lg:px-6">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                          <ShoppingBag size={15} />
                          {form.products}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile */}
          {!loading && (
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredForms.map((form) => (
                <div key={form.id} className="p-4 sm:p-5">
                  <button
                    type="button"
                    onClick={() => setSelectedForm(form)}
                    className="group flex w-full cursor-pointer items-start gap-3 text-left"
                    aria-label={`View details for ${form.name}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70 transition group-hover:bg-slate-900 group-hover:text-white">
                      <FileText size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 group-hover:text-slate-700">
                        {form.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        /{form.slug}
                      </p>
                    </div>
                  </button>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge status={form.status} />

                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                      <ShoppingBag size={14} />
                      {form.products} products
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && filteredForms.length === 0 && (
            <div className="px-5 py-16 text-center sm:px-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                <FileText size={21} className="text-slate-500" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-950">
                No signup forms found
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Create your first signup form to get started.
              </p>

              <Link
                href="/signup-forms/create"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <Plus size={14} />
                Create Form
              </Link>
            </div>
          )}

          {/* Footer */}
          {!loading && filteredForms.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredForms.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {forms.length}
              </span>{" "}
              signup forms
            </div>
          )}
        </section>
      </div>

      {/* Details Modal */}
      {selectedForm && (
        <SignupFormDetailsModal
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onDelete={() => deleteForm(selectedForm.id)}
        />
      )}
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
          {icon}
        </div>

        <span className="text-2xl font-bold tracking-tight text-slate-950">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">{label}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: FormStatus }) {
  const active = status === "Active"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
        active
          ? "bg-green-50 text-green-700"
          : "bg-slate-50 text-slate-500 ring-1 ring-inset ring-gray-200"
      }`}
    >
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}

      {status}
    </span>
  )
}

function SignupFormDetailsModal({
  form,
  onClose,
  onDelete,
}: {
  form: SignupForm
  onClose: () => void
  onDelete: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)

      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-form-details-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 pr-4">
            <h2
              id="signup-form-details-title"
              className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl"
            >
              Signup Form Details
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              View form information and available actions
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Summary */}
        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm sm:h-14 sm:w-14">
              <FileText size={21} />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-slate-950 sm:text-lg">
                {form.name}
              </h3>

              <p className="mt-0.5 truncate text-sm text-slate-500">
                /{form.slug}
              </p>

              <div className="mt-2">
                <StatusBadge status={form.status} />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="FORM NAME" value={form.name} />

            <DetailItem label="STATUS" value={form.status} badge />

            <DetailItem label="PUBLIC SLUG" value={`/${form.slug}`} />

            <DetailItem
              label="PRODUCTS"
              value={`${form.products} ${
                form.products === 1 ? "product" : "products"
              }`}
              icon={<ShoppingBag size={15} />}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* View */}
            <Link
              href={`/signup-forms/${form.id}`}
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <Eye size={16} />
              View Form
            </Link>

            {/* Edit */}
            <Link
              href={`/signup-forms/${form.id}/edit`}
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <Edit3 size={16} />
              Edit Form
            </Link>

            {/* QR */}
            <Link
              href={`/signup-forms/${form.id}/qr`}
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <QrCode size={16} />
              QR Code
            </Link>

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              <Trash2 size={16} />
              Delete Form
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({
  label,
  value,
  icon,
  badge = false,
}: {
  label: string
  value: string
  icon?: ReactNode
  badge?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
        {label}
      </p>

      {badge ? (
        <div className="mt-1.5">
          <StatusBadge status={value as FormStatus} />
        </div>
      ) : (
        <p className="mt-1.5 flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-slate-800">
          {icon}
          <span className="truncate">{value}</span>
        </p>
      )}
    </div>
  )
}
