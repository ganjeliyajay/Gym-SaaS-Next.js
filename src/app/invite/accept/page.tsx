"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Dumbbell,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

export default function InviteAcceptPage() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess, loading: toastLoading, dismiss } = useToast()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [tokenParam, setTokenParam] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const initializeInvite = async () => {
      try {
        // Check query parameter token first
        const searchParams = new URLSearchParams(window.location.search)
        const token = searchParams.get("token")
        if (token) {
          setTokenParam(token)
          setCheckingSession(false)
          return
        }

        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : ""

        const params = new URLSearchParams(hash)

        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        const type = params.get("type")
        const errorDescription = params.get("error_description")

        if (errorDescription) {
          toastError("This invitation link is invalid or has expired.")
          return
        }

        if (accessToken && refreshToken && type === "invite") {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            toastError("This invitation link is invalid or expired.")
            return
          }

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + window.location.search,
          )
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session && !token) {
          toastError("This invitation link is invalid or expired.")
        }
      } catch {
        toastError("Unable to verify this invitation. Please try again.")
      } finally {
        setCheckingSession(false)
      }
    }

    initializeInvite()
  }, [])

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toastError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match.")
      return
    }

    setLoading(true)
    const toastId = toastLoading("Activating your account...")

    try {
      if (tokenParam) {
        // Process via server token acceptance endpoint
        const res = await fetch("/api/team/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenParam, password }),
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          dismiss(toastId)
          toastError(data.message || "Failed to activate invitation.")
          return
        }

        // Auto sign-in
        await supabase.auth.signInWithPassword({
          email: data.email,
          password,
        })

        dismiss(toastId)
        toastSuccess("Account activated successfully. Welcome to the team!")
        setTimeout(() => {
          const target = data.role === "trainer" ? "/calendar" : "/dashboard"
          router.push(target)
        }, 1200)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        dismiss(toastId)
        toastError("Your invitation session has expired. Please request a new link.")
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        dismiss(toastId)
        toastError("Unable to verify your account.")
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        dismiss(toastId)
        toastError("We couldn't set your password. Please try again.")
        return
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          status: "active",
        })
        .eq("id", user.id)

      if (profileError) {
        dismiss(toastId)
        toastError("Account updated, but activation could not be completed.")
        return
      }

      dismiss(toastId)
      toastSuccess("Account activated successfully. Welcome to the team!")

      setTimeout(() => {
        router.push("/dashboard")
      }, 1200)
    } catch {
      dismiss(toastId)
      toastError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#07090d] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-black shadow-lg shadow-amber-500/20">
            <Dumbbell className="h-6 w-6" />
          </div>

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-amber-500" />

          <p className="text-sm text-gray-500">Verifying invitation...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-xl shadow-amber-500/20">
              <Dumbbell className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Complete your account
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Set your password to activate your account
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0d1118] p-6 shadow-2xl sm:p-8">
            <form onSubmit={handleSetup} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    minLength={6}
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#080b10] pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Confirm password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    minLength={6}
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-white/10 bg-[#080b10] pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    disabled={loading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-white disabled:opacity-50"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-sm font-bold text-black shadow-lg shadow-amber-500/15 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                ) : (
                  <>
                    Activate account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-600">
            Secure account activation
          </p>
        </div>
      </div>
    </main>
  )
}
