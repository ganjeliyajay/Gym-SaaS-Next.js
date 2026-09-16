"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  Eye,
  Info,
  Percent,
  Save,
  Tag,
  Trash2,
  Users,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type PaymentType = "recurring" | "one-time"
type AccessType = "full" | "visits" | "none"
type ClassAccess = "all" | "selected" | "none"
type DurationType = "ongoing" | "limited" | "periodic"
type DiscountType = "percentage" | "fixed"

export type ProductFormData = {
  name: string
  description: string
  paymentType: PaymentType
  price: string
  billingInterval: string
  accessType: AccessType
  visitLimit: string
  classAccess: ClassAccess
  selectedClasses: string[]
  durationType: DurationType
  durationValue: string
  durationUnit: string
  discountEnabled: boolean
  discountType: DiscountType
  discountValue: string
  active: boolean
}

type ProductFormProps = {
  mode: "create" | "edit"
  initialData?: Partial<ProductFormData> & {
    id?: string
  }
}

const defaultData: ProductFormData = {
  name: "",
  description: "",
  paymentType: "recurring",
  price: "",
  billingInterval: "monthly",
  accessType: "full",
  visitLimit: "10",
  classAccess: "all",
  selectedClasses: [],
  durationType: "ongoing",
  durationValue: "30",
  durationUnit: "days",
  discountEnabled: false,
  discountType: "percentage",
  discountValue: "",
  active: true,
}

