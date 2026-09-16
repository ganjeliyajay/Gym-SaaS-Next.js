"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Edit3, FileSignature, Loader2 } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Waiver = {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

export default function WaiverDetailPage() {
  const params = useParams<{ id: string }>()
  const toast = useToast()

  const [waiver, setWaiver] = useState<Waiver | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
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
          throw new Error("You do not have permission to view waivers.")
        }

        const { data, error } = await supabase
          .from("waivers")
          .select("id,name,content,created_at,updated_at")
          .eq("id", params.id)
          .eq("gym_id", profile.gym_id)
          .single()

        if (error || !data) {
          throw new Error("Waiver not found.")
        }

        setWaiver(data as Waiver)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to load waiver.",
        )
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [params.id, toast])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="flex min-h-screen items-center justify-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading waiver...
        </div>
      </main>
    )
  }

  if (!waiver) {
    return (
      <main className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-xl font-semibold text-gray-950">
            Waiver not found
          </h1>

          <Link
            href="/waivers"
            className="mt-5 inline-flex rounded-xl bg-gray-950 px-4 py-2.5 text-sm text-white"
          >
            Back to Waivers
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/waivers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Management</span>
                <span>/</span>
                <span>Waivers</span>
              </div>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950">
                {waiver.name}
              </h1>
            </div>
          </div>

          <Link
            href={`/waivers/${waiver.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Edit3 className="h-4 w-4" />
            Edit Waiver
          </Link>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-8">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <FileSignature className="h-5 w-5 text-gray-700" />
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Legal Waiver
              </p>

              <p className="text-xs text-gray-400">
                Updated {formatDate(waiver.updated_at)}
              </p>
            </div>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {waiver.content}
          </div>
        </section>
      </div>
    </main>
  )
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
