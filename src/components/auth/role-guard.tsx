"use client"

import { ReactNode } from "react"
import type { UserRole } from "@/lib/auth/roles"

type RoleGuardProps = {
  allowedRoles: UserRole[]
  userRole: UserRole
  children: ReactNode
  fallback?: ReactNode
}

export default function RoleGuard({
  allowedRoles,
  userRole,
  children,
  fallback = null,
}: RoleGuardProps) {
  if (!allowedRoles.includes(userRole)) {
    return fallback
  }

  return <>{children}</>
}