type ClassOption = {
  id: string
  name: string
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
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  prefix?: string
  suffix?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {prefix}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${prefix ? "pl-8 pr-3" : suffix ? "pl-3 pr-16" : "px-3"
            }`}
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export default function ProductForm({
  mode,
  initialData,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>({
    ...defaultData,
    ...initialData,
  })

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [currency, setCurrency] = useState("INR")
  const [loadingClasses, setLoadingClasses] = useState(false)

  const toast = useToast()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const update = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  useEffect(() => {
    let mounted = true

    const loadCurrency = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile?.gym_id) return

      const { data: settings } = await supabase
        .from("gym_settings")
        .select("currency")
        .eq("gym_id", profile.gym_id)
        .maybeSingle()

      if (mounted) setCurrency(settings?.currency || "INR")
    }

    loadCurrency()

    const loadClasses = async () => {
      if (form.classAccess !== "selected") {
        return
      }

      try {
        setLoadingClasses(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (!profile?.gym_id) {
          return
        }

        /*
         * Calendar/classes may not be database-backed yet.
         * Therefore we only try to load actual DB classes.
         * No demo/fake classes are shown.
         */
        const { data, error: classesError } = await supabase
          .from("classes")
          .select("id, title")
          .eq("gym_id", profile.gym_id)
          .order("title", { ascending: true })

        if (classesError) {
          return
        }

        if (!mounted) {
          return
        }

        setClasses(
          (data ?? []).map((item) => ({
            id: String(item.id),
            name: String(item.title),
          })),
        )
      } finally {
        if (mounted) {
          setLoadingClasses(false)
        }
      }
    }

    loadClasses()

    return () => {
      mounted = false
    }
  }, [form.classAccess])

  const toggleClass = (classId: string) => {
    setForm((prev) => {
      const exists = prev.selectedClasses.includes(classId)

      return {
        ...prev,
        selectedClasses: exists
          ? prev.selectedClasses.filter((item) => item !== classId)
          : [...prev.selectedClasses, classId],
      }
    })
  }

  const formattedPrice = useMemo(() => {
    const price = Number(form.price || 0)

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number.isNaN(price) ? 0 : price)
    } catch {
      return `${currency} ${Number.isNaN(price) ? "0.00" : price.toFixed(2)}`
    }
  }, [form.price, currency])

  const billingLabel =
    {
      weekly: "week",
      monthly: "month",
      quarterly: "quarter",
      yearly: "year",
    }[form.billingInterval] ?? "month"

  const handleSave = async () => {
    setSaved(false)

    if (!form.name.trim()) {
      toast.error("Product name is required.")
      return
    }

    const price = Number(form.price)

    if (
      form.price.trim() === "" ||
      Number.isNaN(price) ||
      price < 0
    ) {
      toast.error("Please enter a valid product price.")
      return
    }

    if (
      form.accessType === "visits" &&
      (!form.visitLimit.trim() ||
        Number.isNaN(Number(form.visitLimit)) ||
        Number(form.visitLimit) <= 0)
    ) {
      toast.error("Please enter a valid number of visits.")
      return
    }

    if (
      form.durationType === "limited" &&
      (!form.durationValue.trim() ||
        Number.isNaN(Number(form.durationValue)) ||
        Number(form.durationValue) <= 0)
    ) {
      toast.error("Please enter a valid duration.")
      return
    }

    if (
      form.discountEnabled &&
      (!form.discountValue.trim() ||
        Number.isNaN(Number(form.discountValue)) ||
        Number(form.discountValue) < 0)
    ) {
      toast.error("Please enter a valid discount value.")
      return
    }

    if (
      form.discountEnabled &&
      form.discountType === "percentage" &&
      Number(form.discountValue) > 100
    ) {
      toast.error("Percentage discount cannot be greater than 100%.")
      return
    }

    if (
      form.classAccess === "selected" &&
      form.selectedClasses.length === 0
    ) {
      toast.error("Please select at least one class.")
      return
    }

    const toastId = toast.loading(
      mode === "create" ? "Creating product..." : "Saving changes...",
    )

    try {
      setSaving(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in to manage products.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile could not be found.")
      }

      if (!["admin", "manager"].includes(profile.role)) {
        throw new Error(
          "You do not have permission to manage products.",
        )
      }

      const productData = {
        gym_id: profile.gym_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        payment_type: form.paymentType,
        price,
        billing_interval:
          form.paymentType === "one-time"
            ? null
            : form.billingInterval,
        access_type: form.accessType,
        visit_limit:
          form.accessType === "visits"
            ? Number(form.visitLimit)
            : null,
        class_access: form.classAccess,
        selected_classes:
          form.classAccess === "selected"
            ? form.selectedClasses
            : [],
        duration_type: form.durationType,
        duration_value:
          form.durationType === "limited"
            ? Number(form.durationValue)
            : null,
        duration_unit:
          form.durationType === "limited"
            ? form.durationUnit
            : null,
        discount_enabled: form.discountEnabled,
        discount_type: form.discountEnabled
          ? form.discountType
          : null,
        discount_value: form.discountEnabled
          ? Number(form.discountValue)
          : null,
        active: form.active,
      }

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("products")
          .insert(productData)

        if (insertError) {
          throw new Error(insertError.message)
        }
      } else {
        const productId = initialData?.id

        if (!productId) {
          throw new Error("Product ID is missing.")
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({
            ...productData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId)
          .eq("gym_id", profile.gym_id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      setSaved(true)
      toast.dismiss(toastId)
      toast.success(
        mode === "create"
          ? "Product created successfully!"
          : "Product updated successfully!",
      )

      setTimeout(() => {
        window.location.href = "/products"
      }, 900)
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the product.",
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (mode !== "edit" || !initialData?.id) {
      return
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    )

    if (!confirmed) {
      return
    }

    const toastId = toast.loading("Deleting product...")

    try {
      setDeleting(true)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("You must be logged in.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile could not be found.")
      }

      if (!["admin", "manager"].includes(profile.role)) {
        throw new Error(
          "You do not have permission to delete products.",
        )
      }

      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", initialData.id)
        .eq("gym_id", profile.gym_id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      toast.dismiss(toastId)
      toast.success("Product deleted successfully!")
      window.location.href = "/products"
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong while deleting the product.",
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={
                  mode === "edit"
                    ? `/products/${initialData?.id ?? ""}`
                    : "/products"
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
              >
                <ArrowLeft size={18} />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {mode === "edit"
                      ? "Edit Product"
                      : "Create Product"}
                  </h1>

                  {mode === "edit" && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                      Editing
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-sm text-gray-500">
                  {mode === "edit"
                    ? "Update your membership product and access rules."
                    : "Create a new membership or service product."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={
                  mode === "edit"
                    ? `/products/${initialData?.id ?? ""}`
                    : "/products"
                }
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saved ? (
                  <Check size={17} />
                ) : (
                  <Save size={17} />
                )}

                {saved
                  ? "Saved"
                  : saving
                    ? "Saving..."
                    : mode === "edit"
                      ? "Save Changes"
                      : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Basic Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Tag size={19} />}
                title="Basic Information"
                description="Add the basic details customers will see."
              />

              <div className="space-y-5">
                <InputField
                  label="Product Name"
                  value={form.name}
                  onChange={(value) => update("name", value)}
                  placeholder="e.g. Monthly Membership"
                />

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      update("description", e.target.value)
                    }
                    rows={4}
                    placeholder="Describe what members get with this product..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    Keep this short and easy to understand.
                  </p>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Dumbbell size={19} />}
                title="Pricing"
                description="Configure how customers pay for this product."
              />

              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-gray-700">
                  Payment Type
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: "recurring" as PaymentType,
                      title: "Recurring",
                      description:
                        "Charge members automatically.",
                    },
                    {
                      value: "one-time" as PaymentType,
                      title: "One-time",
                      description: "Charge the member once.",
                    },
                  ].map((item) => {
                    const selected =
                      form.paymentType === item.value

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          update("paymentType", item.value)
                        }
                        className={`rounded-xl border p-4 text-left transition ${selected
                            ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                            : "border-gray-200 hover:border-gray-300"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">
                            {item.title}
                          </span>

                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-300"
                              }`}
                          >
                            {selected && <Check size={12} />}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-gray-500">
                          {item.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField
                  label="Price"
                  value={form.price}
                  onChange={(value) => update("price", value)}
                  placeholder="49"
                  type="number"
                  prefix={
                    new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                      .formatToParts(0)
                      .find((part) => part.type === "currency")?.value || currency
                  }
                />

                <SelectField
                  label="Billing Interval"
                  value={form.billingInterval}
                  onChange={(value) =>
                    update("billingInterval", value)
                  }
                  disabled={form.paymentType === "one-time"}
                  options={[
                    { label: "Weekly", value: "weekly" },
                    { label: "Monthly", value: "monthly" },
                    { label: "Quarterly", value: "quarterly" },
                    { label: "Yearly", value: "yearly" },
                  ]}
                />
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0 text-gray-500"
                />

                <p className="text-xs leading-5 text-gray-500">
                  {form.paymentType === "recurring"
                    ? "Members will be charged automatically based on the selected billing interval."
                    : "Members will be charged once when they purchase this product."}
                </p>
              </div>
            </section>

            {/* Access */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Users size={19} />}
                title="Gym Access"
                description="Define what members can access with this product."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "full" as AccessType,
                    title: "Full Access",
                    description: "Unlimited gym access.",
                  },
                  {
                    value: "visits" as AccessType,
                    title: "Visit Limit",
                    description: "Limit number of visits.",
                  },
                  {
                    value: "none" as AccessType,
                    title: "No Gym Access",
                    description: "Service or class only.",
                  },
                ].map((item) => {
                  const selected =
                    form.accessType === item.value

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        update("accessType", item.value)
                      }
                      className={`rounded-xl border p-4 text-left transition ${selected
                          ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                          : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300"
                            }`}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {item.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {form.accessType === "visits" && (
                <div className="mt-5 max-w-sm">
                  <InputField
                    label="Number of Visits"
                    value={form.visitLimit}
                    onChange={(value) =>
                      update("visitLimit", value)
                    }
                    type="number"
                    placeholder="10"
                    suffix="visits"
                  />
                </div>
              )}
            </section>

            {/* Class Access */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Dumbbell size={19} />}
                title="Class Access"
                description="Choose which classes members can book."
              />

              <SelectField
                label="Class Access"
                value={form.classAccess}
                onChange={(value) =>
                  update("classAccess", value as ClassAccess)
                }
                options={[
                  { label: "All Classes", value: "all" },
                  {
                    label: "Selected Classes",
                    value: "selected",
                  },
                  {
                    label: "No Class Access",
                    value: "none",
                  },
                ]}
              />

              {form.classAccess === "selected" && (
                <div className="mt-5">
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Select Classes
                  </label>

                  {loadingClasses ? (
                    <div className="rounded-xl border border-gray-200 px-4 py-4 text-sm text-gray-500">
                      Loading classes...
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                      No classes are available yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {classes.map((item) => {
                        const selected =
                          form.selectedClasses.includes(
                            item.id,
                          )

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              toggleClass(item.id)
                            }
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${selected
                                ? "border-gray-900 bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                              }`}
                          >
                            <span className="text-sm font-medium text-gray-800">
                              {item.name}
                            </span>

                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-md border ${selected
                                  ? "border-gray-900 bg-gray-900 text-white"
                                  : "border-gray-300"
                                }`}
                            >
                              {selected && (
                                <Check size={12} />
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Duration */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Clock3 size={19} />}
                title="Duration"
                description="Control how long the product remains active."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "ongoing" as DurationType,
                    title: "Ongoing",
                    description: "Continues until cancelled.",
                  },
                  {
                    value: "limited" as DurationType,
                    title: "Limited Duration",
                    description: "Ends after a set period.",
                  },
                  {
                    value: "periodic" as DurationType,
                    title: "Periodic",
                    description:
                      "Renew for defined periods.",
                  },
                ].map((item) => {
                  const selected =
                    form.durationType === item.value

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        update("durationType", item.value)
                      }
                      className={`rounded-xl border p-4 text-left transition ${selected
                          ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                          : "border-gray-200 hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </span>

                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300"
                            }`}
                        >
                          {selected && <Check size={12} />}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {item.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {form.durationType === "limited" && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField
                    label="Duration"
                    value={form.durationValue}
                    onChange={(value) =>
                      update("durationValue", value)
                    }
                    type="number"
                    placeholder="30"
                  />

                  <SelectField
                    label="Unit"
                    value={form.durationUnit}
                    onChange={(value) =>
                      update("durationUnit", value)
                    }
                    options={[
                      { label: "Days", value: "days" },
                      { label: "Weeks", value: "weeks" },
                      { label: "Months", value: "months" },
                    ]}
                  />
                </div>
              )}

              {form.durationType === "periodic" && (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                  <Info
                    size={17}
                    className="mt-0.5 text-gray-500"
                  />

                  <p className="text-sm leading-6 text-gray-600">
                    Periodic products can be configured to run for
                    a defined period and renew according to the
                    billing schedule.
                  </p>
                </div>
              )}
            </section>

            {/* Discount */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Percent size={19} />}
                title="Discount"
                description="Optionally apply a discount to this product."
              />

              <button
                type="button"
                onClick={() =>
                  update(
                    "discountEnabled",
                    !form.discountEnabled,
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-gray-300"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Enable discount
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Apply a discount automatically when purchasing.
                  </p>
                </div>

                <div
                  className={`relative h-6 w-11 rounded-full transition ${form.discountEnabled
                      ? "bg-gray-900"
                      : "bg-gray-200"
                    }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.discountEnabled
                        ? "left-6"
                        : "left-1"
                      }`}
                  />
                </div>
              </button>

              {form.discountEnabled && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Discount Type"
                    value={form.discountType}
                    onChange={(value) =>
                      update(
                        "discountType",
                        value as DiscountType,
                      )
                    }
                    options={[
                      {
                        label: "Percentage",
                        value: "percentage",
                      },
                      {
                        label: "Fixed Amount",
                        value: "fixed",
                      },
                    ]}
                  />

                  <InputField
                    label="Discount Value"
                    value={form.discountValue}
                    onChange={(value) =>
                      update("discountValue", value)
                    }
                    type="number"
                    placeholder={
                      form.discountType === "percentage"
                        ? "10"
                        : "5"
                    }
                    prefix={
                      form.discountType === "fixed"
                        ? "$"
                        : undefined
                    }
                    suffix={
                      form.discountType === "percentage"
                        ? "%"
                        : undefined
                    }
                  />
                </div>
              )}
            </section>

            {/* Settings */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Info size={19} />}
                title="Settings"
                description="Control the availability of this product."
              />

              <button
                type="button"
                onClick={() =>
                  update("active", !form.active)
                }
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left transition hover:border-gray-300"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Product is active
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Active products can be purchased by members.
                  </p>
                </div>

                <div
                  className={`relative h-6 w-11 rounded-full transition ${form.active ? "bg-gray-900" : "bg-gray-200"
                    }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.active ? "left-6" : "left-1"
                      }`}
                  />
                </div>
              </button>
            </section>

            {/* Delete */}
            {mode === "edit" && (
              <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Delete Product
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Permanently remove this product from your gym.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    {deleting
                      ? "Deleting..."
                      : "Delete Product"}
                  </button>
                </div>
              </section>
            )}

            {/* Mobile Save */}
            <div className="flex flex-col gap-2 sm:hidden">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saved ? (
                  <Check size={17} />
                ) : (
                  <Save size={17} />
                )}

                {saved
                  ? "Saved"
                  : saving
                    ? "Saving..."
                    : mode === "edit"
                      ? "Save Changes"
                      : "Create Product"}
              </button>

              <Link
                href={
                  mode === "edit"
                    ? `/products/${initialData?.id ?? ""}`
                    : "/products"
                }
                className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700"
              >
                Cancel
              </Link>
            </div>
          </div>

          {/* RIGHT PREVIEW */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Eye
                        size={17}
                        className="text-gray-600"
                      />

                      <h2 className="text-sm font-semibold text-gray-900">
                        Live Preview
                      </h2>
                    </div>

                    <p className="mt-1 text-xs text-gray-500">
                      Customer-facing product
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${form.active
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    {form.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200">
                  <div className="bg-gray-900 p-5 text-white">
                    <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Dumbbell size={20} />
                    </div>

                    <h3 className="text-xl font-semibold">
                      {form.name || "Product Name"}
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-gray-300">
                      {form.description ||
                        "Your product description will appear here."}
                    </p>
                  </div>

                  <div className="space-y-5 bg-white p-5">
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        {formattedPrice}
                      </span>

                      {form.paymentType === "recurring" && (
                        <span className="ml-1 text-sm text-gray-500">
                          / {billingLabel}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <Users size={15} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Gym Access
                          </p>

                          <p className="text-sm font-medium text-gray-800">
                            {form.accessType === "full"
                              ? "Full Access"
                              : form.accessType === "visits"
                                ? `${form.visitLimit || "0"} Visits`
                                : "No Gym Access"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <Dumbbell size={15} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Classes
                          </p>

                          <p className="text-sm font-medium text-gray-800">
                            {form.classAccess === "all"
                              ? "All Classes"
                              : form.classAccess === "selected"
                                ? `${form.selectedClasses.length} Selected`
                                : "No Class Access"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                          <Clock3 size={15} />
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Duration
                          </p>

                          <p className="text-sm font-medium text-gray-800">
                            {form.durationType === "ongoing"
                              ? "Ongoing"
                              : form.durationType === "limited"
                                ? `${form.durationValue || "0"} ${form.durationUnit}`
                                : "Periodic"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {form.discountEnabled &&
                      form.discountValue && (
                        <div className="rounded-xl bg-gray-50 p-3">
                          <div className="flex items-center gap-2">
                            <Percent size={14} />

                            <span className="text-xs font-semibold text-gray-700">
                              {form.discountValue}
                              {form.discountType ===
                                "percentage"
                                ? "% discount"
                                : " discount"}
                            </span>
                          </div>
                        </div>
                      )}

                    <button
                      type="button"
                      className="h-11 w-full rounded-xl bg-gray-900 text-sm font-semibold text-white"
                    >
                      {mode === "edit"
                        ? "Update Product"
                        : "Get Started"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Product Summary
                </h3>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Payment
                    </span>

                    <span className="font-medium capitalize text-gray-800">
                      {form.paymentType === "one-time"
                        ? "One-time"
                        : "Recurring"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Access
                    </span>

                    <span className="font-medium text-gray-800">
                      {form.accessType === "full"
                        ? "Full Access"
                        : form.accessType === "visits"
                          ? `${form.visitLimit} Visits`
                          : "No Access"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Classes
                    </span>

                    <span className="font-medium text-gray-800">
                      {form.classAccess === "all"
                        ? "All"
                        : form.classAccess === "selected"
                          ? form.selectedClasses.length
                          : "None"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Duration
                    </span>

                    <span className="font-medium text-gray-800">
                      {form.durationType === "ongoing"
                        ? "Ongoing"
                        : form.durationType === "limited"
                          ? `${form.durationValue} ${form.durationUnit}`
                          : "Periodic"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                    <span className="text-gray-500">
                      Status
                    </span>

                    <span className="font-medium text-gray-800">
                      {form.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}