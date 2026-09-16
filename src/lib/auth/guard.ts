import { supabase } from "@/lib/supabase"
import { isValidRole, type UserRole } from "./roles"

export type CurrentUser = {
  id: string
  email: string | null
  fullName: string | null
  role: UserRole
  gymId: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, gym_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    console.error("Unable to load user profile:", profileError)
    return null
  }

  if (!isValidRole(profile.role)) {
    console.error("Invalid profile role:", profile.role)
    return null
  }

  if (!profile.gym_id) {
    console.error("User profile does not have a gym_id")
    return null
  }

  return {
    id: user.id,
    email: user.email ?? profile.email ?? null,
    fullName: profile.full_name ?? null,
    role: profile.role,
    gymId: profile.gym_id,
  }
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const currentUser = await getCurrentUser()

  return currentUser?.role ?? null
}
