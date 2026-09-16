import type { SupabaseClient } from "@supabase/supabase-js"

type EntitlementResult = {
  allowed: boolean
  reason?: string
  membershipId?: string
  remainingClasses?: number | null
}

type MembershipRow = {
  id: string
  gym_id: string
  member_id: string
  product_id: string | null
  status: string
  start_date: string | null
  end_date: string | null
  remaining_visits: number | null
  classes_used_this_period: number | null
  period_start_date: string | null
  period_end_date: string | null
}

type ClassRow = {
  id: string
  gym_id: string
  start_at: string
  status: string
}

type MemberRow = {
  id: string
  gym_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  status: string
}

export type CheckInEntitlementResult = {
  allowed: boolean
  reason?: string
  membershipId?: string
  remainingVisits?: number | null

  member?: {
    id: string
    name: string
    email: string | null
  }

  membership?: {
    id: string
    productId: string | null
    remainingVisits: number | null
    endDate: string | null
  }

  product?: string
}

type ExecuteCheckInProcessParams = {
  gymId: string
  memberId: string
  method?: "manual" | "qr" | "gym_door"
  doorId?: string
  overrideSameDay?: boolean
}

export type ExecuteCheckInProcessResult = {
  success: boolean
  isReEntry?: boolean
  reason?: string
  message?: string
  checkInId?: string
  checkedInAt?: string

  member?: {
    id: string
    name: string
    email: string | null
  }

  membership?: {
    id: string
    productId: string | null
    remainingVisits: number | null
    endDate: string | null
  }

  product?: string
}

async function getActiveMembership(
  supabase: SupabaseClient,
  memberIds: string[],
  gymId: string,
): Promise<{
  membership: MembershipRow | null
  error: string | null
}> {
  const uniqueMemberIds = Array.from(
    new Set(memberIds.filter((id) => Boolean(id))),
  )

  if (uniqueMemberIds.length === 0) {
    return {
      membership: null,
      error: "Member account not found.",
    }
  }

  const { data: memberships, error } = await supabase
    .from("member_memberships")
    .select(
      `
        id,
        gym_id,
        member_id,
        product_id,
        status,
        start_date,
        end_date,
        remaining_visits,
        classes_used_this_period,
        period_start_date,
        period_end_date,
        created_at
      `,
    )
    .eq("gym_id", gymId)
    .in("member_id", uniqueMemberIds)
    .eq("status", "active")
    .order("end_date", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    console.error("Membership lookup failed:", error)

    return {
      membership: null,
      error: "Unable to verify your membership.",
    }
  }

  const now = Date.now()

  for (const row of (memberships ?? []) as MembershipRow[]) {
    if (row.start_date && now < new Date(row.start_date).getTime()) {
      continue
    }

    if (row.end_date && now > new Date(row.end_date).getTime()) {
      continue
    }

    if (
      row.period_start_date &&
      now < new Date(row.period_start_date).getTime()
    ) {
      continue
    }

    if (row.period_end_date && now > new Date(row.period_end_date).getTime()) {
      continue
    }

    return {
      membership: row,
      error: null,
    }
  }

  return {
    membership: null,
    error: "Your membership is not currently active.",
  }
}

export async function validateClassBookingEntitlement(
  supabase: SupabaseClient,
  memberId: string,
  classId: string,
  gymId: string,
  legacyMemberIds: string[] = [],
): Promise<EntitlementResult> {
  try {
    // ----------------------------------------------------
    // 1. VERIFY MEMBER
    // ----------------------------------------------------
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select(
        `
        id,
        gym_id,
        status,
        email
      `,
      )
      .eq("id", memberId)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (memberError) {
      console.error("Class entitlement - member lookup failed:", memberError)

      return {
        allowed: false,
        reason: "Unable to verify your member account.",
      }
    }

    if (!member) {
      return {
        allowed: false,
        reason: "Member account not found.",
      }
    }

    if (member.status !== "active") {
      return {
        allowed: false,
        reason: "Your member account is not active.",
      }
    }

    // ----------------------------------------------------
    // 2. VERIFY CLASS
    // ----------------------------------------------------
    const { data: classRow, error: classError } = await supabase
      .from("classes")
      .select(
        `
        id,
        gym_id,
        start_at,
        status
      `,
      )
      .eq("id", classId)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (classError) {
      console.error("Class entitlement - class lookup failed:", classError)

      return {
        allowed: false,
        reason: "Unable to verify the class.",
      }
    }

    if (!classRow) {
      return {
        allowed: false,
        reason: "Class not found.",
      }
    }

    const typedClass = classRow as ClassRow

    if (typedClass.status !== "scheduled") {
      return {
        allowed: false,
        reason: "This class is no longer available.",
      }
    }

    if (
      !typedClass.start_at ||
      new Date(typedClass.start_at).getTime() <= Date.now()
    ) {
      return {
        allowed: false,
        reason: "Past classes cannot be booked.",
      }
    }

    // ----------------------------------------------------
    // 3. MEMBERSHIP IDS
    // ----------------------------------------------------
    const membershipIds = Array.from(
      new Set([
        memberId,
        ...legacyMemberIds.filter((id) => id && id !== memberId),
      ]),
    )

    // ----------------------------------------------------
    // 4. FIND ACTIVE MEMBERSHIP
    // ----------------------------------------------------
    const { membership, error: membershipLookupError } =
      await getActiveMembership(supabase, membershipIds, gymId)

    if (membershipLookupError) {
      return {
        allowed: false,
        reason: membershipLookupError,
      }
    }

    if (!membership) {
      return {
        allowed: false,
        reason:
          "No active membership found. Please purchase or activate a membership before booking a class.",
      }
    }

    // ----------------------------------------------------
    // 5. CLASS BOOKING PERIOD / VISIT CHECK
    // ----------------------------------------------------
    if (membership.remaining_visits !== null) {
      if (membership.remaining_visits <= 0) {
        return {
          allowed: false,
          reason: "You have no remaining visits on this membership.",
        }
      }

      return {
        allowed: true,
        membershipId: membership.id,
        remainingClasses: membership.remaining_visits,
      }
    }

    return {
      allowed: true,
      membershipId: membership.id,
      remainingClasses: null,
    }
  } catch (error) {
    console.error("Class entitlement unexpected error:", error)

    return {
      allowed: false,
      reason: "Unable to verify your membership.",
    }
  }
}

