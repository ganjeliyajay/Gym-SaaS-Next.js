
"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import QRCode from "qrcode"
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  Link2,
  Smartphone,
  ScanLine,
  Settings2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type FormType = {
  id: string
  name: string
  slug: string
  status: string
}

export default function QRCodePage() {
  const params = useParams()

  const [form, setForm] = useState<FormType | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [qrStyle, setQrStyle] = useState<"square" | "rounded">("square")
  const [includeLogo, setIncludeLogo] = useState(true)

  const formId = params?.id as string | undefined

  const publicUrl =
    typeof window !== "undefined" && form
      ? `${window.location.origin}/signup/${form.slug}`
      : ""

  useEffect(() => {
    let mounted = true

    const loadForm = async () => {
      if (!formId) {
        if (mounted) {
          setLoading(false)
        }
        return
      }

      try {
        const { data, error } = await supabase
          .from("signup_forms")
          .select("id, name, slug, status")
          .eq("id", formId)
          .single()

        if (error) {
          console.error("Load signup form error:", error)

          if (mounted) {
            setForm(null)
          }

          return
        }

        if (mounted) {
          setForm(data as FormType)
        }
      } catch (error) {
        console.error("Load signup form error:", error)

        if (mounted) {
          setForm(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadForm()

    return () => {
      mounted = false
    }
  }, [formId])

  const copyLink = async () => {
    if (!publicUrl) return

    try {
      await navigator.clipboard.writeText(publicUrl)

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error("Copy failed:", error)
    }
  }

  const handleDownload = async () => {
    if (!publicUrl || !form) return

    try {
      const dataUrl = await QRCode.toDataURL(publicUrl, {
        width: 1200,
        margin: 3,
        errorCorrectionLevel: "H",
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      })

      const link = document.createElement("a")

      link.href = dataUrl
      link.download = `${form.slug}-qr.png`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setDownloaded(true)

      window.setTimeout(() => {
        setDownloaded(false)
      }, 2000)
    } catch (error) {
      console.error("QR download error:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-sm font-medium text-gray-500">
          Loading QR Code...
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-950">
            Signup form not found
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            The signup form could not be loaded.
          </p>

          <Link
            href="/signup-forms"
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white"
          >
            Back to Signup Forms
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={`/signup-forms/${form.id}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
              aria-label="Back to form"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">
                QR Code
              </p>

              <p className="hidden truncate text-xs text-gray-400 sm:block">
                {form.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/signup-forms/${form.id}`}
              className="hidden h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:inline-flex"
            >
              <ExternalLink className="h-4 w-4" />
              Form Details
            </Link>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {downloaded ? (
                <>
                  <Check className="h-4 w-4" />
                  Downloaded
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950">
              <QrCode className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                Signup QR Code
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Share this QR code to let customers quickly access your signup
                form.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-950">
                    QR Code Preview
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Customers can scan this code using their phone camera.
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${form.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${form.status === "active"
                      ? "bg-emerald-500"
                      : "bg-gray-400"
                      }`}
                  />

                  {form.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-6">
                <QRCodePreview
                  url={publicUrl}
                  style={qrStyle}
                  includeLogo={includeLogo}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <Download className="h-4 w-4" />
                  Download PNG
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Print QR
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                  <Link2 className="h-5 w-5 text-gray-600" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-950">
                    Public Signup URL
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    This is the destination linked to your QR code.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-4">
                  <span className="truncate text-sm text-gray-600">
                    {publicUrl}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-gray-950">
                  Where to Use Your QR Code
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Place your QR code anywhere customers can easily scan it.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <UseCase
                  icon={Printer}
                  title="Gym Entrance"
                  description="Print and place near your front desk."
                />

                <UseCase
                  icon={Smartphone}
                  title="Social Media"
                  description="Share it in your social posts."
                />

                <UseCase
                  icon={ScanLine}
                  title="Marketing"
                  description="Add it to flyers and campaigns."
                />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                  <Settings2 className="h-4 w-4 text-gray-600" />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-950">
                    QR Settings
                  </h2>

                  <p className="text-xs text-gray-400">
                    Customize your QR code.
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  QR Style
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <StyleButton
                    active={qrStyle === "square"}
                    onClick={() => setQrStyle("square")}
                    title="Square"
                  />

                  <StyleButton
                    active={qrStyle === "rounded"}
                    onClick={() => setQrStyle("rounded")}
                    title="Rounded"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Include Gym Logo
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Show your logo in the center.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIncludeLogo((current) => !current)}
                  aria-label="Toggle gym logo"
                  aria-pressed={includeLogo}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${includeLogo ? "bg-gray-950" : "bg-gray-300"
                    }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${includeLogo ? "left-5" : "left-0.5"
                      }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQrStyle((current) =>
                    current === "square" ? "rounded" : "square",
                  )
                }}
                className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate QR
              </button>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-gray-950">
                Signup Form
              </h2>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-950">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {form.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-gray-400">
                      /{form.slug}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <InfoRow
                  label="Status"
                  value={form.status === "active" ? "Active" : "Inactive"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    QR Code is active
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Scanning this QR code will always open the current public
                    signup page for this form.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function QRCodePreview({
  url,
  style,
  includeLogo,
}: {
  url: string
  style: "square" | "rounded"
  includeLogo: boolean
}) {
  const [qrData, setQrData] = useState("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    let cancelled = false

    const generateQR = async () => {
      if (!url) {
        setQrData("")
        return
      }

      setGenerating(true)

      try {
        const dataUrl = await QRCode.toDataURL(url, {
          width: 290,
          margin: 2,
          errorCorrectionLevel: "H",
          color: {
            dark: "#111827",
            light: "#ffffff",
          },
        })

        if (!cancelled) {
          setQrData(dataUrl)
        }
      } catch (error) {
        console.error("QR generation error:", error)

        if (!cancelled) {
          setQrData("")
        }
      } finally {
        if (!cancelled) {
          setGenerating(false)
        }
      }
    }

    generateQR()

    return () => {
      cancelled = true
    }
  }, [url])

  if (!qrData || generating) {
    return (
      <div
        className={`flex h-[330px] w-[330px] items-center justify-center bg-white text-sm text-gray-400 shadow-sm ${style === "rounded" ? "rounded-3xl" : "rounded-xl"
          }`}
      >
        Generating QR...
      </div>
    )
  }

  return (
    <div
      className={`relative bg-white p-5 shadow-sm ${style === "rounded" ? "rounded-3xl" : "rounded-lg"
        }`}
    >
      <img
        src={qrData}
        alt="Signup QR Code"
        className="h-[290px] w-[290px]"
      />

      {includeLogo && (
        <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-4 border-white bg-gray-950 shadow-md">
          <QrCode className="h-5 w-5 text-white" />
        </div>
      )}
    </div>
  )
}

function UseCase({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>

      <p className="text-sm font-semibold text-gray-900">{title}</p>

      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </div>
  )
}

function StyleButton({
  active,
  onClick,
  title,
}: {
  active: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-3 text-center text-xs font-semibold transition ${active
        ? "border-gray-950 bg-gray-950 text-white"
        : "border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
    >
      {title}
    </button>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500">{label}</span>

      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  )
}