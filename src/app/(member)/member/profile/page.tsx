
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Bell,
  Lock,
  Save,
  Check,
  Camera,
} from "lucide-react"

export default function MemberProfilePage() {
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<
    "personal" | "notifications" | "security"
  >("personal")

  const [emailReminders, setEmailReminders] = useState(true)
  const [smsReminders, setSmsReminders] = useState(true)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [profile, setProfile] = useState({
    id: "",
    gymId: "",
    memberId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    avatarUrl: "",
    status: "active",
  })

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      setLoading(true)

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) {
          throw authError
        }

        if (!user) {
          throw new Error(
            "You must be logged in to view your profile.",
          )
        }

        const {
          data: appProfile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, gym_id, full_name, email, phone, avatar_url, status",
          )
          .eq("id", user.id)
          .maybeSingle()

        if (profileError) {
          throw profileError
        }

        const memberColumns = `
          id,
          gym_id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          address,
          city,
          state,
          postal_code,
          emergency_contact_name,
          emergency_contact_phone,
          profile_image_url,
          status
        `

        const {
          data: memberById,
          error: memberByIdError,
        } = await supabase
          .from("members")
          .select(memberColumns)
          .eq("id", user.id)
          .eq("gym_id", appProfile?.gym_id ?? "")
          .maybeSingle()

        if (memberByIdError) {
          throw memberByIdError
        }

        let member = memberById

        if (!member && user.email && appProfile?.gym_id) {
          const {
            data: memberByEmail,
            error: memberByEmailError,
          } = await supabase
            .from("members")
            .select(memberColumns)
            .eq("gym_id", appProfile.gym_id)
            .eq("email", user.email)
            .maybeSingle()

          if (memberByEmailError) {
            throw memberByEmailError
          }

          member = memberByEmail
        }

        if (!member && !appProfile) {
          throw new Error(
            "Member profile not found for this account.",
          )
        }

        const fullName = (
          appProfile?.full_name || ""
        )
          .trim()
          .split(/\s+/)
          .filter(Boolean)

        const firstName =
          member?.first_name ||
          fullName[0] ||
          ""

        const lastName =
          member?.last_name ||
          fullName.slice(1).join(" ") ||
          ""

        const {
          data: notifPrefs,
          error: notifError,
        } = member?.id
          ? await supabase
              .from("member_notification_preferences")
              .select(
                "email_reminders, sms_reminders",
              )
              .eq("member_id", member.id)
              .maybeSingle()
          : { data: null, error: null }

        if (
          notifError &&
          notifError.code !== "PGRST116" &&
          notifError.code !== "PGRST205"
        ) {
          throw notifError
        }

        if (!active) {
          return
        }

        if (notifPrefs) {
          setEmailReminders(
            notifPrefs.email_reminders ?? true,
          )
          setSmsReminders(
            notifPrefs.sms_reminders ?? true,
          )
        }

        setProfile({
          id: appProfile?.id || user.id,
          gymId:
            member?.gym_id ||
            appProfile?.gym_id ||
            "",
          memberId: member?.id || "",
          firstName,
          lastName,
          email:
            member?.email ||
            appProfile?.email ||
            user.email ||
            "",
          phone:
            member?.phone ||
            appProfile?.phone ||
            "",
          dateOfBirth:
            member?.date_of_birth || "",
          gender: member?.gender || "",
          address: member?.address || "",
          city: member?.city || "",
          state: member?.state || "",
          zip: member?.postal_code || "",
          emergencyName:
            member?.emergency_contact_name ||
            "",
          emergencyPhone:
            member?.emergency_contact_phone ||
            "",
          emergencyRelation: "",
          avatarUrl:
            member?.profile_image_url ||
            appProfile?.avatar_url ||
            "",
          status:
            member?.status ||
            appProfile?.status ||
            "active",
        })
      } catch (err) {
        if (active) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to load your profile.",
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  const updateField = (
    field: string,
    value: string,
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    setUploadingAvatar(true)

    try {
      const fileExt = file.name
        .split(".")
        .pop()

      const filePath = `avatars/${profile.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } =
        await supabase.storage
          .from("avatars")
          .upload(filePath, file, {
            upsert: true,
          })

      let publicUrl = ""

      if (!uploadError) {
        const {
          data: urlData,
        } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath)

        publicUrl = urlData.publicUrl
      } else {
        publicUrl =
          await new Promise<string>(
            (resolve) => {
              const reader =
                new FileReader()

              reader.onloadend = () =>
                resolve(
                  reader.result as string,
                )

              reader.readAsDataURL(file)
            },
          )
      }

      setProfile((prev) => ({
        ...prev,
        avatarUrl: publicUrl,
      }))
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to upload avatar.",
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePasswordChange = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault()

    if (
      !newPassword ||
      newPassword.length < 6
    ) {
      toast.error(
        "Password must be at least 6 characters.",
      )
      return
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      toast.error("Passwords do not match.")
      return
    }

    setPasswordLoading(true)

    try {
      const { error: pwdErr } =
        await supabase.auth.updateUser({
          password: newPassword,
        })

      if (pwdErr) {
        throw pwdErr
      }

      toast.success(
        "Password updated successfully!",
      )

      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update password.",
      )
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile.gymId) {
      toast.error(
        "Gym information is missing. Please refresh and try again.",
      )
      return
    }

    if (!profile.id) {
      toast.error(
        "Your account information is missing. Please refresh and try again.",
      )
      return
    }

    if (!profile.memberId) {
      toast.error(
        "Your member account is not linked correctly. Please contact your gym administrator.",
      )
      return
    }

    setSaving(true)

    try {
      const now =
        new Date().toISOString()

      const fullName =
        `${profile.firstName} ${profile.lastName}`.trim()

      const {
        data: updatedMember,
        error: memberError,
      } = await supabase
        .from("members")
        .update({
          first_name:
            profile.firstName.trim() ||
            null,
          last_name:
            profile.lastName.trim() ||
            null,
          email:
            profile.email.trim() ||
            null,
          phone:
            profile.phone.trim() ||
            null,
          date_of_birth:
            profile.dateOfBirth ||
            null,
          gender:
            profile.gender || null,
          address:
            profile.address.trim() ||
            null,
          city:
            profile.city.trim() ||
            null,
          state:
            profile.state.trim() ||
            null,
          postal_code:
            profile.zip.trim() ||
            null,
          emergency_contact_name:
            profile.emergencyName.trim() ||
            null,
          emergency_contact_phone:
            profile.emergencyPhone.trim() ||
            null,
          profile_image_url:
            profile.avatarUrl ||
            null,
          updated_at: now,
        })
        .eq("id", profile.memberId)
        .eq("gym_id", profile.gymId)
        .select("id")
        .maybeSingle()

      if (memberError) {
        throw memberError
      }

      if (!updatedMember) {
        throw new Error(
          "Your member details could not be updated. Please check your account permissions.",
        )
      }

      const {
        data: updatedProfile,
        error: appProfileError,
      } = await supabase
        .from("profiles")
        .update({
          full_name:
            fullName || null,
          phone:
            profile.phone.trim() ||
            null,
          avatar_url:
            profile.avatarUrl ||
            null,
          updated_at: now,
        })
        .eq("id", profile.id)
        .eq("gym_id", profile.gymId)
        .select("id")
        .maybeSingle()

      if (appProfileError) {
        throw appProfileError
      }

      if (!updatedProfile) {
        throw new Error(
          "Your account profile could not be updated. Please check your account permissions.",
        )
      }

      const {
        error: notificationError,
      } = await supabase
        .from(
          "member_notification_preferences",
        )
        .upsert(
          {
            member_id:
              profile.memberId,
            gym_id:
              profile.gymId,
            email_reminders:
              emailReminders,
            sms_reminders:
              smsReminders,
            updated_at: now,
          },
          {
            onConflict: "member_id",
          },
        )

      if (notificationError) {
        throw notificationError
      }

      const {
        data: savedMember,
        error: reloadMemberError,
      } = await supabase
        .from("members")
        .select(`
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          gender,
          address,
          city,
          state,
          postal_code,
          emergency_contact_name,
          emergency_contact_phone,
          profile_image_url,
          status
        `)
        .eq("id", profile.memberId)
        .eq("gym_id", profile.gymId)
        .maybeSingle()

      if (reloadMemberError) {
        throw reloadMemberError
      }

      if (savedMember) {
        setProfile((prev) => ({
          ...prev,
          firstName:
            savedMember.first_name ||
            "",
          lastName:
            savedMember.last_name ||
            "",
          email:
            savedMember.email || "",
          phone:
            savedMember.phone || "",
          dateOfBirth:
            savedMember.date_of_birth ||
            "",
          gender:
            savedMember.gender || "",
          address:
            savedMember.address || "",
          city:
            savedMember.city || "",
          state:
            savedMember.state || "",
          zip:
            savedMember.postal_code ||
            "",
          emergencyName:
            savedMember.emergency_contact_name ||
            "",
          emergencyPhone:
            savedMember.emergency_contact_phone ||
            "",
          avatarUrl:
            savedMember.profile_image_url ||
            "",
          status:
            savedMember.status ||
            prev.status,
        }))
      }

      toast.success(
        "Your changes were saved successfully.",
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to save your profile."

      if (
        message.includes(
          "row-level security",
        ) ||
        message.includes(
          "permission denied",
        ) ||
        message.includes("42501")
      ) {
        toast.error(
          "You do not have permission to update this information. Please contact your gym administrator.",
        )
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const initials =
    `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
      .toUpperCase() || "ME"

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="border-b">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/member"
            className="group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:text-gray-600"
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
            <p className="text-sm font-medium text-gray-700">
              Loading your profile...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Getting your information from your gym account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:h-fit">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="Profile"
                        className="h-24 w-24 rounded-full object-cover ring-4 ring-gray-100"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-900 text-2xl font-bold text-white ring-4 ring-gray-100">
                        {initials}
                      </div>
                    )}

                    <input
                      type="file"
                      id="avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={
                        handleAvatarUpload
                      }
                      disabled={
                        uploadingAvatar
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(
                            "avatar-upload",
                          )
                          ?.click()
                      }
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200"
                      title="Upload profile photo"
                    >
                      <Camera
                        size={14}
                        className={
                          uploadingAvatar
                            ? "animate-pulse"
                            : ""
                        }
                      />
                    </button>
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-gray-900">
                    {`${profile.firstName} ${profile.lastName}`.trim() ||
                      "Member"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Gym Member
                  </p>

                  <div
                    className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                      profile.status ===
                      "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    <Check size={12} />
                    {profile.status ||
                      "active"}
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <ProfileNav
                    icon={
                      <UserRound size={16} />
                    }
                    label="Personal Information"
                    active={
                      activeTab ===
                      "personal"
                    }
                    onClick={() =>
                      setActiveTab(
                        "personal",
                      )
                    }
                  />

                  <ProfileNav
                    icon={<Bell size={16} />}
                    label="Notifications"
                    active={
                      activeTab ===
                      "notifications"
                    }
                    onClick={() =>
                      setActiveTab(
                        "notifications",
                      )
                    }
                  />

                  <ProfileNav
                    icon={<Lock size={16} />}
                    label="Password & Security"
                    active={
                      activeTab ===
                      "security"
                    }
                    onClick={() =>
                      setActiveTab(
                        "security",
                      )
                    }
                  />
                </div>
              </div>
            </aside>

            <div className="space-y-6">
              {activeTab ===
                "personal" && (
                <>
                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                        <UserRound size={19} />
                      </div>

                      <h2 className="mt-4 text-base font-semibold text-gray-900">
                        Personal Information
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Update your basic account information.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="First Name">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.firstName
                          }
                          onChange={(e) =>
                            updateField(
                              "firstName",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="Last Name">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.lastName
                          }
                          onChange={(e) =>
                            updateField(
                              "lastName",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="Email Address">
                        <div className="relative">
                          <Mail
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="email"
                            readOnly
                            disabled
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            value={
                              profile.email
                            }
                          />
                        </div>
                      </Field>

                      <Field label="Phone Number">
                        <div className="relative">
                          <Phone
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            value={
                              profile.phone
                            }
                            onChange={(e) =>
                              updateField(
                                "phone",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </Field>

                      <Field label="Date of Birth">
                        <div className="relative">
                          <CalendarDays
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            type="date"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            value={
                              profile.dateOfBirth
                            }
                            onChange={(e) =>
                              updateField(
                                "dateOfBirth",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </Field>

                      <Field label="Gender">
                        <select
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.gender
                          }
                          onChange={(e) =>
                            updateField(
                              "gender",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">
                            Select gender
                          </option>
                          <option value="Male">
                            Male
                          </option>
                          <option value="Female">
                            Female
                          </option>
                          <option value="Other">
                            Other
                          </option>
                          <option value="Prefer not to say">
                            Prefer not to say
                          </option>
                        </select>
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                        <MapPin size={19} />
                      </div>

                      <h2 className="mt-4 text-base font-semibold text-gray-900">
                        Address
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Your current residential address.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field
                        label="Street Address"
                        className="sm:col-span-2"
                      >
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.address
                          }
                          onChange={(e) =>
                            updateField(
                              "address",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="City">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.city
                          }
                          onChange={(e) =>
                            updateField(
                              "city",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="State">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.state
                          }
                          onChange={(e) =>
                            updateField(
                              "state",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="ZIP Code">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.zip
                          }
                          onChange={(e) =>
                            updateField(
                              "zip",
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                        <ShieldCheck size={19} />
                      </div>

                      <h2 className="mt-4 text-base font-semibold text-gray-900">
                        Emergency Contact
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Someone we can contact in case of an emergency.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Full Name">
                        <input
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.emergencyName
                          }
                          onChange={(e) =>
                            updateField(
                              "emergencyName",
                              e.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="Relationship">
                        <select
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                          value={
                            profile.emergencyRelation
                          }
                          onChange={(e) =>
                            updateField(
                              "emergencyRelation",
                              e.target.value,
                            )
                          }
                        >
                          <option value="">
                            Select relationship
                          </option>
                          <option value="Spouse">
                            Spouse
                          </option>
                          <option value="Parent">
                            Parent
                          </option>
                          <option value="Sibling">
                            Sibling
                          </option>
                          <option value="Friend">
                            Friend
                          </option>
                          <option value="Other">
                            Other
                          </option>
                        </select>
                      </Field>

                      <Field label="Phone Number">
                        <div className="relative">
                          <Phone
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />

                          <input
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                            value={
                              profile.emergencyPhone
                            }
                            onChange={(e) =>
                              updateField(
                                "emergencyPhone",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </Field>
                    </div>
                  </section>
                </>
              )}

              {activeTab ===
                "notifications" && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <Bell size={19} />
                    </div>

                    <h2 className="mt-4 text-base font-semibold text-gray-900">
                      Notification Preferences
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Control how you receive class reminders, schedule changes, and gym updates.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="email-reminders"
                          className="cursor-pointer text-sm font-semibold text-gray-900"
                        >
                          Email Reminders & Alerts
                        </label>

                        <p className="text-xs text-gray-500">
                          Receive booking confirmations, upcoming class reminders, and receipts via email.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        id="email-reminders"
                        checked={
                          emailReminders
                        }
                        onChange={(e) =>
                          setEmailReminders(
                            e.target.checked,
                          )
                        }
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <div className="space-y-0.5">
                        <label
                          htmlFor="sms-reminders"
                          className="cursor-pointer text-sm font-semibold text-gray-900"
                        >
                          SMS Text Reminders
                        </label>

                        <p className="text-xs text-gray-500">
                          Receive instant SMS alerts for class start times and important door access notices.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        id="sms-reminders"
                        checked={
                          smsReminders
                        }
                        onChange={(e) =>
                          setSmsReminders(
                            e.target.checked,
                          )
                        }
                        className="h-5 w-5 cursor-pointer rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "security" && (
                <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <Lock size={19} />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        Password & Security
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Keep your account secure with a strong password.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={
                      handlePasswordChange
                    }
                    className="mt-6 max-w-md space-y-4"
                  >
                    <Field label="New Password">
                      <input
                        type="password"
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Confirm New Password">
                      <input
                        type="password"
                        placeholder="Re-enter new password"
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                        value={
                          confirmPassword
                        }
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value,
                          )
                        }
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={
                        passwordLoading ||
                        !newPassword
                      }
                      className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      {passwordLoading
                        ? "Updating..."
                        : "Update Password"}
                    </button>
                  </form>
                </section>
              )}

              {activeTab !==
                "security" && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}
    </div>
  )
}

function ProfileNav({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
