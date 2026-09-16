"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Dumbbell,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

export default function RegisterPage() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess, loading: toastLoading, dismiss } = useToast()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toastError("Please enter your full name.")
      return
    }

    if (!email.trim()) {
      toastError("Please enter a valid email address.")
      return
    }

    if (password.length < 6) {
      toastError("Password must be at least 6 characters.")
      return
    }

    if (password !== confirmPassword) {
      toastError("Passwords do not match.")
      return
    }

    setLoading(true)
    const toastId = toastLoading("Creating your gym account...")

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "admin",
          },
        },
      })

      if (error || !data?.user) {
        dismiss(toastId)
        if (error?.message?.toLowerCase().includes("already registered") || error?.message?.toLowerCase().includes("unique")) {
          toastError("An account with this email already exists.")
        } else {
          toastError("We couldn't create your account. Please check your details and try again.")
        }
        return
      }

      const { data: gym, error: gymError } = await supabase.rpc("create_gym", {
        gym_name: `${fullName}'s Gym`,
        gym_email: email,
      })

      if (gymError) {
        dismiss(toastId)
        toastError("We couldn't initialize your gym profile. Please try again.")
        return
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        gym_id: gym.id,
        full_name: fullName,
        email: email,
        role: "admin",
      })

      if (profileError) {
        dismiss(toastId)
        toastError("We couldn't finalize your gym setup. Please try again.")
        return
      }

      dismiss(toastId)
      toastSuccess("Account created successfully. Welcome!")
      router.push("/dashboard")
    } catch {
      dismiss(toastId)
      toastError("Something went wrong while creating your account. Please try again.")
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
            Gym SaaS
          </span>
        </Link>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-white font-[outfit]">
          Create your gym account
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-gray-400">
          Create your Gym SaaS owner account
        </p>
      </div>

      {/* Register Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-white/10 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Full Name
              </label>

              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jason Thorne"
                  autoComplete="name"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition disabled:opacity-60"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Email Address
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-300">
                  Confirm Password
                </label>

                {password && confirmPassword && (
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                      password === confirmPassword
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}
                  >
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Passwords match
                      </>
                    ) : (
                      "Mismatch"
                    )}
                  </span>
                )}
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />

                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 transition"
                  title={
                    showConfirmPassword
                      ? "Hide confirmation password"
                      : "Show confirmation password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Account Information */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <Dumbbell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />

                <div>
                  <p className="text-xs font-semibold text-amber-300">
                    Gym Owner Account
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                    This account will create and manage your own gym. Admin and
                    staff accounts can be invited later from the Team section.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Gym Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-amber-400 font-semibold hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
