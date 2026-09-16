"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"
import {
  ArrowLeft,
  Globe2,
  Clock3,
  CalendarDays,
  DollarSign,
  Save,
  CheckCircle2,
  Building2,
} from "lucide-react"

const weekDays = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
]

export default function BusinessSettingsPage() {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gymId, setGymId] = useState("")

  const [bookingPreferences, setBookingPreferences] = useState({
    onlineBooking: true,
    sameDayBooking: true,
    cancellation: true,
    waitlist: true,
  })

  const [form, setForm] = useState({
    businessType: "Fitness Gym",
    timezone: "Asia/Kolkata",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour",
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: false,
  })

  const [hours, setHours] = useState<
    Record<string, { open: string; close: string }>
  >({
    monday: { open: "06:00", close: "22:00" },
    tuesday: { open: "06:00", close: "22:00" },
    wednesday: { open: "06:00", close: "22:00" },
    thursday: { open: "06:00", close: "22:00" },
    friday: { open: "06:00", close: "22:00" },
    saturday: { open: "07:00", close: "20:00" },
    sunday: { open: "08:00", close: "14:00" },
  })

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
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

        const { data: settings, error: settingsError } = await supabase
          .from("gym_settings")
          .select(`
            business_type,
            timezone,
            currency,
            date_format,
            time_format,
            business_hours,
            allow_online_booking,
            allow_same_day_booking,
            allow_class_cancellation,
            allow_waitlist
          `)
          .eq("gym_id", profile.gym_id)
          .maybeSingle()

        if (settingsError) throw settingsError
        if (!active) return

        setGymId(profile.gym_id)

        if (settings) {
          const storedHours =
            settings.business_hours &&
            typeof settings.business_hours === "object"
              ? settings.business_hours
              : {}

          setForm((prev) => ({
            ...prev,
            businessType: settings.business_type || prev.businessType,
            timezone: settings.timezone || prev.timezone,
            currency: settings.currency || prev.currency,
            dateFormat: settings.date_format || prev.dateFormat,
            timeFormat: settings.time_format || prev.timeFormat,
            monday:
              (storedHours as any)?.monday?.enabled ?? prev.monday,
            tuesday:
              (storedHours as any)?.tuesday?.enabled ?? prev.tuesday,
            wednesday:
              (storedHours as any)?.wednesday?.enabled ?? prev.wednesday,
            thursday:
              (storedHours as any)?.thursday?.enabled ?? prev.thursday,
            friday:
              (storedHours as any)?.friday?.enabled ?? prev.friday,
            saturday:
              (storedHours as any)?.saturday?.enabled ?? prev.saturday,
            sunday:
              (storedHours as any)?.sunday?.enabled ?? prev.sunday,
          }))

          setHours((prev) => ({
            monday: (storedHours as any)?.monday
              ? {
                open: (storedHours as any).monday.open || prev.monday.open,
                close: (storedHours as any).monday.close || prev.monday.close,
              }
              : prev.monday,
            tuesday: (storedHours as any)?.tuesday
              ? {
                open: (storedHours as any).tuesday.open || prev.tuesday.open,
                close: (storedHours as any).tuesday.close || prev.tuesday.close,
              }
              : prev.tuesday,
            wednesday: (storedHours as any)?.wednesday
              ? {
                open: (storedHours as any).wednesday.open || prev.wednesday.open,
                close: (storedHours as any).wednesday.close || prev.wednesday.close,
              }
              : prev.wednesday,
            thursday: (storedHours as any)?.thursday
              ? {
                open: (storedHours as any).thursday.open || prev.thursday.open,
                close: (storedHours as any).thursday.close || prev.thursday.close,
              }
              : prev.thursday,
            friday: (storedHours as any)?.friday
              ? {
                open: (storedHours as any).friday.open || prev.friday.open,
                close: (storedHours as any).friday.close || prev.friday.close,
              }
              : prev.friday,
            saturday: (storedHours as any)?.saturday
              ? {
                open: (storedHours as any).saturday.open || prev.saturday.open,
                close: (storedHours as any).saturday.close || prev.saturday.close,
              }
              : prev.saturday,
            sunday: (storedHours as any)?.sunday
              ? {
                open: (storedHours as any).sunday.open || prev.sunday.open,
                close: (storedHours as any).sunday.close || prev.sunday.close,
              }
              : prev.sunday,
          }))

          setBookingPreferences({
            onlineBooking: settings.allow_online_booking ?? true,
            sameDayBooking: settings.allow_same_day_booking ?? true,
            cancellation: settings.allow_class_cancellation ?? true,
            waitlist: settings.allow_waitlist ?? true,
          })
        }
      } catch (err) {
        if (active) {
          toast.error("Failed to load business settings.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [toast])

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateHours = (day: string, field: "open" | "close", value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    if (!gymId) {
      toast.error("Gym information was not found. Refresh the page and try again.")
      return
    }

    const toastId = toast.loading("Saving business settings...")
    setSaving(true)

    try {
      const businessHours = Object.fromEntries(
        weekDays.map((day) => [
          day.key,
          {
            enabled: Boolean(form[day.key as keyof typeof form]),
            open: hours[day.key].open,
            close: hours[day.key].close,
          },
        ])
      )

      const { error: saveError } = await supabase
        .from("gym_settings")
        .upsert(
          {
            gym_id: gymId,
            business_type: form.businessType,
            timezone: form.timezone,
            currency: form.currency,
            date_format: form.dateFormat,
            time_format: form.timeFormat,
            business_hours: businessHours,
            allow_online_booking: bookingPreferences.onlineBooking,
            allow_same_day_booking: bookingPreferences.sameDayBooking,
            allow_class_cancellation: bookingPreferences.cancellation,
            allow_waitlist: bookingPreferences.waitlist,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "gym_id" }
        )

      if (saveError) throw saveError

      toast.dismiss(toastId)
      toast.success("Business settings saved successfully.")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(err instanceof Error ? err.message : "Failed to save business settings.")
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
                <Globe2 className="h-5 w-5" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Business Settings
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Configure your gym&apos;s business hours, timezone and regional
                preferences.
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
            <p className="text-sm font-semibold text-gray-800">Loading business settings...</p>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Business Information */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Business Information
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Configure the basic business preferences for your gym.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Business Type
                </label>

                <select
                  value={form.businessType}
                  onChange={(e) => updateField("businessType", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option>Fitness Gym</option>
                  <option>CrossFit Box</option>
                  <option>Yoga Studio</option>
                  <option>Pilates Studio</option>
                  <option>Personal Training Studio</option>
                  <option>Sports Club</option>
                  <option>Wellness Center</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Currency
                </label>

                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Regional Preferences */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Globe2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Regional Preferences
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Control how dates, times and schedules are displayed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {/* Timezone */}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Timezone
                </label>

                <select
                  value={form.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="Asia/Kolkata">
                    India Standard Time — UTC+05:30
                  </option>

                  <option value="America/New_York">
                    Eastern Time — UTC-05:00
                  </option>

                  <option value="America/Chicago">
                    Central Time — UTC-06:00
                  </option>

                  <option value="America/Denver">
                    Mountain Time — UTC-07:00
                  </option>

                  <option value="America/Los_Angeles">
                    Pacific Time — UTC-08:00
                  </option>

                  <option value="Europe/London">London — UTC+00:00</option>

                  <option value="Asia/Dubai">
                    Gulf Standard Time — UTC+04:00
                  </option>
                </select>

                <p className="mt-2 text-xs text-gray-400">
                  Your calendar, classes and scheduled notifications will use
                  this timezone.
                </p>
              </div>

              {/* Date Format */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Date Format
                </label>

                <select
                  value={form.dateFormat}
                  onChange={(e) => updateField("dateFormat", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD MMM YYYY">DD MMM YYYY</option>
                </select>
              </div>

              {/* Time Format */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Time Format
                </label>

                <select
                  value={form.timeFormat}
                  onChange={(e) => updateField("timeFormat", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="12-hour">12-hour — 6:00 PM</option>
                  <option value="24-hour">24-hour — 18:00</option>
                </select>
              </div>
            </div>
          </section>

          {/* Business Hours */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Business Hours
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Set the opening and closing hours for each day.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {weekDays.map((day) => {
                const isOpen = form[day.key as keyof typeof form] as boolean

                return (
                  <div
                    key={day.key}
                    className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6"
                  >
                    {/* Day */}
                    <div className="flex w-full items-center justify-between sm:w-40">
                      <span className="text-sm font-semibold text-gray-900">
                        {day.label}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateField(day.key as keyof typeof form, !isOpen)
                        }
                        className={`relative h-6 w-11 rounded-full transition ${
                          isOpen ? "bg-gray-900" : "bg-gray-200"
                        }`}
                        aria-label={`Toggle ${day.label}`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                            isOpen ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-1 items-center gap-3">
                      {isOpen ? (
                        <>
                          <input
                            type="time"
                            value={hours[day.key].open}
                            onChange={(e) =>
                              updateHours(day.key, "open", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          />

                          <span className="text-sm text-gray-400">to</span>

                          <input
                            type="time"
                            value={hours[day.key].close}
                            onChange={(e) =>
                              updateHours(day.key, "close", e.target.value)
                            }
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          />
                        </>
                      ) : (
                        <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Booking Preferences */}
          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Booking Preferences
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Default settings for class scheduling and member bookings.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              <SettingRow
                title="Allow Online Class Booking"
                description="Members can reserve available classes from their portal."
                enabled={bookingPreferences.onlineBooking}
                onChange={(enabled) =>
                  setBookingPreferences((prev) => ({ ...prev, onlineBooking: enabled }))
                }
              />

              <SettingRow
                title="Allow Same-Day Booking"
                description="Members can book classes on the same day."
                enabled={bookingPreferences.sameDayBooking}
                onChange={(enabled) =>
                  setBookingPreferences((prev) => ({ ...prev, sameDayBooking: enabled }))
                }
              />

              <SettingRow
                title="Allow Class Cancellation"
                description="Members can cancel their booking from the portal."
                enabled={bookingPreferences.cancellation}
                onChange={(enabled) =>
                  setBookingPreferences((prev) => ({ ...prev, cancellation: enabled }))
                }
              />

              <SettingRow
                title="Waitlist Classes"
                description="Allow members to join a waitlist when a class is full."
                enabled={bookingPreferences.waitlist}
                onChange={(enabled) =>
                  setBookingPreferences((prev) => ({ ...prev, waitlist: enabled }))
                }
              />
            </div>
          </section>

          {/* Info */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
                <Globe2 className="h-4 w-4" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  Business settings affect your entire gym
                </h3>

                <p className="mt-1 text-sm leading-6 text-blue-700">
                  Changes to timezone, currency and operating hours will be used
                  throughout the dashboard, calendar and member portal.
                </p>
              </div>
            </div>
          </div>

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

/* --------------------------------
   Setting Row
--------------------------------- */

function SettingRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-gray-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-gray-900" : "bg-gray-200"
        }`}
        aria-label={`Toggle ${title}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  )
}
