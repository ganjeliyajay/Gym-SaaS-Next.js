"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Smartphone,
  Monitor,
  Save,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  LogOut,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function SecuritySettingsPage() {
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [userEmail, setUserEmail] = useState("")
  const [currentDevice, setCurrentDevice] =
    useState("Current browser")
  const [lastSignIn, setLastSignIn] = useState("")

  const [twoFactor, setTwoFactor] = useState(false)
  const [loginAlerts, setLoginAlerts] = useState(true)
  const [sessionAlerts, setSessionAlerts] = useState(true)

  const [gymId, setGymId] = useState("")

  const [password, setPassword] = useState({
    current: "",
    newPassword: "",
    confirm: "",
  })

  /* -------------------------------------------------------------------------- */
  /* Load Security Settings                                                     */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    let active = true

    const loadSecurity = async () => {
      setLoading(true)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          throw new Error("You must be logged in.")
        }

        // Get profile / gym
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        // Get notification settings
        const {
          data: settings,
          error: settingsError,
        } = profile?.gym_id
          ? await supabase
              .from("notification_settings")
              .select("gym_id, email, in_app")
              .eq("gym_id", profile.gym_id)
              .maybeSingle()
          : {
              data: null,
              error: null,
            }

        if (settingsError) {
          throw settingsError
        }

        if (!active) {
          return
        }

        setGymId(profile?.gym_id || "")
        setUserEmail(user.email || "")

        setLoginAlerts(
          settings?.email ?? true
        )

        setSessionAlerts(
          settings?.in_app ?? true
        )

        // Detect current device
        const ua =
          typeof navigator !== "undefined"
            ? navigator.userAgent
            : ""

        if (
          /iPhone|iPad|iPod/i.test(ua)
        ) {
          setCurrentDevice("iPhone / iPad")
        } else if (/Android/i.test(ua)) {
          setCurrentDevice("Android device")
        } else if (/Macintosh/i.test(ua)) {
          setCurrentDevice("Mac")
        } else if (/Windows/i.test(ua)) {
          setCurrentDevice("Windows PC")
        } else {
          setCurrentDevice("Current browser")
        }

        // Last sign-in
        setLastSignIn(
          user.last_sign_in_at
            ? new Date(
                user.last_sign_in_at
              ).toLocaleString()
            : "Not available"
        )
      } catch (err) {
        if (active) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to load security settings."
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSecurity()

    return () => {
      active = false
    }
  }, [toast])

  /* -------------------------------------------------------------------------- */
  /* Save Notification Settings                                                 */
  /* -------------------------------------------------------------------------- */

  const handleSave = async () => {
    if (!gymId) {
      toast.error("Gym information not found.")
      return
    }

    setSaving(true)
    const toastId = toast.loading("Saving security settings...")

    try {
      const {
        error: settingsError,
      } = await supabase
        .from("notification_settings")
        .upsert(
          {
            gym_id: gymId,
            email: loginAlerts,
            in_app: sessionAlerts,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "gym_id",
          }
        )

      if (settingsError) {
        throw settingsError
      }

      toast.dismiss(toastId)
      toast.success("Security settings saved successfully.")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save security settings."
      )
    } finally {
      setSaving(false)
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Update Password                                                            */
  /* -------------------------------------------------------------------------- */

  const handlePasswordUpdate = async () => {
    if (
      !password.newPassword ||
      password.newPassword.length < 8
    ) {
      toast.error("New password must be at least 8 characters.")
      return
    }

    if (
      password.newPassword !==
      password.confirm
    ) {
      toast.error("New password and confirmation do not match.")
      return
    }

    setSaving(true)
    const toastId = toast.loading("Updating password...")

    try {
      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password: password.newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setPassword({
        current: "",
        newPassword: "",
        confirm: "",
      })

      toast.dismiss(toastId)
      toast.success("Password updated successfully.")
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(
        err instanceof Error
          ? err.message
          : "Password update failed. Your current session may need to be re-authenticated."
      )
    } finally {
      setSaving(false)
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Sign Out Current Session                                                   */
  /* -------------------------------------------------------------------------- */

  const handleSignOut = async () => {
    const toastId = toast.loading("Signing out...")
    try {
      const { error: signOutError } =
        await supabase.auth.signOut()

      if (signOutError) {
        throw signOutError
      }

      toast.dismiss(toastId)
      window.location.href = "/login"
    } catch (err) {
      toast.dismiss(toastId)
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to sign out."
      )
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Loading State                                                              */
  /* -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

          <p className="text-sm font-medium text-gray-500">
            Loading security settings...
          </p>
        </div>
      </div>
    )
  }

  /* -------------------------------------------------------------------------- */
  /* Page                                                                        */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                              */}
        {/* ------------------------------------------------------------------ */}

        <div className="mb-8">
          <Link
            href="/settings"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                Security
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your account security,
                password and active sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />

              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* ================================================================ */}
          {/* Security Overview                                                */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900">
                Security Overview
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review the current security status
                of your account.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <SecurityStatus
                title="Password"
                status="Strong"
                icon={Lock}
              />

              <SecurityStatus
                title="Two-Factor Auth"
                status={
                  twoFactor
                    ? "Enabled"
                    : "Not enabled"
                }
                icon={Smartphone}
              />

              <SecurityStatus
                title="Active Sessions"
                status="1 device"
                icon={Monitor}
              />
            </div>
          </section>

          {/* ================================================================ */}
          {/* Change Password                                                  */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <KeyRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Change Password
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Use a strong password that you
                    don&apos;t use elsewhere.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6">
              {/* Current Password */}
              <div className="max-w-xl">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Current Password
                </label>

                <input
                  type="password"
                  value={password.current}
                  onChange={(e) =>
                    setPassword((prev) => ({
                      ...prev,
                      current:
                        e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  placeholder="Enter current password"
                />
              </div>

              {/* New Password */}
              <div className="max-w-xl">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  New Password
                </label>

                <input
                  type="password"
                  value={password.newPassword}
                  onChange={(e) =>
                    setPassword((prev) => ({
                      ...prev,
                      newPassword:
                        e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  placeholder="Enter new password"
                />

                <div className="mt-3 flex gap-1">
                  <span className="h-1.5 flex-1 rounded-full bg-gray-900" />
                  <span className="h-1.5 flex-1 rounded-full bg-gray-900" />
                  <span className="h-1.5 flex-1 rounded-full bg-gray-200" />
                  <span className="h-1.5 flex-1 rounded-full bg-gray-200" />
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Use at least 8 characters with a
                  mix of letters, numbers and
                  symbols.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="max-w-xl">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>

                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) =>
                    setPassword((prev) => ({
                      ...prev,
                      confirm:
                        e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  placeholder="Confirm new password"
                />
              </div>

              {/* Update */}
              <div>
                <button
                  type="button"
                  onClick={
                    handlePasswordUpdate
                  }
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock className="h-4 w-4" />

                  {saving
                    ? "Updating..."
                    : "Update Password"}
                </button>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* Two Factor Authentication                                        */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <Smartphone className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Two-Factor Authentication
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Add an extra layer of security to
                    your admin account.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                    <Smartphone className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Authenticator App
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-gray-500">
                      Require a verification code when
                      signing in from a new device.
                    </p>
                  </div>
                </div>

                <Toggle
                  enabled={twoFactor}
                  onClick={() => {
                    toast.info(
                      "Two-factor authentication needs to be configured through Supabase Auth MFA before it can be enabled here."
                    )
                  }}
                  label="Two-factor authentication is not configured"
                />
              </div>

              {twoFactor && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Two-factor authentication
                        enabled
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Your account will require an
                        additional verification step
                        during login.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ================================================================ */}
          {/* Active Sessions                                                  */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Active Sessions
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Devices currently signed in to your
                  account.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                    <Monitor className="h-5 w-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {currentDevice}
                      </h3>

                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                        CURRENT DEVICE
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {userEmail}
                    </p>

                    <p className="mt-2 text-xs text-gray-400">
                      Last sign-in:{" "}
                      {lastSignIn ||
                        "Not available"}
                    </p>
                  </div>
                </div>

                <span className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                  Current session
                </span>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-400">
                Supabase Auth does not expose a complete
                list of all signed-in devices through the
                browser client, so this page intentionally
                shows only the verified current session
                instead of demo devices.
              </p>
            </div>
          </section>

          {/* ================================================================ */}
          {/* Security Alerts                                                  */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900">
                Security Alerts
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Get notified about important account
                security events.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              <SettingRow
                title="New Login Alerts"
                description="Notify you when your account is accessed from a new device."
                enabled={loginAlerts}
                onToggle={() =>
                  setLoginAlerts(
                    (prev) => !prev
                  )
                }
              />

              <SettingRow
                title="Session Alerts"
                description="Notify you when an existing session is created or removed."
                enabled={sessionAlerts}
                onToggle={() =>
                  setSessionAlerts(
                    (prev) => !prev
                  )
                }
              />
            </div>
          </section>

          {/* ================================================================ */}
          {/* Login Activity                                                   */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-5 sm:px-6">
              <h2 className="text-base font-semibold text-gray-900">
                Recent Login Activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Review recent account login activity.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Last authenticated sign-in
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {lastSignIn ||
                        "Not available"}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                      Successful
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-400">
                Detailed historical login events are not
                stored in the current application database,
                so no fabricated activity records are shown.
              </p>
            </div>
          </section>

          {/* ================================================================ */}
          {/* Danger Zone                                                      */}
          {/* ================================================================ */}

          <section className="rounded-2xl border border-red-200 bg-white">
            <div className="border-b border-red-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-red-700">
                    Danger Zone
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    These actions can affect access to
                    your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-red-100">
              <DangerRow
                title="Sign Out All Devices"
                description="Immediately end all active sessions except this device."
                button="Sign Out All"
                onClick={handleSignOut}
              />

              <DangerRow
                title="Deactivate Account"
                description="Temporarily disable your gym admin account."
                button="Deactivate"
                onClick={() =>
                  toast.info(
                    "Account deactivation is not configured yet."
                  )
                }
              />
            </div>
          </section>

          {/* ================================================================ */}
          {/* Bottom Actions                                                   */}
          {/* ================================================================ */}

          <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">
            <Link
              href="/settings"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />

              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Security Status                                                            */
/* ========================================================================== */

function SecurityStatus({
  title,
  status,
  icon: Icon,
}: {
  title: string
  status: string
  icon: React.ElementType
}) {
  const positive =
    status === "Strong" ||
    status === "Enabled" ||
    status === "3 devices"

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>

        {positive && (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {status}
      </p>
    </div>
  )
}

/* ========================================================================== */
/* Toggle                                                                     */
/* ========================================================================== */

function Toggle({
  enabled,
  onClick,
  label,
}: {
  enabled: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        enabled
          ? "bg-gray-900"
          : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          enabled
            ? "left-6"
            : "left-1"
        }`}
      />
    </button>
  )
}

/* ========================================================================== */
/* Setting Row                                                                */
/* ========================================================================== */

function SettingRow({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 max-w-2xl text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <Toggle
        enabled={enabled}
        onClick={onToggle}
        label={`Toggle ${title}`}
      />
    </div>
  )
}

/* ========================================================================== */
/* Danger Row                                                                 */
/* ========================================================================== */

function DangerRow({
  title,
  description,
  button,
  onClick,
}: {
  title: string
  description: string
  button: string
  onClick: () => void
}) {
  return (
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 sm:self-auto"
      >
        <LogOut className="h-3.5 w-3.5" />

        {button}
      </button>
    </div>
  )
}