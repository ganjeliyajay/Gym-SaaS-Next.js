"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Link2,
  Loader2,
  Package,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"

type FormStatus = "active" | "inactive"

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

type Waiver = {
  name?: string
  content?: string
  updatedAt?: string
}

type SignupForm = {
  id: string
  name: string
  description: string | null
  slug: string
  status: FormStatus
  gym_id: string
  selected_products: unknown
  customer_fields: unknown
  waiver: unknown
  waiver_id?: string | null
  created_at: string
  updated_at: string
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

function normalizeWaiver(value: unknown): Waiver | null {
  if (!value || typeof value !== "object") return null

  const waiver = value as Record<string, unknown>

  return {
    name: typeof waiver.name === "string" ? waiver.name : "Waiver",
    content: typeof waiver.content === "string" ? waiver.content : "",
    updatedAt:
      typeof waiver.updatedAt === "string" ? waiver.updatedAt : undefined,
  }
}

function formatDate(date: string) {
  if (!date) return "—"

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}

export default function SignupFormDetailsPage() {
  const params = useParams()
  const formId = params?.id as string

  const [form, setForm] = useState<SignupForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!formId) return

    const loadForm = async () => {
      try {
        setLoading(true)
        setError("")

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setError("You must be logged in to view this form.")
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.gym_id) {
          console.error(profileError)
          setError("Unable to load your gym information.")
          return
        }

        const { data, error: formError } = await supabase
          .from("signup_forms")
          .select(
            `
              id,
              name,
              description,
              slug,
              status,
              gym_id,
              selected_products,
              customer_fields,
              waiver,
              created_at,
              updated_at
            `,
          )
          .eq("id", formId)
          .eq("gym_id", profile.gym_id)
          .single()

        if (formError || !data) {
          console.error(formError)
          setError("Signup form not found.")
          return
        }

        let loadedForm = data as SignupForm

        if (loadedForm.waiver_id) {
          const { data: masterWaiver } = await supabase
            .from("waivers")
            .select("id,name,content,updated_at")
            .eq("id", loadedForm.waiver_id)
            .eq("gym_id", loadedForm.gym_id)
            .maybeSingle()

          if (masterWaiver) {
            loadedForm = {
              ...loadedForm,
              waiver: {
                name: masterWaiver.name,
                content: masterWaiver.content,
                updatedAt: masterWaiver.updated_at,
              },
            }
          }
        }

        setForm(loadedForm)
      } catch (err) {
        console.error(err)
        setError("Something went wrong while loading the form.")
      } finally {
        setLoading(false)
      }
    }

    loadForm()
  }, [formId])

  const products = useMemo(
    () => normalizeProducts(form?.selected_products),
    [form],
  )

  const customerFields = useMemo(
    () => normalizeCustomerFields(form?.customer_fields),
    [form],
  )

  const waiver = useMemo(() => normalizeWaiver(form?.waiver), [form])

  const publicUrl = useMemo(() => {
    if (!form || typeof window === "undefined") return ""

    return `${window.location.origin}/signup/${form.slug}`
  }, [form])

  const totalProductValue = useMemo(() => {
    return products.reduce((total, product) => total + product.price, 0)
  }, [products])

  const copyPublicUrl = async () => {
    if (!publicUrl) return

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading signup form...
          </div>
        </div>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <FileText className="h-6 w-6 text-red-400" />
            </div>

            <h1 className="text-xl font-semibold">
              Unable to load signup form
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error || "This signup form does not exist."}
            </p>

            <Link
              href="/signup-forms"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Signup Forms
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isActive = form.status === "active"

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1400px] flex-col gap-3 px-4 py-3 sm:min-h-20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/signup-forms"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold sm:text-xl">
                  {form.name}
                </h1>

                <span
                  className={`hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-zinc-500/10 text-slate-400"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                Signup Form Details
              </p>
            </div>
          </div>

          <Link
            href={`/signup-forms/${form.id}/edit`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
          >
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">Edit Form</span>
            <span className="sm:hidden">Edit</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page intro */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link
              href="/signup-forms"
              className="transition hover:text-slate-900"
            >
              Signup Forms
            </Link>

            <ChevronRight className="h-3.5 w-3.5" />

            <span className="text-slate-400">{form.name}</span>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Form overview
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review your customer signup form, products, fields, waiver, and
                public signup link.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/signup-forms/${form.id}/qr`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/[0.06] hover:text-slate-900"
              >
                <QrCode className="h-4 w-4" />
                QR Code
              </Link>

              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/15"
              >
                <ExternalLink className="h-4 w-4" />
                Open Form
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
          <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Package className="h-5 w-5 text-amber-400" />
              </div>

              <span className="text-xs text-slate-600">Products</span>
            </div>

            <p className="text-2xl font-semibold">{products.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              Available on this form
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-400" />
              </div>

              <span className="text-xs text-slate-600">Fields</span>
            </div>

            <p className="text-2xl font-semibold">{customerFields.length}</p>

            <p className="mt-1 text-xs text-slate-500">
              Customer information fields
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <span className="text-xs text-slate-600">Waiver</span>
            </div>

            <p className="text-2xl font-semibold">
              {waiver ? "Attached" : "None"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {waiver ? waiver.name : "No waiver attached"}
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <CalendarDays className="h-5 w-5 text-purple-400" />
              </div>

              <span className="text-xs text-slate-600">Created</span>
            </div>

            <p className="text-base font-semibold">
              {formatDate(form.created_at)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Last updated {formatDate(form.updated_at)}
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          {/* Left */}
          <div className="space-y-6">
            {/* Basic information */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
                    <FileText className="h-4 w-4 text-slate-700" />
                  </div>

                  <div>
                    <h3 className="font-semibold">Basic Information</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      General information about this signup form
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:gap-6 sm:p-6">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
                    Form Name
                  </p>

                  <p className="text-sm text-slate-800">{form.name}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
                    Status
                  </p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isActive ? "bg-emerald-400" : "bg-zinc-500"
                      }`}
                    />

                    <span className="text-sm capitalize text-slate-800">
                      {form.status}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
                    Description
                  </p>

                  <p className="text-sm leading-6 text-slate-400">
                    {form.description || "No description added."}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-600">
                    Slug
                  </p>

                  <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-900/10 px-3 py-2">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-slate-600" />

                    <span className="truncate text-sm text-slate-400">
                      /signup/{form.slug}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Customer fields */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold">Customer Fields</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Information customers provide during signup
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-slate-400">
                  {customerFields.length}
                </span>
              </div>

              <div className="p-5 sm:p-6">
                {customerFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
                    <Users className="mx-auto mb-3 h-5 w-5 text-slate-700" />

                    <p className="text-sm text-slate-400">
                      No customer fields configured.
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Edit the form to add customer information fields.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {customerFields.map((field, index) => (
                      <div
                        key={field.id ?? `${field.label}-${index}`}
                        className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs text-slate-500">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {field.label}
                            </p>

                            <p className="mt-0.5 text-xs capitalize text-slate-600">
                              {field.type || "text"}
                            </p>
                          </div>
                        </div>

                        {field.required && (
                          <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                            Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Products */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Package className="h-4 w-4 text-amber-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold">Products</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Products customers can select
                    </p>
                  </div>
                </div>

                {products.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {formatPrice(totalProductValue)} total
                  </span>
                )}
              </div>

              <div className="p-5 sm:p-6">
                {products.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">
                    <Package className="mx-auto mb-3 h-5 w-5 text-slate-700" />

                    <p className="text-sm text-slate-400">
                      No products selected.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {products.map((product, index) => (
                      <div
                        key={`${String(product.id)}-${index}`}
                        className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {product.type || "Product"}
                            </p>
                          </div>

                          <span className="shrink-0 text-sm font-semibold text-amber-400">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Public URL */}
            <section className="overflow-hidden rounded-2xl border border-amber-200/70 bg-white shadow-[0_8px_30px_rgba(245,158,11,0.08)]">
              <div className="border-b border-amber-200/60 bg-amber-50/70 px-5 py-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Link2 className="h-4 w-4 text-amber-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold">Public Signup Link</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Share this link with your customers
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-900/10 p-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-slate-600" />

                    <input
                      readOnly
                      value={publicUrl}
                      className="min-w-0 flex-1 bg-transparent text-xs text-slate-400 outline-none"
                    />

                    <button
                      type="button"
                      onClick={copyPublicUrl}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                      title="Copy link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyPublicUrl}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" />
                      Copy Signup Link
                    </>
                  )}
                </button>

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 hover:shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Public Form
                </a>
              </div>
            </section>

            {/* QR */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <QrCode className="h-5 w-5 text-slate-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">QR Code</h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Generate a QR code that customers can scan to open this
                    signup form.
                  </p>

                  <Link
                    href={`/signup-forms/${form.id}/qr`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-amber-600 transition hover:text-amber-700"
                  >
                    Customize QR Code
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Waiver */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="border-b border-slate-200/80 bg-slate-50/70 px-5 py-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div>
                    <h3 className="font-semibold">Waiver</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Agreement customers must accept
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {!waiver ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-5 py-7 text-center">
                    <ShieldCheck className="mx-auto mb-3 h-5 w-5 text-slate-700" />

                    <p className="text-sm text-slate-400">No waiver attached</p>

                    <Link
                      href={`/signup-forms/${form.id}/waiver`}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300"
                    >
                      Add waiver
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {waiver.name || "Waiver"}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {waiver.updatedAt
                            ? `Updated ${formatDate(waiver.updatedAt)}`
                            : "Attached to this form"}
                        </p>
                      </div>

                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Attached
                      </span>
                    </div>

                    {waiver.content && (
                      <div className="mt-5 max-h-48 overflow-hidden rounded-xl border border-slate-200 bg-slate-900/10 p-4">
                        <p className="whitespace-pre-wrap text-xs leading-5 text-slate-500">
                          {waiver.content}
                        </p>
                      </div>
                    )}

                    <Link
                      href={`/signup-forms/${form.id}/waiver`}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <FileText className="h-4 w-4" />
                      View / Edit Waiver
                    </Link>
                  </>
                )}
              </div>
            </section>

            {/* Form metadata */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
              <h3 className="mb-5 font-semibold">Form Details</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-600">Form ID</span>

                  <span className="max-w-[180px] truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-500">
                    {form.id}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-600">Created</span>

                  <span className="text-xs text-slate-400">
                    {formatDate(form.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-600">Last Updated</span>

                  <span className="text-xs text-slate-400">
                    {formatDate(form.updated_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-600">Status</span>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      isActive ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-400" : "bg-zinc-500"
                      }`}
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
