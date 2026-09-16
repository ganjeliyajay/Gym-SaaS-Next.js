import type { SupabaseClient } from "@supabase/supabase-js"

export interface RecurrenceConfig {
  repeatRule: "daily" | "weekly" | "biweekly" | "monthly"
  repeatDays?: string[]
  endDate?: string | null
  occurrencesCount?: number | null
  horizonDays?: number
}

export interface CalculatedOccurrence {
  occurrenceNumber: number
  startAt: Date
  durationMinutes: number
}

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/**
 * Safely generate a UUID in browser/server environments.
 */
function createSeriesId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  throw new Error(
    "Crypto UUID generation is not available in this environment.",
  )
}

/**
 * Calculate recurring class occurrences.
 *
 * The first occurrence is always the original class start time.
 */
export function calculateRecurringOccurrences(params: {
  initialStartAt: Date
  durationMinutes: number
  config: RecurrenceConfig
}): CalculatedOccurrence[] {
  const {
    initialStartAt,
    durationMinutes,
    config,
  } = params

  if (Number.isNaN(initialStartAt.getTime())) {
    throw new Error("Invalid initial class start time.")
  }

  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1
  ) {
    throw new Error(
      "Duration must be greater than zero.",
    )
  }

  const occurrences: CalculatedOccurrence[] = []

  const maxHorizonDays =
    Math.min(
      Math.max(config.horizonDays ?? 365, 1),
      365,
    )

  const horizonLimit = new Date(
    initialStartAt.getTime() +
      maxHorizonDays *
        24 *
        60 *
        60 *
        1000,
  )

  let explicitEnd: Date | null = null

  if (config.endDate) {
    explicitEnd = new Date(
      `${config.endDate}T23:59:59.999`,
    )

    if (Number.isNaN(explicitEnd.getTime())) {
      throw new Error(
        "Invalid recurring end date.",
      )
    }
  }

  const effectiveEnd =
    explicitEnd &&
    explicitEnd < horizonLimit
      ? explicitEnd
      : horizonLimit

  const maxCount =
    config.occurrencesCount != null &&
    Number.isInteger(config.occurrencesCount) &&
    config.occurrencesCount > 0
      ? Math.min(config.occurrencesCount, 365)
      : 365

  const rule = config.repeatRule

  const repeatDays =
    config.repeatDays &&
    config.repeatDays.length > 0
      ? config.repeatDays
      : ["Mon"]

  const dayIndexes = new Set(
    repeatDays
      .map(
        (day) =>
          DAY_NAME_TO_INDEX[day] ?? -1,
      )
      .filter(
        (day) => day >= 0 && day <= 6,
      ),
  )

  /*
   * First occurrence is always included.
   */
  occurrences.push({
    occurrenceNumber: 1,
    startAt: new Date(initialStartAt),
    durationMinutes,
  })

  if (maxCount === 1) {
    return occurrences
  }

  /*
   * Monthly recurrence:
   * Preserve the original day where possible.
   *
   * Example:
   * Jan 31 → Feb 28 → Mar 31
   */
  if (rule === "monthly") {
    let occurrenceNumber = 2
    let cursor = new Date(initialStartAt)

    while (
      occurrenceNumber <= maxCount
    ) {
      const originalDay =
        initialStartAt.getDate()

      const targetYear =
        cursor.getFullYear()

      const targetMonth =
        cursor.getMonth() + 1

      const lastDayOfTargetMonth =
        new Date(
          targetYear,
          targetMonth + 1,
          0,
        ).getDate()

      const targetDay = Math.min(
        originalDay,
        lastDayOfTargetMonth,
      )

      const next = new Date(
        targetYear,
        targetMonth,
        targetDay,
        initialStartAt.getHours(),
        initialStartAt.getMinutes(),
        initialStartAt.getSeconds(),
        initialStartAt.getMilliseconds(),
      )

      if (next > effectiveEnd) {
        break
      }

      occurrences.push({
        occurrenceNumber,
        startAt: next,
        durationMinutes,
      })

      occurrenceNumber += 1
      cursor = next
    }

    return occurrences
  }

  /*
   * Daily recurrence.
   */
  if (rule === "daily") {
    let occurrenceNumber = 2
    let cursor = new Date(initialStartAt)

    while (
      occurrenceNumber <= maxCount
    ) {
      const next = new Date(cursor)
      next.setDate(next.getDate() + 1)

      if (next > effectiveEnd) {
        break
      }

      occurrences.push({
        occurrenceNumber,
        startAt: next,
        durationMinutes,
      })

      occurrenceNumber += 1
      cursor = next
    }

    return occurrences
  }

  /*
   * Weekly / biweekly recurrence.
   */
  let occurrenceNumber = 2
  let cursor = new Date(initialStartAt)

  while (
    occurrenceNumber <= maxCount
  ) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)

    if (cursor > effectiveEnd) {
      break
    }

    const dayOfWeek = cursor.getDay()

    if (!dayIndexes.has(dayOfWeek)) {
      continue
    }

    const daysSinceStart =
      Math.floor(
        (cursor.getTime() -
          initialStartAt.getTime()) /
          (24 * 60 * 60 * 1000),
      )

    const weeksSinceStart = Math.floor(
      daysSinceStart / 7,
    )

    if (
      rule === "biweekly" &&
      weeksSinceStart % 2 !== 0
    ) {
      continue
    }

    /*
     * Do not accidentally generate the same
     * weekday during the wrong recurrence cycle.
     */
    if (
      rule === "weekly" &&
      weeksSinceStart < 0
    ) {
      continue
    }

    occurrences.push({
      occurrenceNumber,
      startAt: new Date(cursor),
      durationMinutes,
    })

    occurrenceNumber += 1
  }

  return occurrences
}

