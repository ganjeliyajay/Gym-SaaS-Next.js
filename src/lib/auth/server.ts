import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { isValidRole, type UserRole } from "./roles"

export type ServerAuthUser = {
  id: string
  email: string
  fullName: string
  role: UserRole
  gymId: string
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/**
 * Retrieves the currently authenticated user, their role, and gym_id
 * in a Next.js Server Route Handler or Server Component.
 */
export async function getAuthenticatedServerUser(): Promise<ServerAuthUser | null> {
  const cookieStore = await cookies()

  const supabaseSSR = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Can occur in Server Components
          }
        },
      },
    },
  )

  const {
    data: { user },
    error: userError,
  } = await supabaseSSR.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, role, gym_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || !isValidRole(profile.role)) {
    return null
  }

  return {
    id: user.id,
    email: profile.email || user.email || "",
    fullName: profile.full_name || "",
    role: profile.role,
    gymId: profile.gym_id || "",
  }
}
