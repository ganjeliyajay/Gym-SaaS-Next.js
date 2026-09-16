"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock3,
  Info,
  MapPin,
  Save,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

export type ClassFormData = {
  title: string
  category: string
  room: string
  description: string
  date: string
  time: string
  duration: string
  timezone: string
  trainer: string
  capacity: string
  recurring: boolean
  repeat: string
  days: string[]
  endDate: string
  occurrences: string
}

type Trainer = {
  id: string
  full_name: string | null
}

type ClassFormProps = {
  mode: "create" | "edit"
  classId?: string
  initialData?: Partial<ClassFormData>
}

const defaultData: ClassFormData = {
  title: "",
  category: "Yoga",
  room: "Studio A",
  description: "",
  date: "",
  time: "06:00",
  duration: "60",
  timezone: "Asia/Kolkata",
  trainer: "",
  capacity: "20",
  recurring: false,
  repeat: "Every week",
  days: ["Mon"],
  endDate: "",
  occurrences: "",
}

const weekDays = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
        {icon}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="input appearance-none pr-10"
      >
        {children}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  )
}

function PreviewRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-200">
      <div className="text-gray-400">
        {icon}
      </div>

      <span>{children}</span>
    </div>
  )
}

function formatClassDate(date: string) {
  if (!date) {
    return "Select a date"
  }

  const parsed = new Date(
    `${date}T00:00:00`,
  )

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "Invalid date"
  }

  return parsed.toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  )
}

/**
 * Convert a local date/time in the selected IANA timezone
 * into an ISO UTC timestamp.
 *
 * Example:
 * Asia/Kolkata + 06:00
 * -> 00:30 UTC
 */
function toZonedDateTimeIso(
  date: string,
  time: string,
  timezone: string,
) {
  if (!date || !time) {
    throw new Error(
      "Date and start time are required.",
    )
  }

  const [year, month, day] =
    date.split("-").map(Number)

  const [hour, minute] =
    time.split(":").map(Number)

  if (
    !year ||
    !month ||
    !day ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    throw new Error(
      "Invalid date or start time.",
    )
  }

  const wallClockUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
    )

  let guess = wallClockUtc

  for (let i = 0; i < 3; i++) {
    const formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        },
      )

    const parts =
      formatter.formatToParts(
        new Date(guess),
      )

    const values: Record<
      string,
      string
    > = {}

    for (const part of parts) {
      if (
        part.type !== "literal"
      ) {
        values[part.type] =
          part.value
      }
    }

    let formattedHour =
      Number(values.hour)

    if (formattedHour === 24) {
      formattedHour = 0
    }

    const localAsUtc =
      Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        formattedHour,
        Number(values.minute),
        Number(values.second),
      )

    const offset =
      localAsUtc - guess

    guess =
      wallClockUtc - offset
  }

  return new Date(
    guess,
  ).toISOString()
}

