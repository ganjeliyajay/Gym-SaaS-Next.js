"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Check,
  FileText,
  LayoutTemplate,
  Save,
  ShoppingBag,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Product = {
  id: string
  name: string
  price: string
  type: "Recurring" | "One-time"
}

type CustomerField = {
  id: string
  label: string
  type: string
  required: boolean
}

type Waiver = {
  id: string
  name: string
  content: string
}

const defaultCustomerFields: CustomerField[] = [
  {
    id: "first-name",
    label: "First Name",
    type: "Text",
    required: true,
  },
  {
    id: "last-name",
    label: "Last Name",
    type: "Text",
    required: true,
  },
  {
    id: "email",
    label: "Email Address",
    type: "Email",
    required: true,
  },
  {
    id: "phone",
    label: "Phone Number",
    type: "Phone",
    required: true,
  },
]

export default function CreateSignupFormPage() {
  const router = useRouter()
  const toast = useToast()

  const [formName, setFormName] = useState("")
  const [description, setDescription] = useState("")

  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const [waivers, setWaivers] = useState<Waiver[]>([])
  const [selectedWaiverId, setSelectedWaiverId] = useState("")

  const [active, setActive] = useState(true)

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          if (mounted) {
            toast.error("Your session has expired. Please login again.")
          }
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.gym_id) {
          if (mounted) {
            toast.error("Gym information could not be found.")
          }
          return
        }

        const { data, error } = await supabase
          .from("products")
          .select("id,name,price,payment_type,billing_interval,active")
          .eq("gym_id", profile.gym_id)
          .eq("active", true)
          .order("created_at", { ascending: false })

        if (error) {
          throw error
        }

        const mapped: Product[] = (data ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          price: `$${Number(product.price ?? 0).toFixed(2)}${
            product.payment_type === "recurring" && product.billing_interval
              ? ` / ${product.billing_interval}`
              : ""
          }`,
          type: product.payment_type === "recurring" ? "Recurring" : "One-time",
        }))

        const { data: waiverRows, error: waiverError } = await supabase
          .from("waivers")
          .select("id,name,content")
          .eq("gym_id", profile.gym_id)
          .order("updated_at", { ascending: false })

        if (waiverError) {
          throw waiverError
        }

        if (mounted) {
          setProducts(mapped)
          setSelectedProducts([])
          setWaivers((waiverRows ?? []) as Waiver[])
          setSelectedWaiverId("")
        }
      } catch (error) {
        console.error("Load signup form products error:", error)

        if (mounted) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load products.",
          )
        }
      }
    }

    loadProducts()

    return () => {
      mounted = false
    }
  }, [toast])

  const toggleProduct = (id: string) => {
    setSelectedProducts((current) =>
      current.includes(id)
        ? current.filter((productId) => productId !== id)
        : [...current, id],
    )
  }

  const createSlug = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const generateUniqueSlug = async (baseSlug: string) => {
    const slug = baseSlug || "signup-form"

    const { data: existingForms, error } = await supabase
      .from("signup_forms")
      .select("slug")
      .ilike("slug", `${slug}%`)

    if (error) {
      throw new Error(error.message)
    }

    const existingSlugs = new Set(
      (existingForms ?? []).map((item) => item.slug),
    )

    if (!existingSlugs.has(slug)) {
      return slug
    }

    let counter = 2

    while (existingSlugs.has(`${slug}-${counter}`)) {
      counter += 1
    }

    return `${slug}-${counter}`
  }

  const handleSignupForm = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name.")
      return
    }

    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product.")
      return
    }

    const toastId = toast.loading("Creating signup form...")
    setSaving(true)

    try {
      // --------------------------------
      // GET CURRENT USER
      // --------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Your session has expired. Please login again.")
      }

      // --------------------------------
      // GET USER GYM
      // --------------------------------

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym information could not be found.")
      }

      // --------------------------------
      // GENERATE SLUG
      // --------------------------------

      const baseSlug = createSlug(formName)
      const slug = await generateUniqueSlug(baseSlug)

      // --------------------------------
      // SELECT PRODUCT OBJECTS
      // --------------------------------

      const selectedProductData = products.filter((product) =>
        selectedProducts.includes(product.id),
      )

      const selectedWaiver = waivers.find(
        (item) => item.id === selectedWaiverId,
      )

      const waiverData = selectedWaiver
        ? {
            id: selectedWaiver.id,
            name: selectedWaiver.name,
            content: selectedWaiver.content,
            updatedAt: new Date().toISOString(),
          }
        : null

      // --------------------------------
      // CREATE FORM
      // --------------------------------

      const { data: createdForm, error: createError } = await supabase
        .from("signup_forms")
        .insert({
          gym_id: profile.gym_id,
          name: formName.trim(),
          description: description.trim() || null,
          slug,
          status: active ? "active" : "inactive",

          selected_products: selectedProductData,

          customer_fields: defaultCustomerFields,

          waiver: waiverData,
          waiver_id: selectedWaiverId || null,
        })
        .select("id")
        .single()

      if (createError) {
        console.error("Create signup form error:", createError)

        throw new Error(createError.message)
      }

      if (!createdForm?.id) {
        throw new Error("Signup form was created but its ID was not returned.")
      }

      // --------------------------------
      // REDIRECT
      // --------------------------------

      toast.dismiss(toastId)
      toast.success("Signup form created successfully.")
      router.push(`/signup-forms/${createdForm.id}`)
      router.refresh()
    } catch (error) {
      console.error("Signup form creation error:", error)
      toast.dismiss(toastId)
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the signup form.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Back */}
        <Link
          href="/signup-forms"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-950"
        >
          <ArrowLeft size={17} />
          Back to Signup Forms
        </Link>

        {/* Header */}
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <span>Signup Forms</span>
            <span>/</span>
            <span className="text-gray-900">Create</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
            Create signup form
          </h1>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Create a signup experience for new gym members.
          </p>
        </div>

        <div className="space-y-6">
          {/* BASIC INFORMATION */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
            <SectionHeader
              icon={<LayoutTemplate size={19} />}
              title="Basic information"
              description="Enter the basic details for your signup form."
            />

            <div className="mt-6 space-y-5">
              {/* Form Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Form name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                  }}
                  placeholder="e.g. General Membership"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                />

                {formName.trim() && (
                  <p className="mt-2 text-xs text-gray-400">
                    URL slug:{" "}
                    <span className="font-medium text-gray-600">
                      /signup/
                      {createSlug(formName) || "signup-form"}
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800">
                  Description
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell customers what this signup form is for..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {/* PRODUCTS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
            <SectionHeader
              icon={<ShoppingBag size={19} />}
              title="Products"
              description="Select the products customers can purchase."
            />

            <div className="mt-6 space-y-3">
              {products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    No active products found
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Create an active product first, then return here to select
                    it.
                  </p>
                </div>
              ) : (
                products.map((product) => {
                  const selected = selectedProducts.includes(product.id)

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          selected
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {selected && <Check size={13} strokeWidth={3} />}
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                        <ShoppingBag size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {product.type}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-gray-900">
                        {product.price}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <p className="mt-4 text-xs text-gray-400">
              {selectedProducts.length} product
              {selectedProducts.length !== 1 ? "s" : ""} selected
            </p>
          </section>

          {/* WAIVER */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
            <SectionHeader
              icon={<FileText size={19} />}
              title="Legal waiver"
              description="Choose the waiver customers must accept."
            />

            <div className="mt-6">
              <label
                htmlFor="signup-waiver"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Signup waiver
              </label>

              <select
                id="signup-waiver"
                value={selectedWaiverId}
                onChange={(event) => setSelectedWaiverId(event.target.value)}
                className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-400"
              >
                <option value="">No Waiver</option>
                {waivers.map((waiver) => (
                  <option key={waiver.id} value={waiver.id}>
                    {waiver.name}
                  </option>
                ))}
              </select>

              {waivers.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-900">
                    No waivers available
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Create a waiver first, then return here to attach it.
                  </p>
                  <Link
                    href="/waivers/create"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950"
                  >
                    Create waiver
                  </Link>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">
                  The selected waiver will be shown to customers before signup.
                </p>
              )}
            </div>
          </section>

          {/* SETTINGS */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-6">
            <SectionHeader
              icon={<Check size={19} />}
              title="Form settings"
              description="Control whether this signup form is active."
            />

            <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Form active</p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Customers can access and submit this signup form.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActive(!active)}
                aria-label="Toggle form status"
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  active ? "bg-gray-900" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                    active ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  active ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />

              <span className="text-xs font-medium text-gray-500">
                {active
                  ? "This form will be publicly accessible."
                  : "This form will be disabled."}
              </span>
            </div>
          </section>

          {/* BOTTOM ACTIONS */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/signup-forms"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              disabled={
                saving || !formName.trim() || selectedProducts.length === 0
              }
              onClick={handleSignupForm}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Create Signup Form
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-950">{title}</h2>

        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  )
}
