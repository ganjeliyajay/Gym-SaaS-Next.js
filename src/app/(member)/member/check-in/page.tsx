"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Dumbbell,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"

type QrResponse = {
  success: boolean
  token?: string
  qrDataUrl?: string
  expiresAt?: string
  memberId?: string
  gymId?: string
  memberName?: string
  error?: string
}

export default function MemberCheckInPage() {
  const [qr, setQr] = useState<QrResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expiresText, setExpiresText] = useState("")

  const loadQr = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/member/qr", {
        method: "GET",
        cache: "no-store",
      })

      const result = (await response.json()) as QrResponse

      if (!response.ok || !result.success || !result.qrDataUrl) {
        throw new Error(
          result.error || "Unable to generate your check-in QR code.",
        )
      }

      setQr(result)
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate your check-in QR code.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQr()
  }, [])

  useEffect(() => {
    if (!qr?.expiresAt) {
      setExpiresText("")
      return
    }

    const updateExpiry = () => {
      const remaining = new Date(qr.expiresAt as string).getTime() - Date.now()

      if (remaining <= 0) {
        setExpiresText("Expired — refresh QR")
        return
      }

      const totalMinutes = Math.floor(remaining / 60000)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60

      setExpiresText(
        hours > 0
          ? `Refreshes in ${hours}h ${minutes}m`
          : `Refreshes in ${Math.max(1, minutes)}m`,
      )
    }

    updateExpiry()
    const interval = window.setInterval(updateExpiry, 30000)

    return () => window.clearInterval(interval)
  }, [qr?.expiresAt])

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/member"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-2xl bg-gray-900 p-6 text-white sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Member Check-In
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Your Check-In QR
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
                Show this QR code to the gym front desk scanner to check in.
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <CheckCircle2 size={22} />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Digital Check-In Pass
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Keep the QR code visible while the front desk scans it.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadQr()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="mt-6 flex min-h-[360px] items-center justify-center rounded-2xl bg-gray-50 p-6">
              {loading ? (
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
                  <p className="mt-4 text-sm text-gray-500">
                    Generating your QR code...
                  </p>
                </div>
              ) : error ? (
                <div className="max-w-sm text-center">
                  <p className="text-sm font-medium text-red-600">{error}</p>

                  <button
                    type="button"
                    onClick={() => void loadQr()}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    <RefreshCw size={15} />
                    Try Again
                  </button>
                </div>
              ) : qr?.qrDataUrl ? (
                <div className="text-center">
                  <div className="mx-auto inline-flex rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
                    <img
                      src={qr.qrDataUrl}
                      alt="Member check-in QR code"
                      className="h-[280px] w-[280px] max-w-full rounded-xl"
                    />
                  </div>

                  <p className="mt-4 text-base font-semibold text-gray-900">
                    {qr.memberName || "Member"}
                  </p>

                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Clock3 size={13} />
                    {expiresText || "QR ready"}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="space-y-4">
            <InfoCard
              icon={<ShieldCheck size={18} />}
              title="Secure QR"
              text="Your QR is digitally signed and verified by the gym server before check-in."
            />

            <InfoCard
              icon={<CreditCard size={18} />}
              title="Membership Required"
              text="Check-in is allowed only when your membership is active and eligible."
            />

            <InfoCard
              icon={<Dumbbell size={18} />}
              title="Front Desk"
              text="Show the QR to the front desk camera scanner. Staff do not need to type your details."
            />
          </aside>
        </div>
      </main>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>

      <p className="mt-1 text-xs leading-5 text-gray-500">{text}</p>
    </div>
  )
}
