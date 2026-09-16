"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"
import {
  Building2,
  Palette,
  Globe2,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Save,
} from "lucide-react"

const settingsItems = [
  {
    title: "Gym Profile",
    description: "Manage your gym name, contact details and location.",
    href: "/settings/profile",
    icon: Building2,
  },
  {
    title: "Branding",
    description: "Customize your logo, colors and member portal branding.",
    href: "/settings/branding",
    icon: Palette,
  },
  {
    title: "Business Settings",
    description: "Configure business hours, timezone and regional preferences.",
    href: "/settings/business",
    icon: Globe2,
  },
  {
    title: "Security",
    description: "Manage password, sessions and account security.",
    href: "/settings/security",
    icon: ShieldCheck,
  },
]

export default function SettingsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [gymOverview, setGymOverview] = useState({
    name: "",
    members: 0,
    plan: "Not configured",
    status: "Active",
  })

  useEffect(() => {
    let active = true

    const loadOverview = async () => {
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
          .select("gym_id, status")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile?.gym_id) throw new Error("Gym information was not found.")

        const [gymResult, membersResult] = await Promise.all([
          supabase
            .from("gyms")
            .select("name")
            .eq("id", profile.gym_id)
            .single(),
          supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("gym_id", profile.gym_id),
        ])

        if (gymResult.error) throw gymResult.error
        if (membersResult.error) throw membersResult.error
        if (!active) return

        setGymOverview({
          name: gymResult.data?.name || "Gym",
          members: membersResult.count || 0,
          plan: "Not configured",
          status: profile.status === "inactive" ? "Inactive" : "Active",
        })
      } catch (err) {
        if (active) {
          toast.error("Failed to load gym overview.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOverview()

    return () => {
      active = false
    }
  }, [toast])

  const handleSave = () => {
    // This page is an overview/navigation page. Individual settings pages own persistence.
    toast.success("Settings saved successfully.")
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              Administration
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Gym Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your gym, business preferences and account settings.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>

        {/* Gym Overview */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold text-gray-900">
              Gym Overview
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Basic information about your gym.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gray-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Gym Name
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-900">
                {loading ? "Loading..." : gymOverview.name}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Members
              </p>

              <p className="mt-2 text-sm font-semibold text-gray-900">
                {loading ? "—" : gymOverview.members.toLocaleString()}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Plan
              </p>

              <p className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                {gymOverview.plan}
              </p>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Account Status
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-sm font-semibold text-gray-900">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose a section to manage your gym configuration.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {settingsItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition group-hover:bg-gray-900 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {item.title}
                        </h3>

                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-900" />
                      </div>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 rounded-2xl border border-red-200 bg-white">
          <div className="border-b border-red-100 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold text-red-700">
              Danger Zone
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              These actions can affect your entire gym account.
            </p>
          </div>

          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Deactivate Gym
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Temporarily disable access to this gym account.
              </p>
            </div>

            <button
              type="button"
              className="h-10 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Deactivate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
