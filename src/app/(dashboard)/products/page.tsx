"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Eye,
  Trash2,
  Package,
  Repeat2,
  Clock3,
  CheckCircle2,
  XCircle,
  ChevronDown,
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
  active: boolean
  created_at: string
}

export default function ProductsPage() {
  const { success: toastSuccess, error: toastError, loading: toastLoading, dismiss } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [type, setType] = useState("All")
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
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

      const { data, error: productsError } = await supabase
        .from("products")
        .select(
          `
            id,
            name,
            description,
            payment_type,
            price,
            billing_interval,
            access_type,
            visit_limit,
            active,
            created_at
          `,
        )
        .eq("gym_id", profile.gym_id)
        .order("created_at", { ascending: false })

      if (productsError) {
        throw new Error(productsError.message)
      }

      const normalizedProducts: Product[] = (data ?? []).map((product) => ({
        ...product,
        price: Number(product.price ?? 0),
        visit_limit:
          product.visit_limit === null ? null : Number(product.visit_limit),
      }))

      setProducts(normalizedProducts)
    } catch (err) {
      console.error("Load products error:", err)
      toastError("We couldn't load the products right now. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchValue = search.toLowerCase().trim()

      const matchesSearch =
        !searchValue ||
        product.name.toLowerCase().includes(searchValue) ||
        (product.description ?? "").toLowerCase().includes(searchValue)

      const productStatus = product.active ? "Active" : "Inactive"

      const productType =
        product.payment_type === "recurring" ? "Recurring" : "One-time"

      const matchesStatus = status === "All" || productStatus === status

      const matchesType = type === "All" || productType === type

      return matchesSearch && matchesStatus && matchesType
    })
  }, [products, search, status, type])

  const activeProducts = products.filter((product) => product.active).length

  const handleDelete = async (productId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    )

    if (!confirmed) {
      return
    }

    setDeleteLoading(productId)
    const toastId = toastLoading("Deleting product...")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        dismiss(toastId)
        toastError("You must be logged in.")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
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
        .eq("id", productId)
        .eq("gym_id", profile.gym_id)

      if (deleteError) {
        dismiss(toastId)
        toastError("We couldn't delete this product. Please try again.")
        return
      }

      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      )

      setOpenMenu(null)
      dismiss(toastId)
      toastSuccess("Product deleted successfully.")
    } catch {
      dismiss(toastId)
      toastError("We couldn't delete this product. Please try again.")
    } finally {
      setDeleteLoading(null)
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const getIntervalLabel = (product: Product) => {
    if (product.payment_type === "one-time") {
      return "One-time"
    }

    const labels: Record<string, string> = {
      weekly: "week",
      monthly: "month",
      quarterly: "quarter",
      yearly: "year",
    }

    return product.billing_interval
      ? (labels[product.billing_interval] ?? product.billing_interval)
      : "billing period"
  }

  const getAccessLabel = (product: Product) => {
    if (product.access_type === "full") {
      return "Full Access"
    }

    if (product.access_type === "visits") {
      return `${product.visit_limit ?? 0} Visits`
    }

    return "No Gym Access"
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* HEADER */}
        <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950">
                <Package className="h-5 w-5 text-white" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Products
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage memberships, plans, passes and services.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/products/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </Link>
        </div>

        {/* STATS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-2">
          <StatCard
            icon={Package}
            label="Total Products"
            value={products.length.toString()}
            detail="All products"
          />

          <StatCard
            icon={CheckCircle2}
            label="Active Products"
            value={activeProducts.toString()}
            detail="Currently available"
          />
        </div>

        {/* FILTERS */}
        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* SEARCH */}
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
              />
            </div>

            {/* STATUS */}
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-sm font-medium text-gray-700 outline-none sm:w-40"
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>

            {/* TYPE */}
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-9 text-sm font-medium text-gray-700 outline-none sm:w-40"
              >
                <option>All</option>
                <option>Recurring</option>
                <option>One-time</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* LOADING */}
        {loading ? (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex min-h-[350px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

                <p className="mt-3 text-sm text-gray-500">
                  Loading products...
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <section className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-950">
                      Membership Products
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      {filteredProducts.length} products found
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Product
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Price
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Access
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>

                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="transition hover:bg-gray-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                              <Package className="h-5 w-5 text-gray-600" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">
                                {product.name}
                              </p>

                              <p className="mt-0.5 max-w-[320px] truncate text-xs text-gray-500">
                                {product.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(product.price)}
                          </p>

                          <p className="mt-0.5 text-xs text-gray-400">
                            {getIntervalLabel(product)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {product.payment_type === "recurring" ? (
                              <Repeat2 className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Clock3 className="h-4 w-4 text-gray-400" />
                            )}

                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {getAccessLabel(product)}
                              </p>

                              <p className="text-xs text-gray-400">
                                {product.payment_type === "recurring"
                                  ? "Recurring"
                                  : "One-time"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <StatusBadge
                            status={product.active ? "Active" : "Inactive"}
                          />
                        </td>

                        <td className="relative px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              setOpenMenu(
                                openMenu === product.id ? null : product.id,
                              )
                            }
                            disabled={deleteLoading === product.id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>

                          {openMenu === product.id && (
                            <ProductMenu
                              productId={product.id}
                              onDelete={() => handleDelete(product.id)}
                              deleteLoading={deleteLoading === product.id}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length === 0 && <EmptyState />}
            </section>

            {/* MOBILE / TABLET CARDS */}
            <section className="space-y-4 lg:hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-950">
                    Membership Products
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    {filteredProducts.length} products found
                  </p>
                </div>
              </div>

              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                        <Package className="h-5 w-5 text-gray-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {product.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {product.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === product.id ? null : product.id)
                      }
                      disabled={deleteLoading === product.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>

                    {openMenu === product.id && (
                      <ProductMenu
                        productId={product.id}
                        onDelete={() => handleDelete(product.id)}
                        deleteLoading={deleteLoading === product.id}
                      />
                    )}
                  </div>

                  <div className="my-4 border-t border-gray-100" />

                  <div className="grid grid-cols-2 gap-4">
                    <MobileInfo
                      label="Price"
                      value={`${formatPrice(
                        product.price,
                      )} / ${getIntervalLabel(product)}`}
                    />

                    <MobileInfo
                      label="Access"
                      value={getAccessLabel(product)}
                    />

                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Type
                      </p>

                      <p className="text-sm font-semibold text-gray-800">
                        {product.payment_type === "recurring"
                          ? "Recurring"
                          : "One-time"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                        Status
                      </p>

                      <StatusBadge
                        status={product.active ? "Active" : "Inactive"}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {filteredProducts.length === 0 && <EmptyState />}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

/* ----------------------------- */
/* STAT CARD */
/* ----------------------------- */

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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>

        <span className="text-[10px] font-medium text-gray-400">Overview</span>
      </div>

      <p className="text-xs font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400">{detail}</p>
    </div>
  )
}

/* ----------------------------- */
/* STATUS */
/* ----------------------------- */

function StatusBadge({ status }: { status: string }) {
  const active = status === "Active"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}

      {status}
    </span>
  )
}

/* ----------------------------- */
/* PRODUCT MENU */
/* ----------------------------- */

function ProductMenu({
  productId,
  onDelete,
  deleteLoading,
}: {
  productId: string
  onDelete: () => void
  deleteLoading: boolean
}) {
  return (
    <div className="absolute right-5 top-14 z-30 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 text-left shadow-xl">
      <Link
        href={`/products/${productId}`}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Eye className="h-4 w-4" />
        View Product
      </Link>

      <Link
        href={`/products/${productId}/edit`}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Edit3 className="h-4 w-4" />
        Edit Product
      </Link>

      <button
        onClick={onDelete}
        disabled={deleteLoading}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
        {deleteLoading ? "Deleting..." : "Delete"}
      </button>
    </div>
  )
}

/* ----------------------------- */
/* MOBILE INFO */
/* ----------------------------- */

function MobileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="text-sm font-semibold text-gray-800">{value}</p>
    </div>
  )
}

/* ----------------------------- */
/* EMPTY STATE */
/* ----------------------------- */

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
        <Package className="h-5 w-5 text-gray-400" />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-900">
        No products found
      </h3>

      <p className="mt-1 text-xs text-gray-500">
        Try changing your search or filters.
      </p>
    </div>
  )
}
