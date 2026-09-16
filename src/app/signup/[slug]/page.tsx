"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type CustomerField = {
  id?: string
  label: string
  type: "text" | "email" | "phone" | "date" | "number" | "textarea" | "select"
  required?: boolean
  placeholder?: string
  options?: string[]
}

type Product = {
  id?: string | number
  name: string
  price?: number | string
  description?: string
  payment_type?: string
  billing_interval?: string
}

type Waiver = {
  name?: string
  content?: string
  updatedAt?: string
}

type SignupForm = {
  id: string
  gym_id: string
  name: string
  description: string | null
  slug: string
  status: string
  selected_products: Product[] | null
  customer_fields: CustomerField[] | null
  waiver: Waiver | null
  waiver_id?: string | null
}

export default function PublicSignupPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const slug = params?.slug as string

  const [form, setForm] = useState<SignupForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form State
  const [values, setValues] = useState<Record<string, string>>({})
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [acceptedWaiver, setAcceptedWaiver] = useState(false)

  // Payment Details (Authorize.net)
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slug) return

    const loadForm = async () => {
      try {
        setLoading(true)
        setError("")

        const response = await fetch(`/api/signup?slug=${encodeURIComponent(slug)}`, {
          method: "GET",
          cache: "no-store",
        })
        const result = await response.json()

        if (!response.ok || !result?.success || !result?.form) {
          toast.error(result?.message || "This signup form is not available.")
          setError(result?.message || "This signup form is not available.")
          return
        }

        const loadedForm = result.form as SignupForm

        setForm(loadedForm)

        const initialValues: Record<string, string> = {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zip: "",
        }

        ;(loadedForm.customer_fields || []).forEach((field, index) => {
          const key = field.id || `field_${index}`
          initialValues[key] = ""
        })

        setValues(initialValues)

        const products = loadedForm.selected_products || []
        if (products.length > 0) {
          setSelectedProduct(String(products[0].id ?? products[0].name))
        }
      } catch (err) {
        console.error(err)
        toast.error("Something went wrong while loading the signup form.")
        setError("Something went wrong while loading the signup form.")
      } finally {
        setLoading(false)
      }
    }

    loadForm()
  }, [slug])

  const fields = useMemo(() => form?.customer_fields || [], [form])
  const products = useMemo(() => form?.selected_products || [], [form])
  const rawWaiver = form?.waiver

  // Dynamic variable replacement for waiver: [first_name], [last_name], [date], {{first_name}}, etc.
  const resolvedWaiverContent = useMemo(() => {
    if (!rawWaiver?.content) return ""
    const firstName = values.firstName || values["First Name"] || "Member"
    const lastName = values.lastName || values["Last Name"] || ""
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    return rawWaiver.content
      .replace(/\[first_name\]/gi, firstName)
      .replace(/\[last_name\]/gi, lastName)
      .replace(/\[date\]/gi, today)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{last_name\}\}/gi, lastName)
      .replace(/\{\{date\}\}/gi, today)
  }, [rawWaiver, values])

  const updateValue = (key: string, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }))

    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const selectedProductObj = useMemo(() => {
    return products.find(
      (p) => String(p.id ?? p.name) === String(selectedProduct)
    )
  }, [products, selectedProduct])

  const productPrice = Number(selectedProductObj?.price || 0)

  const validateForm = () => {
    if (!form) return false
    const errors: Record<string, string> = {}

    const firstName = values.firstName || values["First Name"]
    const lastName = values.lastName || values["Last Name"]
    const email = values.email || values["Email"]

    if (!firstName?.trim()) errors.firstName = "First name is required."
    if (!lastName?.trim()) errors.lastName = "Last name is required."
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "A valid email address is required."
    }

    if (!password) {
      errors.password = "Password is required."
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters."
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match."
    }

    if (products.length > 0 && !selectedProduct) {
      errors.product = "Please select a membership product."
    }

    if (rawWaiver?.content && !acceptedWaiver) {
      errors.waiver = "You must read and agree to the waiver to proceed."
    }

    if (productPrice > 0) {
      if (!cardNumber.replace(/\D/g, "")) {
        errors.cardNumber = "Card number is required."
      }
      if (!cardExpiry.replace(/\D/g, "")) {
        errors.cardExpiry = "Expiry date is required."
      }
      if (!cardCvv.replace(/\D/g, "")) {
        errors.cardCvv = "CVV is required."
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form) {
      toast.error("Signup form not found.")
      return
    }

    if (!validateForm()) {
      toast.error("Please fill in all required fields highlighted below.")
      return
    }

    const email = (values.email || values["Email"] || "").trim().toLowerCase()
    const firstName = (values.firstName || values["First Name"] || "").trim()
    const lastName = (values.lastName || values["Last Name"] || "").trim()
    const fullName = `${firstName} ${lastName}`.trim()

    const toastId = toast.loading("Processing your registration...")
    setSubmitting(true)

    try {
      // 1. Create submission snapshot
      const { data: submission, error: submissionError } = await supabase
        .from("signup_submissions")
        .insert({
          signup_form_id: form.id,
          gym_id: form.gym_id,
          customer_data: {
            ...values,
            firstName,
            lastName,
            email,
          },
          selected_product: selectedProduct || null,
          waiver_accepted: rawWaiver ? acceptedWaiver : false,
          waiver_snapshot: rawWaiver
            ? {
                ...rawWaiver,
                resolvedContent: resolvedWaiverContent,
                signedAt: new Date().toISOString(),
              }
            : null,
          status: "pending",
        })
        .select("id")
        .single()

      if (submissionError || !submission) {
        throw new Error(submissionError?.message || "Unable to save signup submission.")
      }

      // 2. Call server-side signup & payment processor
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          signupFormId: form.id,
          gymId: form.gym_id,
          email,
          fullName,
          password,
          customerData: {
            ...values,
            firstName,
            lastName,
          },
          selectedProduct,
          paymentData:
            productPrice > 0
              ? {
                  cardNumber: cardNumber.replace(/\D/g, ""),
                  expirationDate: cardExpiry.replace(/\D/g, ""),
                  cvv: cardCvv.trim(),
                }
              : null,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Registration failed. Please check your payment details.")
      }

      // 3. Immediately sign in session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.warn("Auto-login notice:", signInError.message)
      }

      // 4. Redirect directly to Member Dashboard
      toast.dismiss(toastId)
      toast.success("Registration successful! Welcome to the gym.")
      router.push("/member")
    } catch (err: any) {
      console.error("Signup error:", err)
      toast.dismiss(toastId)
      toast.error(err.message || "Something went wrong while processing registration.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-5">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading registration form...
        </div>
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="mt-5 text-xl font-semibold text-slate-950">
              Signup Form Unavailable
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* BRAND HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">{form?.name}</p>
              <p className="text-[11px] text-slate-400">Membership Registration</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Secure Authorize.Net Checkout
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-12">
        {/* INTRO */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <FileText className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {form?.name}
          </h1>
          {form?.description && (
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {form.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Registration is open
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: PERSONAL INFORMATION */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">
                    Personal Information
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Your account and contact details
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={values.firstName || ""}
                    onChange={(e) => updateValue("firstName", e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={values.lastName || ""}
                    onChange={(e) => updateValue("lastName", e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={values.email || ""}
                    onChange={(e) => updateValue("email", e.target.value)}
                    placeholder="john.doe@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={values.phone || ""}
                    onChange={(e) => updateValue("phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={values.address || ""}
                    onChange={(e) => updateValue("address", e.target.value)}
                    placeholder="123 Fitness St"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={values.city || ""}
                      onChange={(e) => updateValue("city", e.target.value)}
                      placeholder="Dallas"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={values.state || ""}
                      onChange={(e) => updateValue("state", e.target.value)}
                      placeholder="TX"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Zip</label>
                    <input
                      type="text"
                      value={values.zip || ""}
                      onChange={(e) => updateValue("zip", e.target.value)}
                      placeholder="75001"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-10 text-sm focus:border-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: LEGAL WAIVER */}
          {rawWaiver?.content && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
                    <FileText className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">
                      {rawWaiver.name || "Legal Waiver & Release of Liability"}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Please review carefully before signing
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                  {resolvedWaiverContent}
                </div>

                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedWaiver}
                    onChange={(e) => setAcceptedWaiver(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    I have read, understood, and agree to the terms of the waiver agreement.
                  </span>
                </label>
                {fieldErrors.waiver && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.waiver}</p>
                )}
              </div>
            </section>
          )}

          {/* SECTION 3: PRODUCT SELECTION */}
          {products.length > 0 && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">
                      Select Membership Plan
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Choose your access tier
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 space-y-3">
                {products.map((product, index) => {
                  // Use a guaranteed unique React key even when Supabase
                  // returns a product without an id or name.
                  const productIdentity =
                    product.id != null
                      ? String(product.id)
                      : product.name?.trim()
                        ? product.name.trim()
                        : `product-${index}`

                  const pid = `signup-product-${productIdentity}-${index}`
                  const selectionId =
                    product.id != null
                      ? String(product.id)
                      : product.name?.trim()
                        ? product.name.trim()
                        : `product-${index}`

                  const isSelected = selectedProduct === selectionId
                  const price = Number(product.price || 0)

                  return (
                    <div
                      key={pid}
                      onClick={() => setSelectedProduct(selectionId)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{product.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-slate-900">${price.toFixed(2)}</p>
                        <p className="text-[11px] text-slate-400 capitalize">
                          {product.billing_interval || product.payment_type || "one-time"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* SECTION 4: AUTHORIZE.NET CHECKOUT */}
          {productPrice > 0 && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-5 sm:px-7 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                    <Lock className="h-4 w-4 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">
                      Payment Details
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Secured by Authorize.Net Gateway
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  Total: ${productPrice.toFixed(2)}
                </span>
              </div>

              <div className="p-5 sm:p-7 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Card Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4007 0000 0002 0027"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                  />
                  {fieldErrors.cardNumber && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.cardNumber}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Expiry Date (MM/YY) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                    {fieldErrors.cardExpiry && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.cardExpiry}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Security Code (CVV) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                    />
                    {fieldErrors.cardCvv && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.cardCvv}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing Registration & Payment...
              </>
            ) : (
              <>
                Complete Membership Registration
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
