"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CreditCard,
  Info,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
  UserPlus,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"

export type MemberFormData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  password?: string
  product: string
  status: string
  sendWelcomeEmail?: boolean
}

type MemberFormProps = {
  mode: "create" | "edit"
  memberId?: string | number
  initialData?: Partial<MemberFormData>
}

const defaultData: MemberFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  password: "",
  product: "",
  status: "Active",
  sendWelcomeEmail: true,
}

type Product = {
  id: string
  name: string
  price: number
  payment_type: "recurring" | "one-time"
  billing_interval: string | null
  active: boolean
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  icon?: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-gray-200 bg-white text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 ${icon ? "pl-9 pr-3" : "px-3"
            }`}
        />
      </div>
    </div>
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

export default function MemberForm({
  mode,
  memberId = "1",
  initialData,
}: MemberFormProps) {
  const [form, setForm] = useState<MemberFormData>({
    ...defaultData,
    ...initialData,
  })

  const router = useRouter()
  const { success: toastSuccess, error: toastError, loading: toastLoading, dismiss } = useToast()

  const [showPassword, setShowPassword] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = <K extends keyof MemberFormData>(
    key: K,
    value: MemberFormData[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  /*
   * Load active products for current gym
   */
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProductsLoading(true)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!user) {
          throw new Error("You must be logged in.")
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError) {
          throw profileError
        }

        if (!profile?.gym_id) {
          throw new Error("Gym information not found.")
        }

        const { data, error } = await supabase
          .from("products")
          .select(
            "id, name, price, payment_type, billing_interval, active",
          )
          .eq("gym_id", profile.gym_id)
          .eq("active", true)
          .order("name", { ascending: true })

        if (error) {
          throw error
        }

        setProducts(data ?? [])

        /*
         * If no product was selected yet, select the first active product.
         */
        if (!form.product && data && data.length > 0) {
          update("product", data[0].name)
        }
      } catch (error) {
        console.error("Failed to load products:", error)
        toastError("We couldn't load products. Please try again.")
      } finally {
        setProductsLoading(false)
      }
    }

    loadProducts()
  }, [])

  /*
   * If in edit mode, load existing member data from database
   */
  useEffect(() => {
    if (mode !== "edit" || !memberId) return

    const loadMember = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error("You must be logged in.")
        }

        const { data: currentProfile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (profileError || !currentProfile?.gym_id) {
          throw new Error("Gym information not found.")
        }

        const { data: member, error: memberError } = await supabase
          .from("members")
          .select(`
            id,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            state,
            postal_code,
            status
          `)
          .eq("id", String(memberId))
          .eq("gym_id", currentProfile.gym_id)
          .single()

        if (memberError || !member) {
          throw new Error("Member not found.")
        }

        /*
         * The create-member API stores the selected product in payments.
         * Load the latest payment that has a product_id, then resolve the
         * product name from products.
         */
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .select("product_id")
          .eq("member_id", String(memberId))
          .eq("gym_id", currentProfile.gym_id)
          .not("product_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (paymentError) {
          console.warn("Payment/product load warning:", paymentError)
        }

        let productName = ""

        if (payment?.product_id) {
          const { data: product, error: productError } = await supabase
            .from("products")
            .select("id, name")
            .eq("id", payment.product_id)
            .eq("gym_id", currentProfile.gym_id)
            .maybeSingle()

          if (productError) {
            console.warn("Product load warning:", productError)
          }

          productName = product?.name || ""
        }

        const memberStatus =
          member.status === "inactive"
            ? "Inactive"
            : member.status === "suspended"
              ? "Suspended"
              : "Active"

        setForm((prev) => ({
          ...prev,
          firstName: member.first_name || "",
          lastName: member.last_name || "",
          email: member.email || "",
          phone: member.phone || "",
          address: member.address || "",
          city: member.city || "",
          state: member.state || "",
          zip: member.postal_code || "",
          status: memberStatus,
          product: productName,
          password: "",
        }))
      } catch (error) {
        console.error("Failed to load member:", error)
        toastError("We couldn't load member details. Please try again.")
      }
    }

    loadMember()
  }, [mode, memberId])

  /*
   * Create or edit member
   */
  const handleSave = async () => {
    if (!form.firstName.trim()) {
      toastError("First name is required.")
      return
    }

    if (!form.lastName.trim()) {
      toastError("Last name is required.")
      return
    }

    if (!form.email.trim()) {
      toastError("Email is required.")
      return
    }

    setSaving(true)
    const toastId = toastLoading(mode === "edit" ? "Saving changes..." : "Creating member...")

    try {
      // =========================
      // GET CURRENT USER
      // =========================

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        dismiss(toastId)
        toastError("You must be logged in.")
        return
      }

      // =========================
      // GET CURRENT GYM
      // =========================

      const { data: currentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

      if (profileError || !currentProfile?.gym_id) {
        dismiss(toastId)
        toastError("Gym information not found.")
        return
      }

      // =========================
      // EDIT MEMBER
      // =========================

      if (mode === "edit") {
        if (!memberId) {
          dismiss(toastId)
          toastError("Member ID is missing.")
          return
        }

        const memberStatus =
          form.status.toLowerCase() === "inactive"
            ? "inactive"
            : form.status.toLowerCase() === "suspended"
              ? "suspended"
              : "active"

        const { error: memberUpdateError } = await supabase
          .from("members")
          .update({
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            postal_code: form.zip.trim(),
            status: memberStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", memberId)
          .eq("gym_id", currentProfile.gym_id)

        if (memberUpdateError) {
          throw new Error(memberUpdateError.message)
        }

        const profileStatus =
          form.status.toLowerCase() === "inactive"
            ? "inactive"
            : "active"

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            email: form.email.trim(),
            phone: form.phone.trim(),
            status: profileStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", memberId)
          .eq("gym_id", currentProfile.gym_id)
          .eq("role", "member")

        if (profileUpdateError) {
          throw new Error(profileUpdateError.message)
        }

        setSaved(true)
        dismiss(toastId)
        toastSuccess("Member updated successfully.")
        router.push(`/members/${memberId}`)
        return
      }

      // =========================
      // CREATE MEMBER
      // =========================

      const selectedProduct = products.find(
        (product) => product.name === form.product
      )

      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gymId: currentProfile.gym_id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          zip: form.zip.trim(),
          password: form.password,
          productId: selectedProduct?.id || null,
          status: form.status,
          sendWelcomeEmail: form.sendWelcomeEmail,
        }),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        console.error("Member API error:", result)

        const errorMessage =
          result?.message ||
          result?.error?.message ||
          result?.error?.details ||
          "Unable to create member."

        throw new Error(errorMessage)
      }

      setSaved(true)
      dismiss(toastId)
      toastSuccess("Member created successfully.")
      router.push("/members")
    } catch (error: unknown) {
      dismiss(toastId)

      console.error("Member save error:", error)

      const message =
        error instanceof Error
          ? error.message
          : "Unable to create member."

      const normalizedMessage = message.toLowerCase()

      if (
        normalizedMessage.includes("already exists") ||
        normalizedMessage.includes("duplicate") ||
        normalizedMessage.includes("unique")
      ) {
        toastError("A member with this email address already exists.")
      } else {
        toastError(message)
      }

    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!memberId) return
    const toastId = toastLoading("Deleting member...")
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete member.")
      }
      dismiss(toastId)
      toastSuccess("Member deleted successfully.")
      setShowDelete(false)
      router.push("/members")
    } catch {
      dismiss(toastId)
      toastError("We couldn't delete this member. Please try again.")
    }
  }

  const initials =
    `${form.firstName.charAt(0)}${form.lastName.charAt(0)}`.toUpperCase() ||
    "AM"

  const profileName =
    `${form.firstName} ${form.lastName}`.trim() || "Alex Member"

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={
                  mode === "edit"
                    ? `/members/${memberId}`
                    : "/members"
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50"
              >
                <ArrowLeft size={18} />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {mode === "edit" ? "Edit Member" : "Add Member"}
                  </h1>

                  {mode === "edit" && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                      Member #{String(memberId).padStart(3, "0")}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 text-sm text-gray-500">
                  {mode === "edit"
                    ? "Update member information and account settings."
                    : "Create a new gym member account."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={
                  mode === "edit"
                    ? `/members/${memberId}`
                    : "/members"
                }
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : saved ? (
                  <>
                    <Check size={17} />
                    Saved
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {mode === "edit"
                      ? "Save Changes"
                      : "Create Member"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Personal Information */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<User size={19} />}
                title="Personal Information"
                description={
                  mode === "edit"
                    ? "Update the member's basic information."
                    : "Basic information about the new member."
                }
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <InputField
                  label="First Name"
                  value={form.firstName}
                  onChange={(value) => update("firstName", value)}
                  placeholder="Alex"
                />

                <InputField
                  label="Last Name"
                  value={form.lastName}
                  onChange={(value) => update("lastName", value)}
                  placeholder="Johnson"
                />

                <InputField
                  label="Email Address"
                  value={form.email}
                  onChange={(value) => update("email", value)}
                  placeholder="alex@example.com"
                  type="email"
                  icon={<Mail size={16} />}
                />

                <InputField
                  label="Phone Number"
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                  placeholder="+1 (555) 123-4567"
                  icon={<Phone size={16} />}
                />
              </div>
            </section>

            {/* Address */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<MapPin size={19} />}
                title="Address"
                description="Member residential address."
              />

              <div className="space-y-5">
                <InputField
                  label="Street Address"
                  value={form.address}
                  onChange={(value) => update("address", value)}
                  placeholder="123 Main Street"
                />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <InputField
                    label="City"
                    value={form.city}
                    onChange={(value) => update("city", value)}
                    placeholder="New York"
                  />

                  <InputField
                    label="State"
                    value={form.state}
                    onChange={(value) => update("state", value)}
                    placeholder="NY"
                  />

                  <InputField
                    label="ZIP Code"
                    value={form.zip}
                    onChange={(value) => update("zip", value)}
                    placeholder="10001"
                  />
                </div>
              </div>
            </section>

            {/* Account */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<Lock size={18} />}
                title="Account"
                description="Manage member login credentials."
              />

              <div>
                <InputField
                  label={
                    mode === "edit"
                      ? "New Password"
                      : "Password"
                  }
                  value={form.password || ""}
                  onChange={(value) => update("password", value)}
                  placeholder={
                    mode === "edit"
                      ? "Leave blank to keep current"
                      : "Create a temporary password"
                  }
                  type={showPassword ? "text" : "password"}
                  icon={<Lock size={16} />}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mt-2 text-xs font-medium text-gray-500 hover:text-gray-900"
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>

                <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 p-3">
                  <Info
                    size={15}
                    className="mt-0.5 shrink-0 text-gray-500"
                  />

                  <p className="text-xs leading-5 text-gray-500">
                    {mode === "edit"
                      ? "Leave this field empty if you do not want to change the current password."
                      : "The member can change this password after signing in."}
                  </p>
                </div>
              </div>
            </section>

            {/* Membership */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <SectionHeader
                icon={<CreditCard size={18} />}
                title="Membership"
                description="Assign a product and account status."
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Product */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Product
                  </label>

                  <div className="relative">
                    <select
                      value={form.product}
                      onChange={(e) =>
                        update("product", e.target.value)
                      }
                      disabled={productsLoading}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                    >
                      {productsLoading ? (
                        <option value="">
                          Loading products...
                        </option>
                      ) : products.length === 0 ? (
                        <option value="">
                          No active products
                        </option>
                      ) : (
                        products.map((product) => (
                          <option
                            key={product.id}
                            value={product.name}
                          >
                            {product.name}
                          </option>
                        ))
                      )}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        update("status", e.target.value)
                      }
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                      <option>Pending</option>
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl bg-gray-50 p-4">
                <Info
                  size={17}
                  className="mt-0.5 shrink-0 text-gray-500"
                />

                <p className="text-xs leading-5 text-gray-500">
                  The selected product determines the member's
                  available gym and class access.
                </p>
              </div>
            </section>

            {/* Communication - Create only */}
            {mode === "create" && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeader
                  icon={<Mail size={18} />}
                  title="Communication"
                  description="Choose whether to send account information."
                />

                <button
                  type="button"
                  onClick={() =>
                    update(
                      "sendWelcomeEmail",
                      !form.sendWelcomeEmail,
                    )
                  }
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Send welcome email
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Send the member their account information.
                    </p>
                  </div>

                  <div
                    className={`relative h-6 w-11 shrink-0 rounded-full ${form.sendWelcomeEmail
                      ? "bg-gray-900"
                      : "bg-gray-200"
                      }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${form.sendWelcomeEmail
                        ? "left-6"
                        : "left-1"
                        }`}
                    />
                  </div>
                </button>
              </section>
            )}

            {/* Danger Zone - Edit only */}
            {mode === "edit" && (
              <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Trash2 size={18} />
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-red-700">
                      Danger Zone
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Permanently delete this member and their account
                      history.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowDelete(true)}
                  className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Delete Member
                </button>
              </section>
            )}

            {/* Mobile Actions */}
            <div className="flex flex-col gap-2 sm:hidden">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : saved ? (
                  <>
                    <Check size={17} />
                    Saved
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {mode === "edit"
                      ? "Save Changes"
                      : "Create Member"}
                  </>
                )}
              </button>

              <Link
                href={
                  mode === "edit"
                    ? `/members/${memberId}`
                    : "/members"
                }
                className="flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700"
              >
                Cancel
              </Link>
            </div>
          </div>

          {/* RIGHT */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-5">
              {/* Profile Preview */}
              <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="bg-gray-900 px-5 py-7 text-center text-white">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-xl font-bold text-gray-900">
                    {initials}
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    {profileName}
                  </h3>

                  <p className="mt-1 truncate text-xs text-gray-300">
                    {form.email || "member@example.com"}
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white">
                    {form.status}
                  </span>
                </div>

                <div className="space-y-5 p-5">
                  {/* Contact */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Contact
                    </p>

                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={14}
                          className="shrink-0 text-gray-400"
                        />

                        <span className="truncate text-xs text-gray-600">
                          {form.email || "member@example.com"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone
                          size={14}
                          className="shrink-0 text-gray-400"
                        />

                        <span className="text-xs text-gray-600">
                          {form.phone || "+1 (555) 000-0000"}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />

                        <span className="text-xs leading-5 text-gray-600">
                          {form.address || "Street Address"}
                          <br />
                          {form.city || "City"},{" "}
                          {form.state || "State"} {form.zip}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Membership */}
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Membership
                    </p>

                    <div className="mt-3 rounded-xl bg-gray-50 p-3">
                      <p className="text-sm font-semibold text-gray-800">
                        {form.product || "No product selected"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Current member product
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          Status
                        </span>

                        <span className="text-[10px] font-semibold text-gray-700">
                          {form.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account */}
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      Account
                    </p>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Portal Access
                      </span>

                      <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                        Enabled
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Information */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Info size={16} className="text-gray-600" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {mode === "edit"
                        ? "Editing member"
                        : "Adding a member"}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {mode === "edit"
                        ? "Changes will update this member's profile and account settings."
                        : "The member will receive access based on the selected product."}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </main>

      {/* Delete Modal */}
      {showDelete && mode === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={18} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Delete member?
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  This will permanently delete{" "}
                  <span className="font-semibold text-gray-700">
                    {profileName}
                  </span>{" "}
                  and their member history.
                </p>
              </div>

              <button
                onClick={() => setShowDelete(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowDelete(false)}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteMember}
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}