export async function validateCheckInEntitlement(
  supabase: SupabaseClient,
  memberId: string,
  gymId: string,
  legacyMemberIds: string[] = [],
): Promise<CheckInEntitlementResult> {
  try {
    // ----------------------------------------------------
    // 1. VERIFY MEMBER
    // ----------------------------------------------------
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select(
        `
        id,
        gym_id,
        first_name,
        last_name,
        email,
        status
      `,
      )
      .eq("id", memberId)
      .eq("gym_id", gymId)
      .maybeSingle()

    if (memberError) {
      console.error("Check-in entitlement - member lookup failed:", memberError)

      return {
        allowed: false,
        reason: "Unable to verify the member account.",
      }
    }

    if (!member) {
      return {
        allowed: false,
        reason: "Member record not found.",
      }
    }

    if (member.status !== "active") {
      return {
        allowed: false,
        reason: "Your member account is not active.",
      }
    }

    const membershipIds = Array.from(
      new Set([
        memberId,
        ...legacyMemberIds.filter((id) => id && id !== memberId),
      ]),
    )

    // ----------------------------------------------------
    // 2. FIND ACTIVE MEMBERSHIP
    // ----------------------------------------------------
    const { membership, error: membershipLookupError } =
      await getActiveMembership(supabase, membershipIds, gymId)

    if (membershipLookupError) {
      return {
        allowed: false,
        reason: membershipLookupError,
      }
    }

    if (!membership) {
      return {
        allowed: false,
        reason:
          "No active membership found. Please purchase or activate a membership before checking in.",
      }
    }

    // ----------------------------------------------------
    // 3. VISIT ENTITLEMENT
    // ----------------------------------------------------
    // NULL means unlimited visits.
    if (
      membership.remaining_visits !== null &&
      membership.remaining_visits <= 0
    ) {
      return {
        allowed: false,
        membershipId: membership.id,
        remainingVisits: 0,
        reason: "You have no remaining visits on this membership.",
      }
    }

    const memberRow = member as MemberRow

    const memberName =
      `${memberRow.first_name ?? ""} ${memberRow.last_name ?? ""}`.trim() ||
      "Member"

    let productName = "Active Membership"

    if (membership.product_id) {
      const { data: productRow, error: productError } = await supabase
        .from("products")
        .select("name")
        .eq("id", membership.product_id)
        .maybeSingle()

      if (productError) {
        console.error(
          "Check-in entitlement - product lookup failed:",
          productError,
        )
      } else if (productRow?.name) {
        productName = productRow.name
      }
    }

    return {
      allowed: true,
      membershipId: membership.id,
      remainingVisits: membership.remaining_visits,

      member: {
        id: memberRow.id,
        name: memberName,
        email: memberRow.email,
      },

      membership: {
        id: membership.id,
        productId: membership.product_id,
        remainingVisits: membership.remaining_visits,
        endDate: membership.end_date,
      },

      product: productName,
    }
  } catch (error) {
    console.error("Check-in entitlement unexpected error:", error)

    return {
      allowed: false,
      reason: "Unable to verify the member's membership.",
    }
  }
}

