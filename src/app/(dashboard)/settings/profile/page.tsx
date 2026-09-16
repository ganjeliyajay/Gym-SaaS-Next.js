"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  CheckCircle2,
  Clock3,
} from "lucide-react"

export default function GymProfileSettingsPage() {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    gymName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    timezone: "Asia/Kolkata",
  })

  useEffect(() => {
    let active = true

    const loadGymProfile = async () => {
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

        const { data: gym, error: gymError } = await supabase
          .from("gyms")
          .select("id, name, email, phone, address, city, state, country, logo_url")
          .eq("id", profile.gym_id)
          .single()

        if (gymError) throw gymError

        // Website is not part of the current gyms schema, so don't invent one.
        // Timezone is already stored in gym_settings.
        const { data: settings, error: settingsError } = await supabase
          .from("gym_settings")
          .select("timezone")
          .eq("gym_id", profile.gym_id)
          .maybeSingle()

        if (settingsError) throw settingsError
        if (!active) return

        setForm({
          gymName: gym.name || "",
          email: gym.email || "",
          phone: gym.phone || "",
          website: "",
          address: gym.address || "",
          city: gym.city || "",
          state: gym.state || "",
          postalCode: "",
          country: gym.country || "",
          timezone: settings?.timezone || "Asia/Kolkata",
        })
      } catch (err) {
        if (active) {
          toast.error("Failed to load gym profile.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadGymProfile()

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

  const handleSave = async () => {
    const toastId = toast.loading("Saving gym profile...")
    setSaving(true)

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

      const { error: gymError } = await supabase
        .from("gyms")
        .update({
          name: form.gymName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.gym_id)

      if (gymError) throw gymError

      // Keep timezone in the settings table created for Business Settings.
      const { error: settingsError } = await supabase
        .from("gym_settings")
        .upsert(
          {
            gym_id: profile.gym_id,
            timezone: form.timezone,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "gym_id" }
        )

      if (settingsError) throw settingsError

      toast.dismiss(toastId)
      toast.success("Gym profile updated successfully.")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(err instanceof Error ? err.message : "Failed to save gym profile.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
                <Building2 className="h-5 w-5" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Gym Profile
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your gym&apos;s basic information and contact details.
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
            <p className="text-sm font-semibold text-gray-800">Loading gym profile...</p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Basic Information */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900">
                Basic Information
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                This information will be displayed across your gym platform.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Gym Name */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Gym Name
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="text"
                    value={form.gymName}
                    onChange={(e) => updateField("gymName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Enter gym name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Business Email
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="hello@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Phone Number
                </label>

                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Website
                </label>

                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="url"
                    value={form.website}
                    disabled
                    className="input pl-10 cursor-not-allowed bg-gray-50 text-gray-400"
                    placeholder="Not available in current gym schema"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <MapPin className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Gym Location
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add the physical location of your gym.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Address */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Street Address
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Enter street address"
                />
              </div>

              {/* City */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  City
                </label>

                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="City"
                />
              </div>

              {/* State */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  State / Province
                </label>

                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  placeholder="State"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Postal Code
                </label>

                <input
                  type="text"
                  value={form.postalCode}
                  disabled
                  className="input cursor-not-allowed bg-gray-50 text-gray-400"
                  placeholder="Not available in current gym schema"
                />
              </div>

              {/* Country */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Country
                </label>

                <select
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Canada</option>
                  <option>Australia</option>
                  <option>United Arab Emirates</option>
                </select>
              </div>
            </div>
          </section>

          {/* Regional Settings */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Regional Settings
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Configure the timezone used throughout your gym.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="max-w-xl">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Timezone
                </label>

                <select
                  value={form.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="Asia/Kolkata">
                    India Standard Time (UTC+05:30)
                  </option>

                  <option value="America/New_York">
                    Eastern Time (UTC-05:00)
                  </option>

                  <option value="America/Chicago">
                    Central Time (UTC-06:00)
                  </option>

                  <option value="America/Denver">
                    Mountain Time (UTC-07:00)
                  </option>

                  <option value="America/Los_Angeles">
                    Pacific Time (UTC-08:00)
                  </option>

                  <option value="Europe/London">London (UTC+00:00)</option>

                  <option value="Asia/Dubai">
                    Gulf Standard Time (UTC+04:00)
                  </option>
                </select>

                <p className="mt-2 text-xs text-gray-400">
                  All calendar classes and scheduled notifications will use this
                  timezone.
                </p>
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900">
                Profile Preview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                How your gym information may appear to members.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-gray-200 bg-[#f9fafb] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                    <Building2 className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900">
                      {form.gymName || "Your Gym Name"}
                    </h3>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 shrink-0" />

                        <span>
                          {form.city || "City"}, {form.state || "State"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-4 w-4 shrink-0" />

                        <span className="truncate">
                          {form.email || "email@example.com"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4 shrink-0" />

                        <span>{form.phone || "+91 00000 00000"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom Actions */}
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
