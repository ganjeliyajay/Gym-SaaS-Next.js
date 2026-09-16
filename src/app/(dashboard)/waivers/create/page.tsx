"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  FileSignature,
  Loader2,
  Save,
  User,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

const defaultContent = `GENERAL GYM MEMBERSHIP WAIVER

I, {{first_name}} {{last_name}}, acknowledge that participation in gym activities involves certain risks.

I understand that I am responsible for following all gym rules, instructions, and safety guidelines.

I voluntarily assume all risks associated with the use of gym equipment and participation in fitness activities.

I confirm that the information provided during registration is accurate and complete.

By signing this waiver, I acknowledge that I have read, understood, and agree to the terms and conditions stated above.

Member Name: {{first_name}} {{last_name}}

Date: {{date}}`

const variables = [
  {
    label: "First Name",
    value: "{{first_name}}",
    icon: User,
  },
  {
    label: "Last Name",
    value: "{{last_name}}",
    icon: User,
  },
  {
    label: "Date",
    value: "{{date}}",
    icon: CalendarDays,
  },
]

export default function CreateWaiverPage() {
  const router = useRouter()
  const toast = useToast()

  const [name, setName] = useState("")
  const [content, setContent] = useState(defaultContent)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  const insertVariable = (value: string) => {
    setContent(
      (current) => `${current}${current.endsWith(" ") ? "" : " "}${value}`,
    )
  }

  const save = async () => {
    if (!name.trim()) {
      toast.error("Waiver name is required.")
      return
    }

    if (!content.trim()) {
      toast.error("Waiver content is required.")
      return
    }

    setSaving(true)

    const toastId = toast.loading("Creating waiver...")

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Your session has expired. Please login again.")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym information could not be found.")
      }

      if (!["admin", "manager", "super_admin"].includes(profile.role)) {
        throw new Error("You do not have permission to manage waivers.")
      }

      const { data, error } = await supabase
        .from("waivers")
        .insert({
          gym_id: profile.gym_id,
          name: name.trim(),
          content: content.trim(),
        })
        .select("id")
        .single()

      if (error) {
        throw error
      }

      toast.dismiss(toastId)
      toast.success("Waiver created successfully.")

      router.push(`/waivers/${data.id}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(toastId)

      toast.error(
        error instanceof Error ? error.message : "Unable to create waiver.",
      )
    } finally {
      setSaving(false)
    }
  }

  const previewContent = content
    .replace(/\{\{first_name\}\}/gi, "John")
    .replace(/\{\{last_name\}\}/gi, "Doe")
    .replace(
      /\{\{date\}\}/gi,
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    )

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/waivers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <p className="text-sm font-semibold text-slate-950">
                Create Waiver
              </p>

              <p className="hidden text-xs text-slate-400 sm:block">
                Reusable legal agreement
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Eye className="h-4 w-4" />
              {preview ? "Editor" : "Preview"}
            </button>

            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              <span className="hidden sm:inline">Create Waiver</span>

              <span className="sm:hidden">Save</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <FileSignature className="h-5 w-5 text-white" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Legal Waiver
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create a reusable agreement that can be attached to any signup
              form.
            </p>
          </div>
        </div>

        {preview ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-medium text-slate-500">Preview</p>

              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                {name || "Untitled Waiver"}
              </h2>

              <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700">
                {previewContent}
              </div>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label className="block text-sm font-semibold text-slate-800">
                Waiver Name
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Gym Waiver"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
              />

              <label className="mt-6 block text-sm font-semibold text-slate-800">
                Waiver Content
              </label>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-slate-400"
                placeholder="Write your waiver content..."
              />
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Dynamic Variables
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  These values are replaced automatically during signup.
                </p>

                <div className="mt-4 space-y-2">
                  {variables.map((item) => {
                    const Icon = item.icon

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => insertVariable(item.value)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-500" />

                          <span className="text-sm font-medium text-slate-700">
                            {item.label}
                          </span>
                        </span>

                        <code className="text-xs text-slate-400">
                          {item.value}
                        </code>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Usage</h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  After creating this waiver, select it from any signup
                  form&apos;s Legal Waiver section.
                </p>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
