"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Dumbbell, Mail } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

export default function ForgotPasswordPage() {
  const { error: toastError, success: toastSuccess } = useToast()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      toastError("Please enter your email address.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${window.location.origin}/callback?next=/reset-password`,
        },
      )

      if (error) {
        console.error("Password reset request error:", error)

        toastError(
          "We could not send the reset email. Please check your email address and try again.",
        )

        return
      }

      setSent(true)

      toastSuccess("Password reset link sent to your email.")
    } catch (error) {
      console.error("Password reset error:", error)

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-xl shadow-amber-500/25 group-hover:scale-105 transition">
            <Dumbbell className="w-6 h-6" />
          </div>

          <span className="font-extrabold tracking-tight text-white font-[outfit] text-2xl">
            {process.env.NEXT_PUBLIC_GYM_NAME || "Gym SaaS"}
          </span>
        </Link>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white font-[outfit]">
          Forgot your password?
        </h2>

        <p className="mt-2 text-sm text-gray-400">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      {/* Card */}

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-white/10 shadow-2xl">
          {!sent ? (
            <form onSubmit={handleResetRequest} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-400" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-white">
                Check your email
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                If an account exists for{" "}
                <span className="text-gray-200 font-medium">{email}</span>,
                you&apos;ll receive a password reset link shortly.
              </p>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-5 text-sm font-medium text-amber-400 hover:text-amber-300 hover:underline"
              >
                Try another email
              </button>
            </div>
          )}

          {/* Back */}

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
