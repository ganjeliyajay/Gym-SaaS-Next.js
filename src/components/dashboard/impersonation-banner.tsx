"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, LogOut, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export default function ImpersonationBanner() {
  const toast = useToast()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Check if impersonation cookie exists
    const hasCookie = document.cookie.split(";").some((c) => c.trim().startsWith("impersonating_from_superadmin="))
    setIsImpersonating(hasCookie)
  }, [])

  if (!isImpersonating) return null

  const handleExit = async () => {
    setExiting(true)
    const toastId = toast.loading("Exiting impersonation...")
    try {
      const res = await fetch("/api/super-admin/exit-impersonate", { method: "POST" })
      const data = await res.json()
      toast.dismiss(toastId)
      toast.success("Exited impersonation. Redirecting...")
      if (data.actionLink) {
        window.location.href = data.actionLink
      } else {
        window.location.href = "/super-admin"
      }
    } catch (e) {
      toast.dismiss(toastId)
      toast.error("Failed to exit impersonation gracefully, redirecting...")
      window.location.href = "/super-admin"
    }
  }

  return (
    <div className="bg-amber-500 text-black px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} />
        <span>Super Admin Impersonation Mode Active. Actions performed here affect real gym data.</span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="flex items-center gap-1.5 bg-black text-white hover:bg-slate-900 px-3 py-1 rounded-md text-xs font-bold transition disabled:opacity-50 cursor-pointer"
      >
        {exiting ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
        Exit Impersonation
      </button>
    </div>
  )
}
