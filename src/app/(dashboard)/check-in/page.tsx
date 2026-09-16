"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import jsQR from "jsqr"
import {
  Search,
  ScanLine,
  UserCheck,
  Users,
  Clock3,
  CalendarDays,
  CheckCircle2,
  X,
  ChevronRight,
  MoreHorizontal,
  Dumbbell,
  RefreshCw,
  Camera,
  CameraOff,
  AlertCircle,
} from "lucide-react"

type Member = {
  id: string
  name: string
  email: string
  initials: string
  product: string
  status: "Active" | "Inactive"
  lastCheckIn: string
}

type CheckIn = {
  id: string
  name: string
  initials: string
  product: string
  time: string
  method: "Manual" | "QR"
}

export default function CheckInPage() {
  const toast = useToast()
  const [search, setSearch] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [stats, setStats] = useState({
    today: 0,
    activeMembers: 0,
    peakTime: "—",
    peakCount: 0,
    month: 0,
    averagePerDay: 0,
    yesterday: 0,
  })

  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false)

  const playBeep = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.16)
    } catch {
      // AudioContext unavailable
    }
  }

  const stopScanner = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
    isProcessingRef.current = false
  }

  const scanLoop = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight
      canvas.width = video.videoWidth
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        })

        if (code && code.data && !isProcessingRef.current) {
          isProcessingRef.current = true
          handleQRScanned(code.data)
          return
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(scanLoop)
  }

  const handleQRScanned = async (rawData: string) => {
    try {
      const scannedToken = rawData.trim()
      await executeCheckIn(scannedToken, "QR")
      setTimeout(() => {
        isProcessingRef.current = false
        animFrameRef.current = requestAnimationFrame(scanLoop)
      }, 3000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to process QR check-in"
      toast.error(message)
      setTimeout(() => {
        isProcessingRef.current = false
        animFrameRef.current = requestAnimationFrame(scanLoop)
      }, 2500)
    }
  }

  const startScanner = async () => {
    setScannerError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setIsScanning(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        await videoRef.current.play()
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err)
      setScannerError("Camera permission denied or camera device not found.")
      toast.warning("Camera permission denied or camera device not found.")
      setIsScanning(false)
    }
  }

  useEffect(() => {
    if (!isScanning) return

    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(scanLoop)
    }

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [isScanning])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const executeCheckIn = async (
    identifier: string,
    checkInMethod: "Manual" | "QR",
  ) => {
    setCheckingIn(true)

    try {
      const payload: {
        method: "qr" | "manual"
        qrToken?: string
        memberId?: string
      } = {
        method: checkInMethod === "QR" ? "qr" : "manual",
      }

      if (checkInMethod === "QR") {
        payload.qrToken = identifier
      } else {
        payload.memberId = identifier
      }

      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as {
        success?: boolean
        reason?: string
        message?: string
        member?: { name?: string }
        membership?: { remainingVisits?: number | null }
      }

      if (!response.ok || !result.success) {
        throw new Error(result.reason || result.message || "Check-in denied.")
      }

      playBeep()

      const visitDetail =
        result.membership?.remainingVisits != null
          ? `${result.membership.remainingVisits} visits remaining`
          : "Active Membership"

      toast.success(
        `${result.member?.name || "Member"} checked in successfully! (${visitDetail})`,
      )

      setSelectedMember(null)
      setSearch("")
      await loadData()
    } finally {
      setCheckingIn(false)
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      // =========================
      // AUTHENTICATION
      // =========================

      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        throw new Error("You must be logged in.")
      }

      // =========================
      // GET GYM PROFILE
      // =========================

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", authData.user.id)
        .single()

      if (profileError || !profile?.gym_id) {
        throw new Error("Gym profile not found.")
      }

      const gymId = profile.gym_id

      // =========================
      // DATE RANGES
      // =========================

      const now = new Date()

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      )

      const startOfTomorrow = new Date(startOfToday)
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)

      const startOfYesterday = new Date(startOfToday)
      startOfYesterday.setDate(startOfYesterday.getDate() - 1)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // =========================
      // FETCH MEMBERS + CHECK-INS
      // =========================

      const [
        { data: memberRows, error: memberError },
        { data: checkinRows, error: checkinError },
        { data: monthRows, error: monthError },
      ] = await Promise.all([
        // Members
        supabase
          .from("members")
          .select("id, first_name, last_name, email, status")
          .eq("gym_id", gymId)
          .order("first_name"),

        // Yesterday + Today Check-ins
        supabase
          .from("checkins")
          .select("id, member_id, checked_in_at, method")
          .eq("gym_id", gymId)
          .gte("checked_in_at", startOfYesterday.toISOString())
          .lt("checked_in_at", startOfTomorrow.toISOString())
          .order("checked_in_at", {
            ascending: false,
          }),

        // Current Month Check-ins
        supabase
          .from("checkins")
          .select("id, member_id, checked_in_at")
          .eq("gym_id", gymId)
          .gte("checked_in_at", startOfMonth.toISOString())
          .order("checked_in_at", {
            ascending: true,
          }),
      ])

      if (memberError) {
        throw memberError
      }

      if (checkinError) {
        throw checkinError
      }

      if (monthError) {
        throw monthError
      }

      // =========================
      // GET LATEST CHECK-IN
      // =========================

      const latest = new Map<string, any>()

      ;(checkinRows ?? []).forEach((row) => {
        if (!latest.has(row.member_id)) {
          latest.set(row.member_id, row)
        }
      })

      // =========================
      // GET MEMBER IDS
      // =========================

      const ids = (memberRows ?? []).map((member) => member.id)

      // =========================
      // GET PAID MEMBERSHIPS
      // =========================

      const { data: payments } = ids.length
        ? await supabase
            .from("payments")
            .select("member_id, products(name)")
            .eq("gym_id", gymId)
            .in("member_id", ids)
            .eq("status", "paid")
            .order("created_at", {
              ascending: false,
            })
        : {
            data: [] as any[],
          }

      // =========================
      // MAP MEMBER PRODUCTS
      // =========================

      const products = new Map<string, string>()

      ;(payments ?? []).forEach((row: any) => {
        if (!products.has(row.member_id)) {
          const product = Array.isArray(row.products)
            ? row.products[0]
            : row.products

          if (product?.name) {
            products.set(row.member_id, product.name)
          }
        }
      })

      // =========================
      // MAP MEMBERS
      // =========================

      const mapped: Member[] = (memberRows ?? []).map((member) => {
        const name =
          `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
          "Unnamed Member"

        const initials =
          name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((letter) => letter[0])
            .join("")
            .toUpperCase() || "M"

        const last = latest.get(member.id)

        return {
          id: member.id,
          name,
          email: member.email ?? "",
          initials,
          product: products.get(member.id) || "No active membership",
          status: member.status === "active" ? "Active" : "Inactive",
          lastCheckIn: last ? formatDateTime(last.checked_in_at) : "Never",
        }
      })

      // =========================
      // MEMBER MAP
      // =========================

      const memberMap = new Map(mapped.map((member) => [member.id, member]))

      // =========================
      // TODAY'S CHECK-INS
      // =========================

      const recent = (checkinRows ?? []).filter((row) => {
        const date = new Date(row.checked_in_at)

        return date >= startOfToday
      })

      // =========================
      // RECENT CHECK-IN LIST
      // =========================

      const mappedIns: CheckIn[] = recent.slice(0, 10).map((row) => {
        const member = memberMap.get(row.member_id)

        return {
          id: row.id,
          name: member?.name ?? "Unknown Member",
          initials: member?.initials ?? "M",
          product: member?.product ?? "No membership",
          time: formatTime(row.checked_in_at),
          method: row.method === "qr" ? "QR" : "Manual",
        }
      })

      // =========================
      // PEAK TIME
      // =========================

      const hourly = new Map<number, number>()

      recent.forEach((row) => {
        const hour = new Date(row.checked_in_at).getHours()

        hourly.set(hour, (hourly.get(hour) || 0) + 1)
      })

      let peak = -1
      let peakCount = 0

      hourly.forEach((count, hour) => {
        if (count > peakCount) {
          peak = hour
          peakCount = count
        }
      })

      // =========================
      // YESTERDAY CHECK-INS
      // =========================

      const yesterday = (checkinRows ?? []).filter((row) => {
        const date = new Date(row.checked_in_at)

        return date >= startOfYesterday && date < startOfToday
      }).length

      // =========================
      // AVERAGE PER DAY
      // =========================

      const days = Math.max(1, now.getDate())

      // =========================
      // SET STATE
      // =========================

      setMembers(mapped)

      setCheckIns(mappedIns)

      setStats({
        today: recent.length,

        activeMembers: mapped.filter((member) => member.status === "Active")
          .length,

        peakTime:
          peak >= 0
            ? `${formatHour(peak)}–${formatHour((peak + 2) % 24)}`
            : "—",

        peakCount,

        month: (monthRows ?? []).length,

        averagePerDay: Math.round((monthRows ?? []).length / days),

        yesterday,
      })
    } catch (e) {
      console.error(e)
      toast.error("Failed to load check-in data. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])
  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return []

    const value = search.toLowerCase()

    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(value) ||
        member.email.toLowerCase().includes(value),
    )
  }, [search, members])

  const handleCheckIn = async () => {
    if (!selectedMember || checkingIn) return
    try {
      await executeCheckIn(selectedMember.id, "Manual")
    } catch (e: unknown) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : "Failed to check in member.")
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
              <Dumbbell className="h-4 w-4" />
              <span>Gym Management</span>
              <ChevronRight className="h-4 w-4" />
              <span>Check-In</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Check-In
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Quickly check members into your gym.
            </p>
          </div>

          <button
            onClick={() => loadData()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<UserCheck className="h-5 w-5" />}
            label="Today's Check-Ins"
            value={stats.today.toString()}
            detail={
              stats.yesterday > 0
                ? `${
                    Math.round(
                      ((stats.today - stats.yesterday) / stats.yesterday) * 100,
                    ) >= 0
                      ? "+"
                      : ""
                  }${Math.round(
                    ((stats.today - stats.yesterday) / stats.yesterday) * 100,
                  )}% from yesterday`
                : "No check-ins yesterday"
            }
          />

          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Active Members"
            value={stats.activeMembers.toString()}
            detail={`${stats.today} checked in today`}
          />

          <StatCard
            icon={<Clock3 className="h-5 w-5" />}
            label="Peak Time"
            value={stats.peakTime}
            detail={`${stats.peakCount} check-ins`}
          />

          <StatCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="This Month"
            value={stats.month.toLocaleString()}
            detail={`Avg. ${stats.averagePerDay} per day`}
          />
        </div>

        {/* Main Check-In Area */}
        <div className="mb-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* Manual Check-In */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Manual Check-In
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Search for a member by name or email.
                </p>
              </div>

              <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gray-100 sm:flex">
                <UserCheck className="h-5 w-5 text-gray-700" />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member name or email..."
                className="h-13 w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
              />
            </div>

            {/* Search Results */}
            {search && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition last:border-b-0 hover:bg-gray-50"
                    >
                      <Avatar initials={member.initials} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {member.email}
                        </p>
                      </div>

                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-medium text-gray-700">
                          {member.product}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {member.lastCheckIn}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Users className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No members found
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Try searching with another name or email.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!search && (
              <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>

                <p className="mt-3 text-sm font-medium text-gray-700">
                  Search for a member
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Select a member to start the check-in process.
                </p>
              </div>
            )}
          </section>

          {/* QR Scanner */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                QR Scanner
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Scan a member's check-in QR code using device camera.
              </p>
            </div>

            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-gray-950">
              <canvas ref={canvasRef} className="hidden" />

              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  {/* Scanner Overlay Frame */}
                  <div className="relative z-10 h-48 w-48 sm:h-56 sm:w-56">
                    <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-emerald-400" />
                    <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-emerald-400" />
                    <span className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-emerald-400" />
                    <span className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-emerald-400" />

                    {/* Animated Scanning Line */}
                    <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                  </div>

                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-4 py-2 text-xs text-white backdrop-blur flex items-center gap-2 z-10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Scanning active... Point at QR
                  </div>
                </>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="hidden"
                  />

                  {/* Idle Camera Background */}
                  <div className="absolute inset-0 opacity-10">
                    <div
                      className="h-full w-full"
                      style={{
                        backgroundImage:
                          "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                      }}
                    />
                  </div>

                  {/* Idle Scanner Frame */}
                  <div className="relative h-48 w-48 sm:h-56 sm:w-56">
                    <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white/60" />
                    <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white/60" />
                    <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white/60" />
                    <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white/60" />
                    <div className="absolute left-4 right-4 top-1/2 h-px bg-white/40" />
                  </div>

                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-4 py-2 text-xs text-white backdrop-blur">
                    Camera scanner ready
                  </div>
                </>
              )}
            </div>

            {scannerError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}

            {isScanning ? (
              <button
                type="button"
                onClick={stopScanner}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <CameraOff className="h-4 w-4" />
                Stop Scanner
              </button>
            ) : (
              <button
                type="button"
                onClick={startScanner}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                <Camera className="h-4 w-4" />
                Start Camera Scanner
              </button>
            )}

            <p className="mt-3 text-center text-xs text-gray-400">
              Instant entitlement validation with camera QR scanning.
            </p>
          </section>
        </div>

        {/* Recent Check-Ins */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Check-Ins
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Today's latest member activity.
              </p>
            </div>

            <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
              View all
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Membership
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Method
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                  <th className="w-12 px-4" />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-gray-400"
                    >
                      Loading check-ins...
                    </td>
                  </tr>
                ) : checkIns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-gray-400"
                    >
                      No check-ins today.
                    </td>
                  </tr>
                ) : (
                  checkIns.map((checkIn) => (
                    <tr
                      key={checkIn.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar initials={checkIn.initials} />

                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {checkIn.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Member #{String(checkIn.id).padStart(4, "0")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {checkIn.product}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {checkIn.time}
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {checkIn.method === "QR" ? (
                            <ScanLine className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          {checkIn.method}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                          Checked In
                        </span>
                      </td>

                      <td className="px-4">
                        <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="divide-y divide-gray-100 md:hidden">
            {loading ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Loading check-ins...
              </div>
            ) : checkIns.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No check-ins today.
              </div>
            ) : (
              checkIns.map((checkIn) => (
                <div key={checkIn.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={checkIn.initials} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {checkIn.name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {checkIn.product}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                      {checkIn.method === "QR" ? (
                        <ScanLine className="h-3 w-3" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      {checkIn.method}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-400">{checkIn.time}</span>

                    <span className="flex items-center gap-1.5 font-medium text-gray-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Checked In
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Selected Member Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Check-In
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Review member details before checking in.
                </p>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                  {selectedMember.initials}
                </div>

                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedMember.name}
                  </p>

                  <p className="mt-0.5 text-sm text-gray-500">
                    {selectedMember.email}
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                    {selectedMember.product}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                  <div>
                    <p className="text-xs text-gray-400">Membership Status</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {selectedMember.status}
                    </p>
                  </div>

                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <span className="h-2 w-2 rounded-full bg-gray-500" />
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                  <div>
                    <p className="text-xs text-gray-400">Last Check-In</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {selectedMember.lastCheckIn}
                    </p>
                  </div>

                  <Clock3 className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setSelectedMember(null)}
                  className="h-11 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleCheckIn}
                  className="h-11 flex-1 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Confirm Check-In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}
function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM"
  const h = hour % 12 || 12
  return `${h} ${suffix}`
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs font-medium text-gray-500">{label}</p>

      <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-400">{detail}</p>
    </div>
  )
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
      {initials}
    </div>
  )
}
