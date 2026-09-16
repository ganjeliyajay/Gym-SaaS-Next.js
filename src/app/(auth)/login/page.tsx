"use client"

import React, { useEffect, useState } from "react"
import { Dumbbell, Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { useToast } from "@/components/ui/toast"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const { error: toastError, success: toastSuccess } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

useEffect(() => {
  const checkExistingSession = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    
    if (!session?.user) {
      return
    }


    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()


    if (!profile) return

    if (profile.role === "admin" || profile.role === "manager") {
      router.replace("/dashboard")
    } else if (profile.role === "trainer") {
      router.replace("/calendar")
    } else if (profile.role === "member") {
      router.replace("/member")
    }
  }

  checkExistingSession()
}, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toastError("The email or password you entered is incorrect.")
        return
      }

      if (!data.user) {
        toastError("The email or password you entered is incorrect.")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single()


      if (profileError || !profile) {
        toastError("Profile not found. Please contact your administrator.")
        return
      }

      toastSuccess("Welcome back!")

      switch (profile.role) {
        case "admin":
        case "manager":
          router.push("/dashboard")
          break

        case "trainer":
          router.push("/calendar")
          break

        case "member":
          router.push("/member")
          break

        default:
          toastError("Invalid user role assigned.")
          return
      }
    } catch {
      toastError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-radial from-[#151d33] via-[#090d16] to-[#04060a]">
      {/* Logo */}
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
          Sign in to your account
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-gray-400">
          Gym management, member check-ins, and analytics suite
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl border border-white/10 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
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
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
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
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
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

              <div className="flex justify-end mt-2">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline transition"
                >
                  Forgot password?
                </Link>
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
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-gray-400">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/register"
                className="text-amber-400 font-semibold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
