"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  Edit3,
  MoreHorizontal,
  CheckCircle2,
  Users,
  DollarSign,
  Repeat2,
  Clock3,
  ShieldCheck,
  CalendarDays,
  Trash2,
  PauseCircle,
  PlayCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Product = {
  id: string
  name: string
  description: string | null
  payment_type: "recurring" | "one-time"
  price: number
  billing_interval: "weekly" | "monthly" | "quarterly" | "yearly" | null
  access_type: "full" | "visits" | "none"
  visit_limit: number | null
  class_access: "all" | "selected" | "none"
  selected_classes: string[]
  duration_type: "ongoing" | "limited" | "periodic"
  duration_value: number | null
  duration_unit: "days" | "weeks" | "months" | null
  discount_enabled: boolean
  discount_type: "percentage" | "fixed" | null
  discount_value: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export default function ProductDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { success: toastSuccess, error: toastError, loading: toastLoading, dismiss } = useToast()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!productId) {
      toastError("Product ID is missing.")
      setLoading(false)
      return
    }

    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile could not be found.")
      }

      const { data, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("gym_id", profile.gym_id)
        .single()

      if (productError) {
        throw new Error(productError.message)
      }

      if (!data) {
        throw new Error("Product not found.")
      }

      setProduct({
        ...data,
        price: Number(data.price ?? 0),
        visit_limit:
          data.visit_limit === null ? null : Number(data.visit_limit),
        duration_value:
          data.duration_value === null ? null : Number(data.duration_value),
        discount_value:
          data.discount_value === null ? null : Number(data.discount_value),
        selected_classes: Array.isArray(data.selected_classes)
          ? data.selected_classes
          : [],
      })
    } catch (err) {
      console.error("Product load error:", err)
      toastError("We couldn't load this product. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async () => {
    if (!product) return

    const newActiveState = !product.active
    const toastId = toastLoading(newActiveState ? "Activating product..." : "Deactivating product...")

    try {
      setActionLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        dismiss(toastId)
        toastError("You must be logged in.")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (!profile?.gym_id) {
        dismiss(toastId)
        toastError("Gym profile could not be found.")
        return
      }

      if (!["admin", "manager"].includes(profile.role)) {
        dismiss(toastId)
        toastError("You do not have permission to update products.")
        return
      }

      const { data, error: updateError } = await supabase
        .from("products")
        .update({
          active: newActiveState,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id)
        .eq("gym_id", profile.gym_id)
        .select("*")
        .single()

      if (updateError) {
        dismiss(toastId)
        toastError("We couldn't update the product status. Please try again.")
        return
      }

      setProduct({
        ...data,
        price: Number(data.price ?? 0),
        visit_limit:
          data.visit_limit === null ? null : Number(data.visit_limit),
        duration_value:
          data.duration_value === null ? null : Number(data.duration_value),
        discount_value:
          data.discount_value === null ? null : Number(data.discount_value),
        selected_classes: Array.isArray(data.selected_classes)
          ? data.selected_classes
          : [],
      })

      setMenuOpen(false)
      dismiss(toastId)
      toastSuccess(newActiveState ? "Product activated successfully." : "Product deactivated successfully.")
    } catch {
      dismiss(toastId)
      toastError("We couldn't update the product status. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    )

    if (!confirmed) {
      return
    }

    const toastId = toastLoading("Deleting product...")

    try {
      setActionLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        dismiss(toastId)
        toastError("You must be logged in.")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (!profile?.gym_id) {
        dismiss(toastId)
        toastError("Gym profile could not be found.")
        return
      }

      if (!["admin", "manager"].includes(profile.role)) {
        dismiss(toastId)
        toastError("You do not have permission to delete products.")
        return
      }

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("gym_id", profile.gym_id)

      if (deleteError) {
        dismiss(toastId)
        toastError("We couldn't delete this product. Please try again.")
        return
      }

      dismiss(toastId)
      toastSuccess("Product deleted successfully.")
      router.push("/products")
    } catch {
      dismiss(toastId)
      toastError("We couldn't delete this product. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (date: string) => {
    if (!date) return "—"

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date))
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const getIntervalLabel = () => {
    if (!product?.billing_interval) {
      return "One-time"
    }

    const labels: Record<string, string> = {
      weekly: "Week",
      monthly: "Month",
      quarterly: "Quarter",
      yearly: "Year",
    }

    return labels[product.billing_interval] ?? "—"
  }

  const getAccessLabel = () => {
    if (!product) return "—"

    if (product.access_type === "full") {
      return "Full Access"
    }

    if (product.access_type === "visits") {
      return `${product.visit_limit ?? 0} Visits`
    }

    return "No Gym Access"
  }

  const getClassAccessLabel = () => {
    if (!product) return "—"

    if (product.class_access === "all") {
      return "All Classes"
    }

    if (product.class_access === "selected") {
      return `${product.selected_classes.length} Selected`
    }

    return "No Class Access"
  }

  const getDurationLabel = () => {
    if (!product) return "—"

    if (product.duration_type === "ongoing") {
      return "Ongoing"
    }

    if (product.duration_type === "periodic") {
      return "Periodic"
    }

    if (
      product.duration_type === "limited" &&
      product.duration_value &&
      product.duration_unit
    ) {
      return `${product.duration_value} ${product.duration_unit}`
    }

    return "Limited"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
              <p className="mt-3 text-sm text-gray-500">Loading product...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Link
            href="/products"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <Package className="h-5 w-5 text-gray-500" />
            </div>

            <h1 className="mt-4 text-lg font-semibold text-gray-900">
              Product not found
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              This product could not be found.
            </p>

            <Link
              href="/products"
              className="mt-5 inline-flex h-10 items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* BACK */}
        <Link
          href="/products"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        {/* HEADER */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950">
              <Package className="h-5 w-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  {product.name}
                </h1>

                <StatusBadge status={product.active ? "Active" : "Inactive"} />
              </div>

              {product.description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/products/${product.id}/edit`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit Product
            </Link>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                disabled={actionLoading}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                  <button
                    onClick={handleToggleActive}
                    disabled={actionLoading}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {product.active ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}

                    {product.active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={actionLoading}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Product
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={DollarSign}
            label="Price"
            value={formatPrice(product.price)}
            detail={
              product.payment_type === "recurring"
                ? `Per ${getIntervalLabel().toLowerCase()}`
                : "One-time payment"
            }
          />

          <StatCard
            icon={Repeat2}
            label="Payment"
            value={
              product.payment_type === "recurring" ? "Recurring" : "One-time"
            }
            detail={product.active ? "Currently active" : "Inactive"}
          />

          <StatCard
            icon={ShieldCheck}
            label="Gym Access"
            value={getAccessLabel()}
            detail={
              product.access_type === "full"
                ? "Unlimited access"
                : product.access_type === "visits"
                  ? "Visit based"
                  : "No gym access"
            }
          />

          <StatCard
            icon={Clock3}
            label="Duration"
            value={getDurationLabel()}
            detail="Product access period"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-6 xl:col-span-2">
            {/* PRICING */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={DollarSign}
                title="Pricing"
                description="Payment and billing configuration for this product."
              />

              <div className="mt-6 rounded-2xl bg-gray-950 p-5 text-white sm:p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Product Price
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-semibold tracking-tight">
                    {formatPrice(product.price)}
                  </span>

                  {product.payment_type === "recurring" &&
                    product.billing_interval && (
                      <span className="pb-1 text-sm text-gray-400">
                        / {getIntervalLabel().toLowerCase()}
                      </span>
                    )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <DarkBadge
                    icon={Repeat2}
                    text={
                      product.payment_type === "recurring"
                        ? "Recurring"
                        : "One-time"
                    }
                  />

                  <DarkBadge
                    icon={product.active ? CheckCircle2 : PauseCircle}
                    text={product.active ? "Active" : "Inactive"}
                  />
                </div>
              </div>
            </section>

            {/* ACCESS RULES */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                icon={ShieldCheck}
                title="Access Rules"
                description="What members receive when they purchase this product."
              />

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RuleCard
                  icon={ShieldCheck}
                  title="Gym Access"
                  value={getAccessLabel()}
                />

                <RuleCard
                  icon={CalendarDays}
                  title="Class Access"
                  value={getClassAccessLabel()}
                />

                <RuleCard
                  icon={Clock3}
                  title="Duration"
                  value={getDurationLabel()}
                />

                <RuleCard
                  icon={Users}
                  title="Visit Limit"
                  value={
                    product.access_type === "visits"
                      ? `${product.visit_limit ?? 0} Visits`
                      : product.access_type === "full"
                        ? "Unlimited Visits"
                        : "Not Applicable"
                  }
                />
              </div>

              {product.class_access === "selected" &&
                product.selected_classes.length > 0 && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Selected Classes
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.selected_classes.map((className) => (
                        <span
                          key={className}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700"
                        >
                          {className}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </section>

            {/* DISCOUNT */}
            {product.discount_enabled && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle
                  icon={DollarSign}
                  title="Discount"
                  description="Discount configuration for this product."
                />

                <div className="mt-6 rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Discount Type</p>

                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {product.discount_type === "percentage"
                          ? "Percentage"
                          : "Fixed Amount"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-400">Discount Value</p>

                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {product.discount_value ?? 0}
                        {product.discount_type === "percentage" ? "%" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <aside className="space-y-6">
            {/* QUICK ACTIONS */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-gray-950">
                Quick Actions
              </h2>

              <div className="mt-4 space-y-2">
                <Link
                  href={`/products/${product.id}/edit`}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4 text-gray-500" />
                  Edit Product
                </Link>

                <button
                  onClick={handleToggleActive}
                  disabled={actionLoading}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {product.active ? (
                    <PauseCircle className="h-4 w-4 text-gray-500" />
                  ) : (
                    <PlayCircle className="h-4 w-4 text-gray-500" />
                  )}

                  {product.active ? "Deactivate Product" : "Activate Product"}
                </button>

                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Product
                </button>
              </div>
            </section>

            {/* PRODUCT INFO */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-semibold text-gray-950">
                Product Information
              </h2>

              <div className="mt-5 space-y-4">
                <InfoRow label="Product Type" value="Membership / Service" />

                <InfoRow
                  label="Payment Type"
                  value={
                    product.payment_type === "recurring"
                      ? "Recurring"
                      : "One-time"
                  }
                />

                <InfoRow
                  label="Billing Interval"
                  value={
                    product.payment_type === "recurring"
                      ? getIntervalLabel()
                      : "Not Applicable"
                  }
                />

                <InfoRow
                  label="Created"
                  value={formatDate(product.created_at)}
                />

                <InfoRow
                  label="Last Updated"
                  value={formatDate(product.updated_at)}
                />
              </div>
            </section>

            {/* MEMBER ACCESS */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <ShieldCheck className="h-5 w-5 text-gray-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Member Access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    {getAccessLabel()} with{" "}
                    {getClassAccessLabel().toLowerCase()}.
                  </p>
                </div>
              </div>
            </section>

            {/* STATUS */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Product Status
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Current availability
                  </p>
                </div>

                <StatusBadge status={product.active ? "Active" : "Inactive"} />
              </div>

              <div className="mt-5">
                <button
                  onClick={handleToggleActive}
                  disabled={actionLoading}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {product.active ? (
                    <>
                      <PauseCircle className="h-4 w-4" />
                      Deactivate Product
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4" />
                      Activate Product
                    </>
                  )}
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- */
/* COMPONENTS */
/* -------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>

      <p className="text-xs font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400">{detail}</p>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>

        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  )
}

function RuleCard({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ElementType
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>

        <div>
          <p className="text-xs text-gray-400">{title}</p>

          <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  )
}

function DarkBadge({
  icon: Icon,
  text,
}: {
  icon: React.ElementType
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-200">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Active"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-gray-400"
        }`}
      />

      {status}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500">{label}</span>

      <span className="text-right text-xs font-semibold text-gray-800">
        {value}
      </span>
    </div>
  )
}