/**
 * Create recurring class series.
 *
 * This function is intentionally client-safe.
 * It uses the Supabase client supplied by the caller,
 * rather than importing supabaseAdmin/server.ts.
 */
export async function createRecurringClassSeries(
  supabase: SupabaseClient,
  basePayload: Record<string, unknown>,
  recurrenceConfig: RecurrenceConfig,
): Promise<{
  seriesId: string
  parentId: string
  createdCount: number
}> {
  const initialStart = new Date(
    String(basePayload.start_at),
  )

  const durationMinutes = Number(
    basePayload.duration_minutes ?? 60,
  )

  const calculated =
    calculateRecurringOccurrences({
      initialStartAt: initialStart,
      durationMinutes,
      config: recurrenceConfig,
    })

  if (!calculated.length) {
    throw new Error(
      "No recurring class occurrences could be generated.",
    )
  }

  const seriesId = createSeriesId()

  /*
   * First class = parent.
   */
  const parentPayload = {
    ...basePayload,
    recurrence_series_id: seriesId,
    parent_class_id: null,
    occurrence_number: 1,
    recurring: true,
    start_at:
      calculated[0].startAt.toISOString(),
  }

  const {
    data: parentClass,
    error: parentError,
  } = await supabase
    .from("classes")
    .insert(parentPayload)
    .select("id")
    .single()

  if (parentError || !parentClass) {
    throw new Error(
      parentError?.message ??
        "Failed to create recurring class.",
    )
  }

  /*
   * Create remaining occurrences.
   */
  if (calculated.length > 1) {
    const childRows =
      calculated.slice(1).map((occurrence) => ({
        ...basePayload,
        recurrence_series_id: seriesId,
        parent_class_id: parentClass.id,
        occurrence_number:
          occurrence.occurrenceNumber,
        recurring: true,
        start_at:
          occurrence.startAt.toISOString(),
      }))

    /*
     * Insert in small batches.
     */
    try {
      for (
        let index = 0;
        index < childRows.length;
        index += 50
      ) {
        const batch = childRows.slice(
          index,
          index + 50,
        )

        const {
          error: batchError,
        } = await supabase
          .from("classes")
          .insert(batch)

        if (batchError) {
          throw batchError
        }
      }
    } catch (error) {
      /*
       * Roll back the parent if any child
       * insertion fails.
       */
      await supabase
        .from("classes")
        .delete()
        .eq("id", parentClass.id)

      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create recurring class series.",
      )
    }
  }

  return {
    seriesId,
    parentId: parentClass.id,
    createdCount: calculated.length,
  }
}

