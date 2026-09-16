"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  Save,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Settings2,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Package,
  FileText,
  Palette,
  LayoutTemplate,
  ExternalLink,
} from "lucide-react"

type Field = {
  id: string
  label: string
  type: string
  required: boolean
  icon: React.ElementType
}

type WaiverOption = {
  id: string
  name: string
  content: string
}

const initialFields: Field[] = [
  {
    id: "first-name",
    label: "First Name",
    type: "Text",
    required: true,
    icon: User,
  },
  {
    id: "last-name",
    label: "Last Name",
    type: "Text",
    required: true,
    icon: User,
  },
  {
    id: "email",
    label: "Email Address",
    type: "Email",
    required: true,
    icon: Mail,
  },
  {
    id: "phone",
    label: "Phone Number",
    type: "Phone",
    required: true,
    icon: Phone,
  },
  {
    id: "address",
    label: "Address",
    type: "Address",
    required: false,
    icon: MapPin,
  },
  {
    id: "password",
    label: "Password",
    type: "Password",
    required: true,
    icon: Lock,
  },
]

export default function EditSignupFormPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const formId = params?.id

  const [formName, setFormName] = useState("")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; price: string }>
  >([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [waivers, setWaivers] = useState<WaiverOption[]>([])
  const [selectedWaiverId, setSelectedWaiverId] = useState("")
  const [waiver, setWaiver] = useState("No Waiver")
  const [active, setActive] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("basic")

  useEffect(() => {
    if (!formId) return

    let mounted = true

    const loadForm = async () => {
      try {
        setLoading(true)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user)
          throw new Error("Your session has expired. Please login again.")

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()
        if (profileError || !profile?.gym_id)
          throw new Error("Gym information could not be found.")

        const { data: form, error: formError } = await supabase
          .from("signup_forms")
          .select(
            "id,name,description,slug,status,selected_products,customer_fields,waiver,waiver_id",
          )
          .eq("id", formId)
          .eq("gym_id", profile.gym_id)
          .single()
        if (formError || !form)
          throw new Error(formError?.message || "Signup form not found.")

        const { data: productRows, error: productError } = await supabase
          .from("products")
          .select("id,name,price,payment_type,billing_interval,active")
          .eq("gym_id", profile.gym_id)
          .order("created_at", { ascending: false })
        if (productError) throw productError

        const mappedProducts = (productRows ?? []).map((product) => ({
          id: product.id,
          name: product.name,
          price: `$${Number(product.price ?? 0).toFixed(2)}${product.payment_type === "recurring" && product.billing_interval ? ` / ${product.billing_interval}` : ""}`,
        }))

        const { data: waiverRows, error: waiverError } = await supabase
          .from("waivers")
          .select("id,name,content")
          .eq("gym_id", profile.gym_id)
          .order("updated_at", { ascending: false })

        if (waiverError) throw waiverError

        const storedProducts = Array.isArray(form.selected_products)
          ? form.selected_products
          : []
        const storedIds = storedProducts
          .map((product: any) =>
            typeof product === "string" ? product : product?.id,
          )
          .filter(Boolean)

        if (!mounted) return
        setFormName(form.name ?? "")
        setDescription(form.description ?? "")
        setSlug(form.slug ?? "")
        setActive(form.status === "active")
        setProducts(mappedProducts)
        setSelectedProducts(storedIds)
        setWaivers((waiverRows ?? []) as WaiverOption[])
        setSelectedWaiverId(form.waiver_id ? String(form.waiver_id) : "")

        if (
          Array.isArray(form.customer_fields) &&
          form.customer_fields.length > 0
        ) {
          const loadedFields = form.customer_fields
            .filter((field: any) => field && field.id && field.label)
            .map((field: any) => ({
              id: String(field.id),
              label: String(field.label),
              type: String(field.type ?? "Text"),
              required: Boolean(field.required),
              icon:
                initialFields.find((item) => item.id === field.id)?.icon ??
                User,
            }))
          if (loadedFields.length > 0) setFields(loadedFields)
        }

        const legacyWaiverName = form.waiver?.name
          ? String(form.waiver.name)
          : "No Waiver"

        setWaiver(legacyWaiverName)

        if (!form.waiver_id && legacyWaiverName !== "No Waiver") {
          const matchedWaiver = (waiverRows ?? []).find(
            (item) => item.name === legacyWaiverName,
          )

          if (matchedWaiver) {
            setSelectedWaiverId(String(matchedWaiver.id))
          }
        }
      } catch (error) {
        console.error("Load signup form error:", error)
        if (mounted)
          toast.error(
            error instanceof Error
              ? error.message
              : "Unable to load signup form.",
          )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadForm()
    return () => {
      mounted = false
    }
  }, [formId, toast])

  const removeField = (id: string) => {
    setFields((current) => current.filter((field) => field.id !== id))
  }

  const toggleRequired = (id: string) => {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, required: !field.required } : field,
      ),
    )
  }

  const toggleProduct = (id: string) => {
    setSelectedProducts((current) =>
      current.includes(id)
        ? current.filter((productId) => productId !== id)
        : [...current, id],
    )
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a form name.")
      return
    }
    if (!slug.trim()) {
      toast.error("Please enter a public URL slug.")
      return
    }
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product.")
      return
    }
    if (!formId) {
      toast.error("Signup form ID is missing.")
      return
    }

    const toastId = toast.loading("Saving signup form...")
    setSaving(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user)
        throw new Error("Your session has expired. Please login again.")

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()
      if (profileError || !profile?.gym_id)
        throw new Error("Gym information could not be found.")

      const selectedProductData = products.filter((product) =>
        selectedProducts.includes(product.id),
      )
      const normalizedSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
      if (!normalizedSlug)
        throw new Error("Please enter a valid public URL slug.")

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

      const { error: updateError } = await supabase
        .from("signup_forms")
        .update({
          name: formName.trim(),
          description: description.trim() || null,
          slug: normalizedSlug,
          status: active ? "active" : "inactive",
          selected_products: selectedProductData,
          customer_fields: fields.map(({ id, label, type, required }) => ({
            id,
            label,
            type,
            required,
          })),
          waiver_id: selectedWaiverId || null,
          waiver: waiverData,
        })
        .eq("id", formId)
        .eq("gym_id", profile.gym_id)

      if (updateError) throw new Error(updateError.message)

      setSlug(normalizedSlug)
      setSaved(true)
      toast.dismiss(toastId)
      toast.success("Signup form saved successfully.")
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (error) {
      console.error("Update signup form error:", error)
      toast.dismiss(toastId)
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the signup form.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {loading && (
        <div className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
            Loading signup form...
          </div>
        </div>
      )}
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/signup-forms"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">
                Edit Signup Form
              </p>

              <p className="hidden truncate text-xs text-gray-400 sm:block">
                {formName || "Signup Form"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={slug ? `/signup/${slug}` : "#"}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:inline-flex"
            >
              <Eye className="h-4 w-4" />
              Preview
            </a>

            <button
              onClick={handleSave}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[240px_minmax(0,1fr)_380px]">
          {/* LEFT NAVIGATION */}
          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              <SectionButton
                active={activeSection === "basic"}
                onClick={() => setActiveSection("basic")}
                icon={LayoutTemplate}
                label="Basic Information"
              />

              <SectionButton
                active={activeSection === "fields"}
                onClick={() => setActiveSection("fields")}
                icon={User}
                label="Customer Fields"
              />

              <SectionButton
                active={activeSection === "products"}
                onClick={() => setActiveSection("products")}
                icon={Package}
                label="Products"
              />

              <SectionButton
                active={activeSection === "waiver"}
                onClick={() => setActiveSection("waiver")}
                icon={FileText}
                label="Waiver"
              />

              <SectionButton
                active={activeSection === "appearance"}
                onClick={() => setActiveSection("appearance")}
                icon={Palette}
                label="Appearance"
              />

              <SectionButton
                active={activeSection === "settings"}
                onClick={() => setActiveSection("settings")}
                icon={Settings2}
                label="Settings"
              />
            </div>
          </aside>

          {/* CENTER EDITOR */}
          <main className="min-w-0 space-y-6">
            {/* Mobile Section Selector */}
            <div className="xl:hidden">
              <div className="relative">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-medium text-gray-700 outline-none"
                >
                  <option value="basic">Basic Information</option>
                  <option value="fields">Customer Fields</option>
                  <option value="products">Products</option>
                  <option value="waiver">Waiver</option>
                  <option value="appearance">Appearance</option>
                  <option value="settings">Settings</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* BASIC INFORMATION */}
            {activeSection === "basic" && (
              <>
                <EditorHeader
                  icon={LayoutTemplate}
                  title="Basic Information"
                  description="Set the name and public details of your signup form."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="space-y-6">
                    <InputField
                      label="Form Name"
                      value={formName}
                      onChange={setFormName}
                      placeholder="e.g. General Membership"
                    />

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Description
                      </label>

                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                        placeholder="Describe this signup form..."
                      />

                      <p className="mt-2 text-xs text-gray-400">
                        This description will appear at the top of the public
                        signup page.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Public URL
                      </label>

                      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        <span className="hidden items-center border-r border-gray-200 px-4 text-sm text-gray-400 sm:flex">
                          yourgym.thinkauric.com/signup/
                        </span>

                        <input
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-gray-700 outline-none"
                        />
                      </div>

                      <p className="mt-2 text-xs text-gray-400">
                        Use lowercase letters, numbers and hyphens.
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* CUSTOMER FIELDS */}
            {activeSection === "fields" && (
              <>
                <EditorHeader
                  icon={User}
                  title="Customer Information"
                  description="Choose the information customers need to provide."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Signup Fields
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Drag fields to change their order.
                      </p>
                    </div>

                    <button className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      <Plus className="h-4 w-4" />
                      Add Field
                    </button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field) => {
                      const Icon = field.icon

                      return (
                        <div
                          key={field.id}
                          className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-gray-300"
                        >
                          <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-gray-300" />

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                              {field.label}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {field.type}
                            </p>
                          </div>

                          <button
                            onClick={() => toggleRequired(field.id)}
                            className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:block ${
                              field.required
                                ? "bg-gray-100 text-gray-700"
                                : "bg-gray-50 text-gray-400"
                            }`}
                          >
                            {field.required ? "Required" : "Optional"}
                          </button>

                          <button
                            onClick={() => removeField(field.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition hover:border-gray-400 hover:bg-gray-50">
                    <Plus className="h-4 w-4" />
                    Add another field
                  </button>
                </section>
              </>
            )}

            {/* PRODUCTS */}
            {activeSection === "products" && (
              <>
                <EditorHeader
                  icon={Package}
                  title="Products"
                  description="Select which membership products customers can purchase."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Available Products
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Customers will choose one of these products during signup.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {products.map((product) => {
                      const selected = selectedProducts.includes(product.id)

                      return (
                        <button
                          key={product.id}
                          onClick={() => toggleProduct(product.id)}
                          className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                            selected
                              ? "border-gray-900 bg-gray-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                              selected
                                ? "border-gray-900 bg-gray-900"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {selected && (
                              <Check className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                            <Package className="h-5 w-5 text-gray-600" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Membership product
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-semibold text-gray-900">
                            {product.price}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                    <Plus className="h-4 w-4" />
                    Create New Product
                  </button>
                </section>
              </>
            )}

            {/* WAIVER */}
            {activeSection === "waiver" && (
              <>
                <EditorHeader
                  icon={FileText}
                  title="Legal Waiver"
                  description="Choose the waiver customers must accept before signup."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Signup Waiver
                  </label>

                  <div className="relative">
                    <select
                      value={selectedWaiverId}
                      onChange={(event) => {
                        const nextId = event.target.value
                        setSelectedWaiverId(nextId)

                        const selected = waivers.find(
                          (item) => item.id === nextId,
                        )

                        setWaiver(selected?.name || "No Waiver")
                      }}
                      className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm text-gray-700 outline-none focus:border-gray-400"
                    >
                      <option value="">No Waiver</option>

                      {waivers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />

                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {waiver}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Customers will need to review and agree to this waiver
                          before completing their signup.
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <Link
                            href="/waivers"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950"
                          >
                            Manage waivers
                            <ExternalLink className="h-3 w-3" />
                          </Link>

                          {waivers.length === 0 && (
                            <Link
                              href="/waivers/create"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-950"
                            >
                              Create waiver
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* APPEARANCE */}
            {activeSection === "appearance" && (
              <>
                <EditorHeader
                  icon={Palette}
                  title="Appearance"
                  description="Customize how your public signup page looks."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="mb-3 block text-sm font-semibold text-gray-800">
                        Page Style
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <StyleOption
                          active
                          title="Minimal"
                          description="Clean & simple"
                        />

                        <StyleOption
                          title="Modern"
                          description="Bold & polished"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-3 block text-sm font-semibold text-gray-800">
                        Button Style
                      </label>

                      <div className="grid grid-cols-3 gap-3">
                        <button className="h-11 rounded-xl bg-gray-950 text-xs font-semibold text-white">
                          Square
                        </button>

                        <button className="h-11 rounded-xl bg-gray-950 text-xs font-semibold text-white">
                          Rounded
                        </button>

                        <button className="h-11 rounded-full bg-gray-950 text-xs font-semibold text-white">
                          Pill
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* SETTINGS */}
            {activeSection === "settings" && (
              <>
                <EditorHeader
                  icon={Settings2}
                  title="Form Settings"
                  description="Control the availability and behavior of this form."
                />

                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Active Signup Form
                      </p>

                      <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">
                        When disabled, customers will no longer be able to
                        access this signup page.
                      </p>
                    </div>

                    <button
                      onClick={() => setActive(!active)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                        active ? "bg-gray-950" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                          active ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="my-6 border-t border-gray-100" />

                  <div className="space-y-4">
                    <SettingRow
                      title="Require email verification"
                      description="Ask customers to verify their email address."
                    />

                    <SettingRow
                      title="Allow returning members"
                      description="Allow existing members to use this signup form."
                    />

                    <SettingRow
                      title="Show gym branding"
                      description="Display your gym logo and branding on the public page."
                    />
                  </div>
                </section>
              </>
            )}
          </main>

          {/* RIGHT LIVE PREVIEW */}
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Live Preview
                  </p>

                  <p className="text-xs text-gray-400">Customer view</p>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <Eye className="h-4 w-4 text-gray-600" />
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                {/* Preview Header */}
                <div className="border-b border-gray-100 px-5 py-5">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-sm font-bold text-white">
                    G
                  </div>

                  <h2 className="text-xl font-semibold tracking-tight text-gray-950">
                    {formName}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {description}
                  </p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 px-5 pt-5">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-950" />
                  <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
                  <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
                </div>

                {/* Preview Form */}
                <div className="space-y-4 p-5">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-gray-900">
                      Your Information
                    </p>
                  </div>

                  {fields.slice(0, 4).map((field) => (
                    <div key={field.id}>
                      <label className="mb-1.5 block text-[11px] font-medium text-gray-600">
                        {field.label}
                        {field.required && (
                          <span className="ml-0.5 text-gray-400">*</span>
                        )}
                      </label>

                      <div className="h-10 rounded-lg border border-gray-200 bg-white px-3" />
                    </div>
                  ))}

                  <div className="pt-2">
                    <p className="mb-2 text-[11px] font-medium text-gray-600">
                      Select Membership
                    </p>

                    <div className="space-y-2">
                      {products
                        .filter((product) =>
                          selectedProducts.includes(product.id),
                        )
                        .slice(0, 2)
                        .map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                          >
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />

                            <div className="flex-1">
                              <p className="text-[11px] font-semibold text-gray-800">
                                {product.name}
                              </p>
                            </div>

                            <p className="text-[10px] font-semibold text-gray-700">
                              {product.price}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 h-3.5 w-3.5 rounded border border-gray-300 bg-white" />

                      <p className="text-[10px] leading-4 text-gray-500">
                        {waiver === "No Waiver"
                          ? "I agree to the gym terms."
                          : `I agree to the ${waiver} and gym terms.`}
                      </p>
                    </div>
                  </div>

                  <button className="h-10 w-full rounded-xl bg-gray-950 text-xs font-semibold text-white">
                    Continue to Checkout
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      active ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />

                  <p className="text-xs font-medium text-gray-600">
                    {active
                      ? "Public form is active"
                      : "Public form is disabled"}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile Save */}
        <div className="mt-6 flex gap-3 xl:hidden">
          <Link
            href="/signup-forms"
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"
          >
            Cancel
          </Link>

          <button
            onClick={handleSave}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-950 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------- */
/* Components */
/* -------------------------------- */

function SectionButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-gray-950 text-white"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function EditorHeader({
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950">
        <Icon className="h-5 w-5 text-white" />
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-950 sm:text-2xl">
          {title}
        </h1>

        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
      />
    </div>
  )
}

function StyleOption({
  active = false,
  title,
  description,
}: {
  active?: boolean
  title: string
  description: string
}) {
  return (
    <button
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-gray-950 bg-gray-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div
        className={`mb-3 h-16 rounded-lg ${
          active ? "bg-gray-950" : "bg-gray-200"
        }`}
      />

      <p className="text-sm font-semibold text-gray-900">{title}</p>

      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </button>
  )
}

function SettingRow({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>

        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>

      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-gray-950" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-5.5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  )
}