export async function executeCheckInProcess(
  supabase: SupabaseClient,
  params: ExecuteCheckInProcessParams,
): Promise<ExecuteCheckInProcessResult> {
  const {
    gymId,
    memberId,
    method = "manual",
    doorId,
    overrideSameDay = false,
  } = params

  try {
    // ----------------------------------------------------
    // 1. VERIFY MEMBER + ACTIVE MEMBERSHIP
    // ----------------------------------------------------
    const entitlement = await validateCheckInEntitlement(
      supabase,
      memberId,
      gymId,
    )

    if (!entitlement.allowed) {
      return {
        success: false,
        reason: entitlement.reason || "Check-in entitlement validation failed.",
      }
    }

    // ----------------------------------------------------
    // 2. PREVENT SAME-DAY RE-ENTRY
    // ----------------------------------------------------
    if (!overrideSameDay) {
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(startOfDay)
      endOfDay.setDate(endOfDay.getDate() + 1)

      const { data: existingCheckIn, error: checkInLookupError } =
        await supabase
          .from("checkins")
          .select("id, checked_in_at")
          .eq("gym_id", gymId)
          .eq("member_id", memberId)
          .gte("checked_in_at", startOfDay.toISOString())
          .lt("checked_in_at", endOfDay.toISOString())
          .order("checked_in_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

      if (checkInLookupError) {
        console.error("Check-in - same-day lookup failed:", checkInLookupError)

        return {
          success: false,
          reason: "Unable to verify today's check-in status.",
        }
      }

      if (existingCheckIn) {
        return {
          success: false,
          isReEntry: false,
          reason: "This member has already checked in today.",
          checkInId: existingCheckIn.id,
          checkedInAt: existingCheckIn.checked_in_at,
          member: entitlement.member,
          membership: entitlement.membership,
          product: entitlement.product,
        }
      }
    }

    // ----------------------------------------------------
    // 3. DECREMENT VISIT
    // ----------------------------------------------------
    let remainingVisits: number | null =
      entitlement.membership?.remainingVisits ?? null

    let decrementedVisit = false
    let previousRemainingVisits: number | null = null

    if (
      entitlement.membershipId &&
      typeof entitlement.remainingVisits === "number" &&
      entitlement.remainingVisits > 0
    ) {
      const currentRemainingVisits = entitlement.remainingVisits

      const { data: updatedMembership, error: visitUpdateError } =
        await supabase
          .from("member_memberships")
          .update({
            remaining_visits: currentRemainingVisits - 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entitlement.membershipId)
          .eq("gym_id", gymId)
          .eq("member_id", memberId)
          .eq("status", "active")
          .gt("remaining_visits", 0)
          .select("remaining_visits")
          .maybeSingle()

      if (visitUpdateError) {
        console.error("Check-in - visit decrement failed:", visitUpdateError)

        return {
          success: false,
          reason: "Unable to update the remaining membership visits.",
          member: entitlement.member,
          membership: entitlement.membership,
          product: entitlement.product,
        }
      }

      if (!updatedMembership) {
        return {
          success: false,
          reason: "No remaining visits on this membership.",
          member: entitlement.member,
          membership: entitlement.membership,
          product: entitlement.product,
        }
      }

      previousRemainingVisits = currentRemainingVisits

      remainingVisits = updatedMembership.remaining_visits

      decrementedVisit = true
    }

    // ----------------------------------------------------
    // 4. CREATE CHECK-IN RECORD
    // ----------------------------------------------------
    // IMPORTANT:
    // Current checkins table supports:
    // gym_id, member_id, method, checked_in_at
    //
    // Do NOT send membership_id or door_id here.

    const { data: checkInRow, error: insertError } = await supabase
      .from("checkins")
      .insert({
        gym_id: gymId,
        member_id: memberId,
        method,
      })
      .select("id, checked_in_at")
      .single()

    if (insertError || !checkInRow) {
      console.error("Check-in insert failed:", insertError)

      // Restore visit if insert failed.
      if (
        decrementedVisit &&
        entitlement.membershipId &&
        previousRemainingVisits !== null &&
        remainingVisits === previousRemainingVisits - 1
      ) {
        const { error: restoreError } = await supabase
          .from("member_memberships")
          .update({
            remaining_visits: previousRemainingVisits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entitlement.membershipId)
          .eq("gym_id", gymId)
          .eq("member_id", memberId)
          .eq("status", "active")
          .eq("remaining_visits", remainingVisits)

        if (restoreError) {
          console.error("Check-in - visit compensation failed:", restoreError)
        }
      }

      return {
        success: false,
        reason: insertError?.message || "Unable to create the check-in record.",
        member: entitlement.member,
        membership: entitlement.membership,
        product: entitlement.product,
      }
    }

    const membership = entitlement.membership
      ? {
          ...entitlement.membership,
          remainingVisits,
        }
      : undefined

    return {
      success: true,
      isReEntry: overrideSameDay,
      message: "Member checked in successfully.",
      checkInId: checkInRow.id,
      checkedInAt: checkInRow.checked_in_at,
      member: entitlement.member,
      membership,
      product: entitlement.product,
    }
  } catch (error) {
    console.error("Check-in process unexpected error:", error)

    return {
      success: false,
      reason:
        error instanceof Error
          ? error.message
          : "Unable to complete the check-in process.",
    }
  }
}
