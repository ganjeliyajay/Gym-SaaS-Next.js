import crypto from "crypto"

export interface QrTokenPayload {
  memberId: string
  gymId: string
  iat: number
  exp: number
  nonce: string
}

function getSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET
  if (!secret) {
    throw new Error("QR_SIGNING_SECRET is missing.")
  }
  return secret
}

/**
 * Generates a tamper-proof cryptographically signed token for member check-in.
 * By default expires in 24 hours (86,400 seconds).
 */
export function generateMemberQrToken(params: {
  memberId: string
  gymId: string
  expiresInSeconds?: number
}): string {
  const secret = getSecret()
  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = nowSec + (params.expiresInSeconds || 86400) // 24 hours

  const payload: QrTokenPayload = {
    memberId: params.memberId,
    gymId: params.gymId,
    iat: nowSec,
    exp: expSec,
    nonce: crypto.randomBytes(8).toString("hex"),
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url")

  return `GYMQR.${payloadBase64}.${signature}`
}

/**
 * Validates a member check-in QR token.
 * Verifies HMAC-SHA256 signature, expiry, and returns memberId and gymId.
 */
export function verifyMemberQrToken(token: string): {
  valid: boolean
  memberId?: string
  gymId?: string
  error?: string
} {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Empty or invalid QR token format." }
    }

    const trimmed = token.trim()

    // Handle prefixed or JSON-encoded legacy scanner strings safely
    let rawToken = trimmed
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed.qrToken) rawToken = parsed.qrToken
        else if (parsed.token) rawToken = parsed.token
      } catch {
        // Continue with trimmed
      }
    }

    const parts = rawToken.split(".")
    if (parts.length !== 3 || parts[0] !== "GYMQR") {
      return { valid: false, error: "Invalid QR code signature format." }
    }

    const [, payloadBase64, signature] = parts
    const secret = getSecret()

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest("base64url")

    const sigBuf = Buffer.from(signature)
    const expBuf = Buffer.from(expectedSignature)

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: "Invalid QR code signature. Authentication failed." }
    }

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8")
    const payload: QrTokenPayload = JSON.parse(payloadJson)

    const nowSec = Math.floor(Date.now() / 1000)
    if (payload.exp && nowSec > payload.exp) {
      return { valid: false, error: "QR code has expired. Please refresh your check-in code." }
    }

    if (!payload.memberId || !payload.gymId) {
      return { valid: false, error: "Incomplete QR code payload." }
    }

    return {
      valid: true,
      memberId: payload.memberId,
      gymId: payload.gymId,
    }
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to decode QR token." }
  }
}
