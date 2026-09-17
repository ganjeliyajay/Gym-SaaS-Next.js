"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Dumbbell, Lock } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

export default function ResetPasswordPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error("Reset password session error:", error)

          toastError(
            "Unable to verify your reset session. Please request a new link.",
          )

          return
        }

        if (session?.user) {
          setReady(true)
        } else {
          toastError(
            "This password reset link is invalid or has expired. Please request a new one.",
          )
        }
      } catch (error) {
        console.error("Reset password verification error:", error)

        if (mounted) {
          toastError(
            "Unable to verify your reset session. Please request a new link.",
          )
        }
      }
    }

    checkSession()

    return () => {
      mounted = false
    }
  }, [toastError])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toastError("Password must be at least 6 characters.")
      return
    }

    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        console.error("Password update error:", error)

        toastError("Unable to update your password. Please try again.")

        return
      }

      setUpdated(true)

      toastSuccess("Your password has been updated successfully.")
    } catch (error) {
      console.error("Password update error:", error)

      toastError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-radial from-[#151d33] via-[#090d16] to-[#04060a]">
      {/* Header */}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-xl shadow-amber-500/25 group-hover:scale-105 transition">
            <Dumbbell className="w-6 h-6" />
          </div>

          <span className="font-extrabold tracking-tight text-white font-[outfit] text-2xl">
            {process.env.NEXT_PUBLIC_GYM_NAME || "Gym SaaS"}
          </span>
        </Link>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white font-[outfit]">
          {updated ? "Password updated" : "Create a new password"}
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          {updated
            ? "Your password has been changed successfully."
            : "Choose a new password for your account."}
        </p>
      </div>

      {/* Card */}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-white/10 shadow-2xl">
          {updated ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />

              <p className="mt-4 text-sm text-gray-400">
                You can now sign in using your new password.
              </p>

              <Link
                href="/login"
                className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg flex items-center justify-center gap-2"
              >
                <span>Go to Sign In</span>

                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : ready ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {/* New Password */}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  New Password
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              {/* Confirm Password */}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Confirm New Password
                </label>

                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>

                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Verifying your password reset session...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
