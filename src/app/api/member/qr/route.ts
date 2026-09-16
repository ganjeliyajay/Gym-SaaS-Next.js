import { NextResponse } from "next/server"
import { getAuthenticatedServerUser } from "@/lib/auth/server"
import { generateMemberQrToken } from "@/lib/auth/qr-token"
import QRCode from "qrcode"

export async function GET() {
  try {
    const authUser = await getAuthenticatedServerUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      )
    }

    if (!authUser.gymId) {
      return NextResponse.json(
        { success: false, error: "No gym associated with this member account." },
        { status: 400 }
      )
    }

    // 24 hours expiry
    const expiresInSeconds = 86400
    const token = generateMemberQrToken({
      memberId: authUser.id,
      gymId: authUser.gymId,
      expiresInSeconds,
    })

    const qrDataUrl = await QRCode.toDataURL(token, {
      margin: 2,
      width: 280,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString()

    return NextResponse.json({
      success: true,
      token,
      qrDataUrl,
      expiresAt,
      memberName: authUser.fullName,
    })
  } catch (err: any) {
    console.error("Generate member QR error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate member QR code." },
      { status: 500 }
    )
  }
}
