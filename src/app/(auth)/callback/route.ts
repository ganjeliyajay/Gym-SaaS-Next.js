import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/invite/accept"

  // Code missing
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url),
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Cookie writes can fail in some server contexts.
          }
        },
      },
    },
  )

  // Exchange Supabase auth code for session
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth callback error:", error)

    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url),
    )
  }

  // Prevent external redirects.
  const safeNext = next.startsWith("/") ? next : "/invite/accept"

  return NextResponse.redirect(new URL(safeNext, request.url))
}