/**
 * Update recurring class based on:
 *
 * this    → only selected occurrence
 * future  → selected + future occurrences
 * all     → entire series
 */
export async function updateRecurringClassScoped(
  supabase: SupabaseClient,
  params: {
    gymId: string
    classId: string
    scope: "this" | "future" | "all"
    payload: Record<string, unknown>
  },
): Promise<{
  success: boolean
  updatedCount: number
}> {
  const {
    gymId,
    classId,
    scope,
    payload,
  } = params

  /*
   * Load target class.
   */
  const {
    data: targetClass,
    error: fetchError,
  } = await supabase
    .from("classes")
    .select(
      "id, gym_id, recurrence_series_id, start_at",
    )
    .eq("id", classId)
    .eq("gym_id", gymId)
    .single()

  if (fetchError || !targetClass) {
    throw new Error(
      "Target class not found.",
    )
  }

  /*
   * "this" means only selected occurrence.
   *
   * IMPORTANT:
   * Do not detach recurrence metadata here.
   * The occurrence can remain part of the series
   * while having its own changed values.
   */
  if (
    scope === "this" ||
    !targetClass.recurrence_series_id
  ) {
    const {
      error: updateError,
    } = await supabase
      .from("classes")
      .update({
        ...payload,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", classId)
      .eq("gym_id", gymId)

    if (updateError) {
      throw updateError
    }

    return {
      success: true,
      updatedCount: 1,
    }
  }

  /*
   * Build series query.
   */
  let query = supabase
    .from("classes")
    .update({
      ...payload,
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "gym_id",
      gymId,
    )
    .eq(
      "recurrence_series_id",
      targetClass.recurrence_series_id,
    )

  /*
   * Future = selected occurrence + future.
   */
  if (scope === "future") {
    query = query.gte(
      "start_at",
      targetClass.start_at,
    )
  }

  const {
    data: updatedRows,
    error: updateError,
  } = await query.select("id")

  if (updateError) {
    throw updateError
  }

  return {
    success: true,
    updatedCount:
      updatedRows?.length ?? 0,
  }
}

/**
 * Delete recurring class based on scope.
 */
export async function deleteRecurringClassScoped(
  supabase: SupabaseClient,
  params: {
    gymId: string
    classId: string
    scope: "this" | "future" | "all"
  },
): Promise<{
  success: boolean
  deletedCount: number
}> {
  const {
    gymId,
    classId,
    scope,
  } = params

  const {
    data: targetClass,
    error: fetchError,
  } = await supabase
    .from("classes")
    .select(
      "id, gym_id, recurrence_series_id, start_at",
    )
    .eq("id", classId)
    .eq("gym_id", gymId)
    .single()

  if (fetchError || !targetClass) {
    throw new Error(
      "Target class not found.",
    )
  }

  /*
   * Non-recurring / this occurrence.
   */
  if (
    scope === "this" ||
    !targetClass.recurrence_series_id
  ) {
    const {
      error: deleteError,
    } = await supabase
      .from("classes")
      .delete()
      .eq("id", classId)
      .eq("gym_id", gymId)

    if (deleteError) {
      throw deleteError
    }

    return {
      success: true,
      deletedCount: 1,
    }
  }

  /*
   * Future or all.
   */
  let query = supabase
    .from("classes")
    .delete()
    .eq(
      "gym_id",
      gymId,
    )
    .eq(
      "recurrence_series_id",
      targetClass.recurrence_series_id,
    )

  if (scope === "future") {
    query = query.gte(
      "start_at",
      targetClass.start_at,
    )
  }

  const {
    data: deletedRows,
    error: deleteError,
  } = await query.select("id")

  if (deleteError) {
    throw deleteError
  }

  return {
    success: true,
    deletedCount:
      deletedRows?.length ?? 0,
  }
}