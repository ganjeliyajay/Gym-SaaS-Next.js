
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import {
    ArrowLeft,
    ChevronDown,
    Check,
    ShieldCheck,
    UserPlus,
    Mail,
    LockKeyhole,
    User,
    Users,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Role = "Admin" | "Manager" | "Trainer"

const roleMap: Record<Role, string> = {
    Admin: "admin",
    Manager: "manager",
    Trainer: "trainer",
}

const roleDescriptions: Record<Role, string> = {
    Admin: "Can manage the gym and team members.",
    Manager: "Can manage gym operations.",
    Trainer: "Can manage training and member activities.",
}

export default function InviteTeamPage() {
    const router = useRouter()

    const {
        error: toastError,
        loading: toastLoading,
        success: toastSuccess,
        dismiss,
    } = useToast()

    const [role, setRole] = useState<Role>("Trainer")
    const [showRoles, setShowRoles] = useState(false)

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [gymId, setGymId] = useState("")
    const [loading, setLoading] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)

    // Authentication
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser()

                if (!user) {
                    router.push("/login")
                    return
                }

                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("role, gym_id")
                    .eq("id", user.id)
                    .single()

                if (
                    error ||
                    !profile ||
                    !["admin", "super_admin"].includes(
                        String(profile.role || "").toLowerCase()
                    )
                ) {
                    router.push("/team")
                    return
                }

                setGymId(profile.gym_id || "")
            } catch (error) {
                console.error("Access check failed:", error)
                router.push("/team")
            } finally {
                setCheckingAccess(false)
            }
        }

        checkAccess()
    }, [router])

    // Create user
    const handleCreate = async () => {
        if (!name.trim()) {
            toastError("Please enter the team member's name.")
            return
        }

        if (!email.trim()) {
            toastError("Please enter the team member's email.")
            return
        }

        if (!email.includes("@")) {
            toastError("Please enter a valid email address.")
            return
        }

        if (!password) {
            toastError("Please enter a password.")
            return
        }

        if (password.length < 6) {
            toastError("Password must be at least 6 characters.")
            return
        }

        if (!gymId) {
            toastError("Gym information is missing.")
            return
        }

        const dbRole = roleMap[role]

        setLoading(true)

        const toastId = toastLoading("Creating team member...")

        try {
            const res = await axios.post("/api/team/invite", {
                name: name.trim(),
                email: email.trim(),
                password,
                role: dbRole,
                gymId,
            })

            dismiss(toastId)

            if (res.data?.success) {
                toastSuccess(
                    res.data?.message || "Team member created successfully."
                )

                setName("")
                setEmail("")
                setPassword("")
                setRole("Trainer")

                setTimeout(() => {
                    router.push("/team")
                    router.refresh()
                }, 500)

                return
            }

            toastError(
                res.data?.message ||
                "We couldn't create the team member. Please try again."
            )
        } catch (error: any) {
            dismiss(toastId)

            console.error("Team member creation failed:", error)

            toastError(
                error?.response?.data?.message ||
                "We couldn't create the team member. Please try again."
            )
        } finally {
            setLoading(false)
        }
    }

    if (checkingAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                    <p className="text-sm font-medium text-slate-500">
                        Checking access...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => router.push("/team")}
                        disabled={loading}
                        className="group mb-6 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
                    >
                        <ArrowLeft
                            size={17}
                            className="transition-transform group-hover:-translate-x-0.5"
                        />
                        Back to Team
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                            <UserPlus size={21} strokeWidth={2} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                Create team member
                            </h1>

                            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                                Create a new team member account and assign the appropriate
                                access level.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    {/* Form Card */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Card Header */}
                        <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                                    <Users size={18} className="text-slate-700" />
                                </div>

                                <div>
                                    <h2 className="text-base font-semibold text-slate-950">
                                        Member information
                                    </h2>

                                    <p className="mt-0.5 text-sm text-slate-500">
                                        Enter the details for the new team member.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="px-5 py-6 sm:px-7 sm:py-7">
                            <div className="space-y-6">
                                {/* Name */}
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Full name
                                    </label>

                                    <div className="relative">
                                        <User
                                            size={17}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            id="name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter full name"
                                            disabled={loading}
                                            autoComplete="name"
                                            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Email address
                                    </label>

                                    <div className="relative">
                                        <Mail
                                            size={17}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@example.com"
                                            disabled={loading}
                                            autoComplete="email"
                                            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Password
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole
                                            size={17}
                                            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a secure password"
                                            disabled={loading}
                                            minLength={6}
                                            autoComplete="new-password"
                                            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                        />
                                    </div>

                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                        <ShieldCheck size={14} />
                                        Password must be at least 6 characters.
                                    </div>
                                </div>

                                {/* Role */}
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                                        Role
                                    </label>

                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowRoles((value) => !value)}
                                            disabled={loading}
                                            className={`flex min-h-16 w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition ${showRoles
                                                    ? "border-slate-900 ring-4 ring-slate-100"
                                                    : "border-slate-300 hover:border-slate-400"
                                                } disabled:cursor-not-allowed disabled:bg-slate-50`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                                    <ShieldCheck
                                                        size={17}
                                                        className="text-slate-700"
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {role}
                                                    </p>

                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                        {roleDescriptions[role]}
                                                    </p>
                                                </div>
                                            </div>

                                            <ChevronDown
                                                size={18}
                                                className={`ml-3 shrink-0 text-slate-500 transition-transform ${showRoles ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </button>

                                        {showRoles && (
                                            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/60">
                                                {(Object.keys(roleMap) as Role[]).map((item) => {
                                                    const isSelected = item === role

                                                    return (
                                                        <button
                                                            key={item}
                                                            type="button"
                                                            onClick={() => {
                                                                setRole(item)
                                                                setShowRoles(false)
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition hover:bg-slate-50"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {item}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-slate-500">
                                                                    {roleDescriptions[item]}
                                                                </p>
                                                            </div>

                                                            {isSelected && (
                                                                <div className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                                                                    <Check size={14} />
                                                                </div>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Permission Preview */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                    <div className="flex gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                                            <ShieldCheck
                                                size={17}
                                                className="text-slate-700"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Permission preview
                                            </p>

                                            <p className="mt-1 text-sm leading-5 text-slate-500">
                                                {roleDescriptions[role]}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:justify-end sm:px-7">
                            <button
                                type="button"
                                onClick={() => router.push("/team")}
                                disabled={loading}
                                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={loading}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <UserPlus size={17} />

                                {loading ? "Creating..." : "Create Team Member"}
                            </button>
                        </div>
                    </section>

                    {/* Side Information */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                                <ShieldCheck size={19} className="text-slate-700" />
                            </div>

                            <h3 className="mt-4 text-sm font-semibold text-slate-950">
                                Team access
                            </h3>

                            <p className="mt-1.5 text-sm leading-6 text-slate-500">
                                Choose a role based on the responsibilities this team member
                                will have inside your gym.
                            </p>

                            <div className="mt-5 space-y-4">
                                {(Object.keys(roleDescriptions) as Role[]).map((item) => (
                                    <div key={item} className="flex gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                            <Check size={13} className="text-slate-700" />
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold text-slate-800">
                                                {item}
                                            </p>

                                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                                                {roleDescriptions[item]}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    )
}
