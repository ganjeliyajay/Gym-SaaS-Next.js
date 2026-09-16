"use client"

import React, { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  Palette,
  Upload,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  Globe2,
  RotateCcw,
  Building2,
} from "lucide-react"

export default function BrandingSettingsPage() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gymId, setGymId] = useState("")

  const [form, setForm] = useState({
    brandName: "",
    primaryColor: "#111827",
    secondaryColor: "#F3F4F6",
    accentColor: "#22C55E",
    customDomain: "",
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [gymSlug, setGymSlug] = useState("")
  const [subdomainError, setSubdomainError] = useState("")
  const [verifyingDomain, setVerifyingDomain] = useState(false)
  const [domainRecord, setDomainRecord] = useState<{
    status: string
    token?: string
    dnsInstructions?: any
    verifiedAt?: string | null
    errorMessage?: string | null
  } | null>(null)

  useEffect(() => {
    let active = true

    const loadBranding = async () => {
      setLoading(true)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError
        if (!user) throw new Error("You must be logged in.")

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile?.gym_id) throw new Error("Gym information was not found.")

        const [{ data: gym }, { data: branding, error: brandingError }, { data: domainData }] =
          await Promise.all([
            supabase.from("gyms").select("slug").eq("id", profile.gym_id).maybeSingle(),
            supabase
              .from("gym_branding")
              .select("brand_name, primary_color, secondary_color, accent_color, custom_domain, logo_url")
              .eq("gym_id", profile.gym_id)
              .maybeSingle(),
            supabase
              .from("domains")
              .select("*")
              .eq("gym_id", profile.gym_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ])

        if (brandingError) throw brandingError
        if (!active) return

        setGymId(profile.gym_id)
        if (gym?.slug) setGymSlug(gym.slug)

        if (branding) {
          setForm({
            brandName: branding.brand_name || "",
            primaryColor: branding.primary_color || "#111827",
            secondaryColor: branding.secondary_color || "#F3F4F6",
            accentColor: branding.accent_color || "#22C55E",
            customDomain: branding.custom_domain || "",
          })
          setLogoPreview(branding.logo_url || null)
        }

        if (domainData) {
          setDomainRecord({
            status: domainData.verification_status,
            token: domainData.verification_token,
            dnsInstructions: domainData.dns_instructions,
            verifiedAt: domainData.verified_at,
            errorMessage: domainData.error_message,
          })
        }
      } catch (err) {
        if (active) {
          toast.error(err instanceof Error ? err.message : "Failed to load branding settings.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadBranding()

    return () => {
      active = false
    }
  }, [toast])

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    const preview = URL.createObjectURL(file)
    setLogoPreview(preview)
    toast.info("Logo preview selected. Remember to save changes to update your branding.")
  }

  const handleUpdateSubdomain = (newSlug: string) => {
    setSubdomainError("")
    const cleanSlug = newSlug.toLowerCase().trim()
    setGymSlug(cleanSlug)

    const RESERVED = new Set(["www", "app", "admin", "api", "dashboard", "super-admin", "auth", "mail", "support"])
    if (RESERVED.has(cleanSlug)) {
      setSubdomainError(`"${cleanSlug}" is a reserved system subdomain and cannot be assigned.`)
      return
    }

    const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
    if (cleanSlug && !slugRegex.test(cleanSlug)) {
      setSubdomainError("Subdomain can only contain lowercase letters, numbers, and hyphens.")
      return
    }
  }

  const handleVerifyCustomDomain = async () => {
    if (!form.customDomain.trim()) {
      toast.error("Please enter a custom domain to verify.")
      return
    }

    setVerifyingDomain(true)
    const toastId = toast.loading("Verifying custom domain DNS...")

    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: form.customDomain.trim(), action: "verify" }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Domain verification failed.")
      }

      setDomainRecord({
        status: data.status,
        verifiedAt: data.verifiedAt,
        dnsInstructions: data.dnsInstructions,
        errorMessage: data.error,
      })

      toast.dismiss(toastId)
      if (data.status === "verified") {
        toast.success("Domain verified and routing traffic successfully!")
      } else {
        toast.warning("Domain DNS records are still pending verification.")
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message || "Failed to verify domain.")
    } finally {
      setVerifyingDomain(false)
    }
  }

  const handleSave = async () => {
    if (!gymId) {
      toast.error("Gym information was not found. Please refresh the page and try again.")
      return
    }

    if (subdomainError) {
      toast.error(subdomainError)
      return
    }

    setSaving(true)
    const toastId = toast.loading("Saving branding settings...")

    try {
      // 1. Update gym slug if valid
      if (gymSlug) {
        const { error: gymError } = await supabase
          .from("gyms")
          .update({ slug: gymSlug, updated_at: new Date().toISOString() })
          .eq("id", gymId)

        if (gymError) throw gymError
      }

      // 2. Update branding
      const { error: saveError } = await supabase
        .from("gym_branding")
        .upsert(
          {
            gym_id: gymId,
            brand_name: form.brandName.trim() || null,
            primary_color: form.primaryColor,
            secondary_color: form.secondaryColor,
            accent_color: form.accentColor,
            custom_domain: form.customDomain.trim() || null,
            logo_url: logoPreview || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "gym_id" }
        )

      if (saveError) throw saveError

      toast.dismiss(toastId)
      toast.success("Branding settings saved successfully.")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(err instanceof Error ? err.message : "Failed to save branding settings.")
    } finally {
      setSaving(false)
    }
  }

  const resetColors = () => {
    setForm((prev) => ({
      ...prev,
      primaryColor: "#111827",
      secondaryColor: "#F3F4F6",
      accentColor: "#22C55E",
    }))
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
                <Palette className="h-5 w-5" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Branding
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Customize how your gym looks across the member experience.
              </p>
            </div>

            <button
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            <p className="text-sm font-semibold text-gray-800">Loading branding settings...</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
          {/* Left */}
          <div className="space-y-6">
            {/* Brand Identity */}
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold text-gray-900">
                  Brand Identity
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Set the name and logo members will see.
                </p>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {/* Logo */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Gym Logo
                  </label>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gray-50">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Gym logo preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      )}
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Logo
                      </button>

                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        PNG, JPG or SVG. Recommended size: 512 × 512px.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Brand Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Brand Name
                  </label>

                  <input
                    type="text"
                    value={form.brandName}
                    onChange={(e) => updateField("brandName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Enter brand name"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    This name will appear on your member portal and
                    communications.
                  </p>
                </div>
              </div>
            </section>

            {/* Colors */}
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Brand Colors
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose the colors used throughout your member experience.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetColors}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3 sm:p-6">
                {/* Primary */}
                <ColorField
                  label="Primary Color"
                  value={form.primaryColor}
                  onChange={(value) => updateField("primaryColor", value)}
                />

                {/* Secondary */}
                <ColorField
                  label="Secondary Color"
                  value={form.secondaryColor}
                  onChange={(value) => updateField("secondaryColor", value)}
                />

                {/* Accent */}
                <ColorField
                  label="Accent Color"
                  value={form.accentColor}
                  onChange={(value) => updateField("accentColor", value)}
                />
              </div>
            </section>

            {/* Subdomain Routing */}
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Subdomain Routing
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Your unique gym subdomain on thinkauric.com.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Gym Subdomain
                </label>

                <div className="flex items-center rounded-xl border border-gray-300 bg-white px-3 py-1.5 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-900/10">
                  <span className="text-sm font-medium text-gray-400">https://</span>
                  <input
                    type="text"
                    value={gymSlug}
                    onChange={(e) => handleUpdateSubdomain(e.target.value)}
                    className="w-full bg-transparent px-1.5 py-1 text-sm font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                    placeholder="yourgym"
                  />
                  <span className="shrink-0 text-sm font-medium text-gray-500">.thinkauric.com</span>
                </div>

                {subdomainError ? (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    {subdomainError}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Live Portal URL:{" "}
                    <span className="font-mono text-gray-700">
                      https://{gymSlug || "yourgym"}.thinkauric.com
                    </span>
                  </p>
                )}
              </div>
            </section>

            {/* Custom Domain Provisioning */}
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Custom Domain Mapping
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Connect your own custom domain (e.g. members.yourgym.com).
                      </p>
                    </div>
                  </div>

                  {domainRecord?.status === "verified" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified & Active
                    </span>
                  ) : domainRecord?.status === "failed" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                      DNS Unverified
                    </span>
                  ) : form.customDomain ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                      Pending Verification
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Custom Domain
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={form.customDomain}
                    onChange={(e) => updateField("customDomain", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="members.yourgym.com"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyCustomDomain}
                    disabled={verifyingDomain || !form.customDomain}
                    className="h-11 shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    {verifyingDomain ? "Verifying..." : "Verify DNS"}
                  </button>
                </div>

                {form.customDomain && (
                  <div className="mt-5 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Required DNS Records
                    </h3>
                    <p className="text-xs text-gray-500">
                      Configure the following DNS records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.):
                    </p>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-gray-200 bg-gray-50 font-semibold text-gray-700">
                          <tr>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Host / Name</th>
                            <th className="px-3 py-2">Value / Points To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono text-gray-800">
                          <tr>
                            <td className="px-3 py-2 font-sans font-semibold text-gray-600">TXT</td>
                            <td className="px-3 py-2">_thinkauric-challenge.{form.customDomain}</td>
                            <td className="px-3 py-2 break-all text-gray-600">
                              {domainRecord?.token || "thinkauric-verify-[unique-token]"}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 font-sans font-semibold text-gray-600">CNAME</td>
                            <td className="px-3 py-2">{form.customDomain}</td>
                            <td className="px-3 py-2 text-gray-600">cname.thinkauric.com</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {domainRecord?.errorMessage && domainRecord?.status === "failed" && (
                      <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                        {domainRecord.errorMessage}
                      </p>
                    )}

                    {domainRecord?.status === "verified" && (
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Domain is verified and routing traffic to this gym portal.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Bottom Save */}
            <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">
              <Link
                href="/settings"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                onClick={handleSave}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </div>

          {/* Right Preview */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-5">
                <h2 className="text-base font-semibold text-gray-900">
                  Live Preview
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Preview your member portal branding.
                </p>
              </div>

              <div className="p-5">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  {/* Preview Header */}
                  <div
                    className="px-5 py-4"
                    style={{
                      backgroundColor: form.primaryColor,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: form.secondaryColor,
                        }}
                      >
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt=""
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Building2
                            className="h-4 w-4"
                            style={{
                              color: form.primaryColor,
                            }}
                          />
                        )}
                      </div>

                      <span className="truncate text-sm font-semibold text-white">
                        {form.brandName || "Your Gym"}
                      </span>
                    </div>
                  </div>

                  {/* Preview Body */}
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-medium text-gray-400">
                        MEMBER PORTAL
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-gray-900">
                        Welcome back
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Manage your classes and membership.
                      </p>
                    </div>

                    {/* Preview Card */}
                    <div
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: form.secondaryColor,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Membership</p>

                          <p className="mt-1 text-sm font-bold text-gray-900">
                            Premium Plan
                          </p>
                        </div>

                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
                          style={{
                            backgroundColor: form.accentColor,
                          }}
                        >
                          ACTIVE
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="h-10 w-full rounded-xl text-xs font-semibold text-white"
                      style={{
                        backgroundColor: form.primaryColor,
                      }}
                    >
                      View My Classes
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-gray-200 p-3">
                        <p className="text-[10px] text-gray-400">Upcoming</p>

                        <p className="mt-1 text-sm font-bold text-gray-900">
                          4 Classes
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-200 p-3">
                        <p className="text-[10px] text-gray-400">Attendance</p>

                        <p className="mt-1 text-sm font-bold text-gray-900">
                          86%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-center text-xs text-gray-400">
                  Preview updates automatically as you change your branding.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

/* --------------------------------
   Color Field
--------------------------------- */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
        <label
          className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gray-200"
          style={{
            backgroundColor: value,
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium uppercase text-gray-700 outline-none"
          maxLength={7}
        />
      </div>
    </div>
  )
}