export default function ClassForm({
  mode,
  classId,
  initialData,
}: ClassFormProps) {
  const router = useRouter()
  const toast = useToast()

  const isEdit =
    mode === "edit"

  const [form, setForm] =
    useState<ClassFormData>({
      ...defaultData,
      ...initialData,
      days:
        initialData?.days ??
        defaultData.days,
    })

  const [trainers, setTrainers] =
    useState<Trainer[]>([])

  const [bookingCount, setBookingCount] =
    useState(0)

  const [loading, setLoading] =
    useState(isEdit)

  const [saving, setSaving] =
    useState(false)

  const [deleting, setDeleting] =
    useState(false)

  const [showDelete, setShowDelete] =
    useState(false)

  /* ---------------------------------------------------------
     Load
  --------------------------------------------------------- */

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser()

        if (
          authError ||
          !user
        ) {
          throw new Error(
            "You must be logged in.",
          )
        }

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select("gym_id")
            .eq("id", user.id)
            .single()

        if (
          profileError ||
          !profile?.gym_id
        ) {
          throw new Error(
            "Gym profile could not be loaded.",
          )
        }

        const gymId =
          profile.gym_id

        /* ---------------------------------------------------
           Trainers
        --------------------------------------------------- */

        const {
          data: trainerRows,
          error: trainerError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, full_name",
            )
            .eq(
              "gym_id",
              gymId,
            )
            .in(
              "role",
              [
                "trainer",
                "manager",
              ],
            )
            .order(
              "full_name",
            )

        if (trainerError) {
          throw trainerError
        }

        if (active) {
          setTrainers(
            (trainerRows ??
              []) as Trainer[],
          )
        }

        if (
          !isEdit ||
          !classId
        ) {
          if (active) {
            setLoading(false)
          }

          return
        }

        /* ---------------------------------------------------
           Class
        --------------------------------------------------- */

        const {
          data: classRow,
          error: classError,
        } =
          await supabase
            .from("classes")
            .select(
              `
                id,
                title,
                category,
                room,
                description,
                start_at,
                duration_minutes,
                timezone,
                trainer_id,
                capacity,
                recurring,
                repeat_rule,
                repeat_days,
                recurring_end_date,
                occurrences
              `,
            )
            .eq(
              "id",
              classId,
            )
            .eq(
              "gym_id",
              gymId,
            )
            .single()

        if (classError) {
          throw classError
        }

        const start =
          new Date(
            classRow.start_at,
          )

        if (
          Number.isNaN(
            start.getTime(),
          )
        ) {
          throw new Error(
            "Class has an invalid start time.",
          )
        }

        const timezone =
          classRow.timezone ||
          "Asia/Kolkata"

        const localDate =
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                timezone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            },
          ).format(start)

        const timeParts =
          new Intl.DateTimeFormat(
            "en-GB",
            {
              timeZone:
                timezone,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            },
          ).formatToParts(
            start,
          )

        let hour =
          timeParts.find(
            (part) =>
              part.type ===
              "hour",
          )?.value ?? "00"

        if (hour === "24") {
          hour = "00"
        }

        const minute =
          timeParts.find(
            (part) =>
              part.type ===
              "minute",
          )?.value ?? "00"

        const repeatDays =
          Array.isArray(
            classRow.repeat_days,
          )
            ? classRow.repeat_days.filter(
                (
                  day,
                ): day is string =>
                  typeof day ===
                  "string",
              )
            : []

        const mapped: ClassFormData =
          {
            title:
              classRow.title ??
              "",
            category:
              classRow.category ??
              "Yoga",
            room:
              classRow.room ??
              "",
            description:
              classRow.description ??
              "",
            date:
              localDate,
            time:
              `${hour}:${minute}`,
            duration:
              String(
                classRow.duration_minutes ??
                  60,
              ),
            timezone,
            trainer:
              classRow.trainer_id ??
              "",
            capacity:
              String(
                classRow.capacity ??
                  20,
              ),
            recurring:
              Boolean(
                classRow.recurring,
              ),
            repeat:
              classRow.repeat_rule ===
              "biweekly"
                ? "Every 2 weeks"
                : classRow.repeat_rule ===
                    "monthly"
                  ? "Every month"
                  : "Every week",
            days:
              repeatDays,
            endDate:
              classRow.recurring_end_date ??
              "",
            occurrences:
              classRow.occurrences ==
              null
                ? ""
                : String(
                    classRow.occurrences,
                  ),
          }

        /* ---------------------------------------------------
           Booking count
        --------------------------------------------------- */

        const {
          count,
          error:
            bookingError,
        } =
          await supabase
            .from(
              "class_bookings",
            )
            .select(
              "id",
              {
                count:
                  "exact",
                head: true,
              },
            )
            .eq(
              "class_id",
              classId,
            )
            .eq(
              "gym_id",
              gymId,
            )
            .eq(
              "status",
              "booked",
            )

        if (bookingError) {
          throw bookingError
        }

        if (active) {
          setForm(mapped)
          setBookingCount(
            count ?? 0,
          )
        }
      } catch (error) {
        console.error(
          "Class form load error:",
          error,
        )

        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "We couldn't load the class details. Please refresh the page.",
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [
    classId,
    isEdit,
    toast,
  ])

  /* ---------------------------------------------------------
     Field helpers
  --------------------------------------------------------- */

  const updateField = <
    K extends keyof ClassFormData,
  >(
    field: K,
    value: ClassFormData[K],
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      }),
    )
  }

  const toggleDay = (
    day: string,
  ) => {
    setForm(
      (previous) => ({
        ...previous,
        days:
          previous.days.includes(
            day,
          )
            ? previous.days.filter(
                (item) =>
                  item !== day,
              )
            : [
                ...previous.days,
                day,
              ],
      }),
    )
  }

  const selectedTrainer =
    useMemo(
      () =>
        trainers.find(
          (trainer) =>
            trainer.id ===
            form.trainer,
        ),
      [
        trainers,
        form.trainer,
      ],
    )

  /* ---------------------------------------------------------
     Validation
  --------------------------------------------------------- */

  const validateForm =
    () => {
      const title =
        form.title.trim()

      if (!title) {
        return "Class name is required."
      }

      if (
        !form.date ||
        !form.time
      ) {
        return "Date and start time are required."
      }

      if (!form.trainer) {
        return "Please select a trainer."
      }

      const capacity =
        Number(
          form.capacity,
        )

      const duration =
        Number(
          form.duration,
        )

      if (
        !Number.isInteger(
          capacity,
        ) ||
        capacity < 1
      ) {
        return "Capacity must be at least 1."
      }

      if (
        !Number.isInteger(
          duration,
        ) ||
        duration < 1
      ) {
        return "Duration must be greater than 0."
      }

      if (
        isEdit &&
        capacity <
          bookingCount
      ) {
        return `Capacity cannot be lower than the current booking count (${bookingCount}).`
      }

      const start =
        new Date(
          toZonedDateTimeIso(
            form.date,
            form.time,
            form.timezone,
          ),
        )

      if (
        Number.isNaN(
          start.getTime(),
        )
      ) {
        return "Please select a valid date and time."
      }

      if (
        start.getTime() <=
        Date.now()
      ) {
        return "Class start time must be in the future."
      }

      if (form.recurring) {
        if (
          form.days.length ===
          0
        ) {
          return "Select at least one recurring day."
        }

        const occurrences =
          form.occurrences
            ? Number(
                form.occurrences,
              )
            : null

        if (
          occurrences !==
            null &&
          (!Number.isInteger(
            occurrences,
          ) ||
            occurrences <
              1 ||
            occurrences >
              365)
        ) {
          return "Occurrences must be between 1 and 365."
        }

        if (
          form.endDate &&
          form.endDate <
            form.date
        ) {
          return "Recurring end date cannot be before the start date."
        }

        if (
          !form.occurrences &&
          !form.endDate
        ) {
          return "Add an end date or occurrence count for a recurring class."
        }
      }

      return null
    }

  /* ---------------------------------------------------------
     Save
  --------------------------------------------------------- */

  const handleSave =
    async () => {
      const validationError =
        validateForm()

      if (validationError) {
        toast.error(
          validationError,
        )

        return
      }

      const capacity =
        Number(
          form.capacity,
        )

      const duration =
        Number(
          form.duration,
        )

      const toastId =
        toast.loading(
          isEdit
            ? "Saving class changes..."
            : "Creating class...",
        )

      setSaving(true)

      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser()

        if (
          authError ||
          !user
        ) {
          throw new Error(
            "You must be logged in.",
          )
        }

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "gym_id",
            )
            .eq(
              "id",
              user.id,
            )
            .single()

        if (
          profileError ||
          !profile?.gym_id
        ) {
          throw new Error(
            "Gym profile could not be loaded.",
          )
        }

        const gymId =
          profile.gym_id

        /* ---------------------------------------------------
           Trainer validation
        --------------------------------------------------- */

        const {
          data: trainer,
          error:
            trainerError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id, gym_id, role",
            )
            .eq(
              "id",
              form.trainer,
            )
            .eq(
              "gym_id",
              gymId,
            )
            .maybeSingle()

        if (
          trainerError
        ) {
          throw trainerError
        }

        if (!trainer) {
          throw new Error(
            "Selected trainer was not found in this gym.",
          )
        }

        if (
          ![
            "trainer",
            "manager",
          ].includes(
            trainer.role,
          )
        ) {
          throw new Error(
            "Selected profile cannot be assigned as a trainer.",
          )
        }

        /* ---------------------------------------------------
           Start timestamp
        --------------------------------------------------- */

        const startAt =
          toZonedDateTimeIso(
            form.date,
            form.time,
            form.timezone,
          )

        /* ---------------------------------------------------
           Repeat rule
        --------------------------------------------------- */

        const repeatRule =
          form.repeat ===
          "Every 2 weeks"
            ? "biweekly"
            : form.repeat ===
                "Every month"
              ? "monthly"
              : "weekly"

        const occurrenceCount =
          form.recurring &&
          form.occurrences
            ? Number(
                form.occurrences,
              )
            : null

        const payload = {
          gym_id:
            gymId,

          title:
            form.title.trim(),

          category:
            form.category ||
            null,

          room:
            form.room.trim() ||
            null,

          description:
            form.description.trim() ||
            null,

          start_at:
            startAt,

          duration_minutes:
            duration,

          timezone:
            form.timezone,

          trainer_id:
            form.trainer,

          capacity,

          recurring:
            form.recurring,

          repeat_rule:
            form.recurring
              ? repeatRule
              : null,

          repeat_days:
            form.recurring
              ? form.days
              : [],

          recurring_end_date:
            form.recurring &&
            form.endDate
              ? form.endDate
              : null,

          occurrences:
            occurrenceCount,

          status:
            "scheduled",
        }

        /* ---------------------------------------------------
           EDIT
        --------------------------------------------------- */

        if (
          isEdit &&
          classId
        ) {
          const {
            updateRecurringClassScoped,
          } =
            await import(
              "@/lib/calendar/recurring"
            )

          /*
           * Existing Classes UI does not currently expose
           * "This / Future / All" selection.
           *
           * "future" is kept as the default behavior for
           * recurring series, matching the existing workflow.
           *
           * Non-series classes are automatically handled
           * as a single class by the helper.
           */
          await updateRecurringClassScoped(
            supabase,
            {
              gymId,
              classId,
              scope: "future",
              payload,
            },
          )
        } else {
          /* -------------------------------------------------
             CREATE RECURRING
          ------------------------------------------------- */

          if (
            payload.recurring
          ) {
            const {
              createRecurringClassSeries,
            } =
              await import(
                "@/lib/calendar/recurring"
              )

            await createRecurringClassSeries(
              supabase,
              payload,
              {
                repeatRule:
                  repeatRule as
                    | "weekly"
                    | "biweekly"
                    | "monthly",

                repeatDays:
                  form.days,

                endDate:
                  form.endDate ||
                  null,

                occurrencesCount:
                  occurrenceCount,

                horizonDays:
                  365,
              },
            )
          } else {
            /* -----------------------------------------------
               CREATE SINGLE CLASS
            ------------------------------------------------ */

            const {
              data: createdClass,
              error:
                createError,
            } =
              await supabase
                .from("classes")
                .insert(
                  payload,
                )
                .select(
                  "id",
                )
                .single()

            if (
              createError
            ) {
              throw createError
            }

            if (
              !createdClass?.id
            ) {
              throw new Error(
                "Class was created but its ID could not be returned.",
              )
            }
          }
        }

        toast.dismiss(
          toastId,
        )

        toast.success(
          isEdit
            ? "Class updated successfully."
            : "Class created successfully.",
        )

        /*
         * There is NO:
         *
         * /calendar/classes/[id]/page.tsx
         *
         * in this project.
         *
         * Therefore redirect to an existing route.
         */
        setTimeout(() => {
          router.push(
            "/calendar",
          )

          router.refresh()
        }, 400)
      } catch (error) {
        console.error(
          "Class save error:",
          error,
        )

        toast.dismiss(
          toastId,
        )

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save class.",
        )

        setSaving(false)
      }
    }

  /* ---------------------------------------------------------
     Delete
  --------------------------------------------------------- */

  const handleDelete =
    async () => {
      if (!classId) {
        return
      }

      const toastId =
        toast.loading(
          "Deleting class...",
        )

      setDeleting(true)

      try {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser()

        if (
          authError ||
          !user
        ) {
          throw new Error(
            "You must be logged in.",
          )
        }

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "gym_id",
            )
            .eq(
              "id",
              user.id,
            )
            .single()

        if (
          profileError ||
          !profile?.gym_id
        ) {
          throw new Error(
            "Gym profile could not be loaded.",
          )
        }

        const gymId =
          profile.gym_id

        /* ---------------------------------------------------
           Verify class
        --------------------------------------------------- */

        const {
          data: classRow,
          error:
            classLookupError,
        } =
          await supabase
            .from("classes")
            .select(
              "id, recurrence_series_id",
            )
            .eq(
              "id",
              classId,
            )
            .eq(
              "gym_id",
              gymId,
            )
            .maybeSingle()

        if (
          classLookupError
        ) {
          throw classLookupError
        }

        if (!classRow) {
          throw new Error(
            "Class not found.",
          )
        }

        /*
         * Only delete the selected occurrence.
         *
         * We intentionally do not delete an entire recurring
         * series from this button because the UI does not ask
         * whether the user wants:
         *
         * - This class
         * - This and future classes
         * - Entire series
         *
         * This prevents accidental deletion of the whole series.
         */

        const {
          error:
            deleteError,
        } =
          await supabase
            .from("classes")
            .delete()
            .eq(
              "id",
              classId,
            )
            .eq(
              "gym_id",
              gymId,
            )

        if (
          deleteError
        ) {
          throw deleteError
        }

        toast.dismiss(
          toastId,
        )

        toast.success(
          "Class deleted successfully.",
        )

        setShowDelete(
          false,
        )

        router.push(
          "/calendar",
        )

        router.refresh()
      } catch (error) {
        console.error(
          "Class delete error:",
          error,
        )

        toast.dismiss(
          toastId,
        )

        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to delete class.",
        )

        setDeleting(false)
      }
    }

  const formattedDate =
    formatClassDate(
      form.date,
    )

  /* ---------------------------------------------------------
     Loading
  --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
          Loading class...
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------
     UI
  --------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2
                    size={20}
                  />
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  Delete this class?
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  This will remove this class occurrence and may also remove
                  its related bookings depending on your database constraints.
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    false,
                  )
                }
                disabled={
                  deleting
                }
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    false,
                  )
                }
                disabled={
                  deleting
                }
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDelete
                }
                disabled={
                  deleting
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2
                  size={15}
                />

                {deleting
                  ? "Deleting..."
                  : "Delete Class"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href={
              isEdit && classId
                ? "/calendar"
                : "/calendar"
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft
              size={16}
            />

            Back to Calendar
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {isEdit
                  ? "Edit Class"
                  : "Create Class"}
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {isEdit
                  ? "Update class information, schedule and capacity."
                  : "Create a new class and schedule it for your members."}
              </p>
            </div>

            {isEdit && (
              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    true,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2
                  size={16}
                />
                Delete Class
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={
                  <CalendarDays
                    size={20}
                  />
                }
                title="Basic Information"
                description="Add the main details about this class."
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Class Name"
                  required
                  className="sm:col-span-2"
                >
                  <input
                    className="input"
                    value={
                      form.title
                    }
                    onChange={(e) =>
                      updateField(
                        "title",
                        e.target.value,
                      )
                    }
                    placeholder="e.g. Morning Yoga"
                    maxLength={
                      120
                    }
                  />
                </Field>

                <Field
                  label="Category"
                  required
                >
                  <Select
                    value={
                      form.category
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "category",
                        value,
                      )
                    }
                  >
                    <option>
                      Yoga
                    </option>
                    <option>
                      Strength
                    </option>
                    <option>
                      Cardio
                    </option>
                    <option>
                      CrossFit
                    </option>
                    <option>
                      Pilates
                    </option>
                    <option>
                      HIIT
                    </option>
                    <option>
                      Mobility
                    </option>
                    <option>
                      Other
                    </option>
                  </Select>
                </Field>

                <Field label="Room / Location">
                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      className="input pl-11"
                      value={
                        form.room
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "room",
                          e.target.value,
                        )
                      }
                      placeholder="Studio A"
                      maxLength={
                        120
                      }
                    />
                  </div>
                </Field>

                <Field
                  label="Description"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={
                      form.description
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "description",
                        e.target.value,
                      )
                    }
                    placeholder="Describe what members can expect from this class..."
                    maxLength={
                      2000
                    }
                    className="min-h-[110px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-900/5"
                  />
                </Field>
              </div>
            </div>

            {/* Schedule */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={
                  <Clock3
                    size={20}
                  />
                }
                title="Schedule"
                description="Choose when this class will take place."
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Date"
                  required
                >
                  <input
                    type="date"
                    className="input"
                    value={
                      form.date
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "date",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field
                  label="Start Time"
                  required
                >
                  <input
                    type="time"
                    className="input"
                    value={
                      form.time
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "time",
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field
                  label="Duration"
                  required
                >
                  <Select
                    value={
                      form.duration
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "duration",
                        value,
                      )
                    }
                  >
                    <option value="30">
                      30 minutes
                    </option>
                    <option value="45">
                      45 minutes
                    </option>
                    <option value="60">
                      60 minutes
                    </option>
                    <option value="75">
                      75 minutes
                    </option>
                    <option value="90">
                      90 minutes
                    </option>
                    <option value="120">
                      120 minutes
                    </option>
                  </Select>
                </Field>

                <Field label="Time Zone">
                  <Select
                    value={
                      form.timezone
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "timezone",
                        value,
                      )
                    }
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST)
                    </option>

                    <option value="America/New_York">
                      Eastern Time (ET)
                    </option>

                    <option value="America/Los_Angeles">
                      Pacific Time (PT)
                    </option>

                    <option value="Europe/London">
                      London Time (GMT)
                    </option>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Trainer & Capacity */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={
                  <Users
                    size={20}
                  />
                }
                title="Trainer & Capacity"
                description="Assign a trainer and define booking limits."
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field
                  label="Trainer"
                  required
                >
                  <Select
                    value={
                      form.trainer
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "trainer",
                        value,
                      )
                    }
                  >
                    <option value="">
                      Select trainer
                    </option>

                    {trainers.map(
                      (
                        trainer,
                      ) => (
                        <option
                          key={
                            trainer.id
                          }
                          value={
                            trainer.id
                          }
                        >
                          {trainer.full_name ||
                            "Unnamed trainer"}
                        </option>
                      ),
                    )}
                  </Select>

                  {trainers.length ===
                    0 && (
                    <p className="mt-2 text-xs text-amber-600">
                      No trainer or manager profiles are available.
                    </p>
                  )}
                </Field>

                <Field
                  label="Maximum Capacity"
                  required
                >
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    className="input"
                    value={
                      form.capacity
                    }
                    onChange={(
                      e,
                    ) =>
                      updateField(
                        "capacity",
                        e.target.value,
                      )
                    }
                  />
                </Field>
              </div>

              <div className="mt-5 flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-gray-500"
                />

                <p className="text-sm leading-6 text-gray-600">
                  Members will not be able to book this class once the maximum capacity has been reached.
                </p>
              </div>

              {isEdit && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    Current bookings:{" "}
                    {
                      bookingCount
                    }{" "}
                    members
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Capacity cannot be reduced below the current booking count.
                  </p>
                </div>
              )}
            </div>

            {/* Recurring */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader
                  icon={
                    <CalendarDays
                      size={20}
                    />
                  }
                  title="Recurring Class"
                  description="Repeat this class automatically."
                />

                <button
                  type="button"
                  aria-label="Toggle recurring class"
                  aria-pressed={
                    form.recurring
                  }
                  onClick={() =>
                    updateField(
                      "recurring",
                      !form.recurring,
                    )
                  }
                  className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition ${
                    form.recurring
                      ? "bg-gray-900"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
                      form.recurring
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              {form.recurring && (
                <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2">
                  <Field label="Repeat">
                    <Select
                      value={
                        form.repeat
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "repeat",
                          value,
                        )
                      }
                    >
                      <option>
                        Every week
                      </option>

                      <option>
                        Every 2 weeks
                      </option>

                      <option>
                        Every month
                      </option>
                    </Select>
                  </Field>

                  <Field label="Occurrences">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="input"
                      value={
                        form.occurrences
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "occurrences",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. 12"
                    />
                  </Field>

                  <Field
                    label="Repeat On"
                    className="sm:col-span-2"
                  >
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map(
                        (
                          day,
                        ) => {
                          const active =
                            form.days.includes(
                              day,
                            )

                          return (
                            <button
                              type="button"
                              key={
                                day
                              }
                              onClick={() =>
                                toggleDay(
                                  day,
                                )
                              }
                              className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium transition ${
                                active
                                  ? "border-gray-900 bg-gray-900 text-white"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              {
                                day
                              }
                            </button>
                          )
                        },
                      )}
                    </div>

                    {form.days.length ===
                      0 && (
                      <p className="mt-2 text-xs text-red-500">
                        Select at least one day.
                      </p>
                    )}
                  </Field>

                  <Field label="End Date">
                    <input
                      type="date"
                      className="input"
                      value={
                        form.endDate
                      }
                      min={
                        form.date ||
                        undefined
                      }
                      onChange={(
                        e,
                      ) =>
                        updateField(
                          "endDate",
                          e.target.value,
                        )
                      }
                    />
                  </Field>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
                    <p className="text-xs leading-5 text-gray-500">
                      Add either an occurrence count or an end date. The recurring series is capped by the recurring service to prevent accidental unlimited class creation.
                    </p>
                  </div>
                </div>
              )}

              {!form.recurring && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  This class will occur only once.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/calendar"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  deleting
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save
                  size={16}
                />

                {saving
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Class"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Preview
                </p>
              </div>

              <div className="p-5">
                <div className="rounded-2xl bg-gray-900 p-5 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80">
                        {form.category ||
                          "Category"}
                      </span>

                      <h3 className="mt-4 text-xl font-bold">
                        {form.title ||
                          "Class Name"}
                      </h3>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                      <CalendarDays
                        size={18}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <PreviewRow
                      icon={
                        <CalendarDays
                          size={16}
                        />
                      }
                    >
                      {
                        formattedDate
                      }
                    </PreviewRow>

                    <PreviewRow
                      icon={
                        <Clock3
                          size={16}
                        />
                      }
                    >
                      {form.time ||
                        "--:--"}{" "}
                      ·{" "}
                      {form.duration ||
                        "0"}{" "}
                      min
                    </PreviewRow>

                    <PreviewRow
                      icon={
                        <MapPin
                          size={16}
                        />
                      }
                    >
                      {form.room ||
                        "No location"}
                    </PreviewRow>

                    <PreviewRow
                      icon={
                        <UserRound
                          size={16}
                        />
                      }
                    >
                      {selectedTrainer
                        ?.full_name ||
                        "No trainer"}
                    </PreviewRow>

                    <PreviewRow
                      icon={
                        <Users
                          size={16}
                        />
                      }
                    >
                      Up to{" "}
                      {form.capacity ||
                        "0"}{" "}
                      members
                    </PreviewRow>
                  </div>
                </div>

                {form.description && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Description
                    </p>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {
                        form.description
                      }
                    </p>
                  </div>
                )}

                {form.recurring && (
                  <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      Recurring
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {
                        form.repeat
                      }{" "}
                      ·{" "}
                      {form.days
                        .length >
                      0
                        ? form.days.join(
                            ", ",
                          )
                        : "No days selected"}
                    </p>

                    {form.occurrences && (
                      <p className="mt-1 text-xs text-gray-500">
                        {
                          form.occurrences
                        }{" "}
                        occurrences
                      </p>
                    )}

                    {form.endDate && (
                      <p className="mt-1 text-xs text-gray-500">
                        Until{" "}
                        {
                          form.endDate
                        }
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}