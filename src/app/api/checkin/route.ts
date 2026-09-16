import { NextResponse } from "next/server"

import { getAuthenticatedServerUser, supabaseAdmin } from "@/lib/auth/server"

import { executeCheckInProcess } from "@/lib/membership/entitlements"

import { verifyMemberQrToken } from "@/lib/auth/qr-token"

type CheckInRequestBody = {
  memberId?: string
  qrToken?: string
  method?: "manual" | "qr"
  doorId?: string
  overrideSameDay?: boolean
  gymId?: string
}

type ErrorWithMessage = {
  message?: string
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const value = (error as ErrorWithMessage).message

    if (typeof value === "string") {
      return value
    }
  }

  return "Failed to process check-in."
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedServerUser()

    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to perform check-in.",
        },
        { status: 401 },
      )
    }

    // Only gym staff and super admin can perform
    // member check-ins.
    const staffRoles = ["admin", "manager", "trainer", "super_admin"]

    if (!staffRoles.includes(authUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Permission denied. Staff credentials required for check-in operations.",
        },
        { status: 403 },
      )
    }

    const body = (await request.json()) as CheckInRequestBody

    const {
      memberId,
      qrToken,
      method = "manual",
      doorId,
      overrideSameDay = false,
      gymId,
    } = body

    // Super admin can explicitly select a gym.
    // Normal staff must always use their own gym.
    const targetGymId =
      authUser.role === "super_admin" ? gymId || authUser.gymId : authUser.gymId

    if (!targetGymId) {
      return NextResponse.json(
        {
          success: false,
          message: "Gym ID could not be identified.",
        },
        { status: 400 },
      )
    }

    let finalMemberId = memberId

    // --------------------------------------------------
    // QR VERIFICATION
    // --------------------------------------------------

    if (qrToken || method === "qr") {
      const tokenToVerify = qrToken || memberId

      if (!tokenToVerify) {
        return NextResponse.json(
          {
            success: false,
            access: "denied",
            reason: "QR token is required.",
          },
          { status: 400 },
        )
      }

      const verification = verifyMemberQrToken(tokenToVerify)

      if (!verification.valid || !verification.memberId) {
        return NextResponse.json(
          {
            success: false,
            access: "denied",
            reason:
              verification.error ||
              "Invalid, altered, or expired QR code pass.",
          },
          { status: 400 },
        )
      }

      // A normal gym staff user can only scan
      // QR codes belonging to their gym.
      if (
        authUser.role !== "super_admin" &&
        verification.gymId !== targetGymId
      ) {
        return NextResponse.json(
          {
            success: false,
            access: "denied",
            reason: "This QR code belongs to a different gym facility.",
          },
          { status: 403 },
        )
      }

      // For super admin, if QR contains a gym,
      // also prevent an explicitly selected gym
      // mismatch.
      if (
        authUser.role === "super_admin" &&
        verification.gymId &&
        gymId &&
        verification.gymId !== gymId
      ) {
        return NextResponse.json(
          {
            success: false,
            access: "denied",
            reason: "This QR code does not belong to the selected gym.",
          },
          { status: 403 },
        )
      }

      finalMemberId = verification.memberId
    }

    if (!finalMemberId) {
      return NextResponse.json(
        {
          success: false,
          message: "Member identifier or QR token is required.",
        },
        { status: 400 },
      )
    }

    // --------------------------------------------------
    // CENTRALIZED CHECK-IN
    // --------------------------------------------------

    const checkInResult = await executeCheckInProcess(supabaseAdmin, {
      gymId: targetGymId,
      memberId: finalMemberId,
      method: method === "qr" || Boolean(qrToken) ? "qr" : "manual",
      doorId,
      overrideSameDay,
    })

    if (!checkInResult.success) {
      return NextResponse.json(
        {
          success: false,
          access: "denied",
          reason: checkInResult.reason || "Check-in denied.",
          member: checkInResult.member ?? null,
          membership: checkInResult.membership ?? null,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      success: true,
      access: "granted",
      isReEntry: checkInResult.isReEntry || false,
      checkInId: checkInResult.checkInId,
      checkedInAt: checkInResult.checkedInAt,
      member: checkInResult.member ?? null,
      membership: checkInResult.membership ?? null,
      reason: checkInResult.reason,
    })
  } catch (error: unknown) {
    console.error("Check-in API error:", error)

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error),
      },
      { status: 500 },
    )
  }
}
