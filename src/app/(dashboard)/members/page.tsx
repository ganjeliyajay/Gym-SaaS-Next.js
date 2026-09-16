"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type MemberStatus = "Active" | "Inactive" | "Pending"

type Member = {
  id: string
  name: string
  email: string
  phone: string
  plan: string
  status: MemberStatus
  joined: string
  lastCheckIn: string
  avatar: string
}

type SelectedProduct = {
  name?: string
  title?: string
  productName?: string
  [key: string]: unknown
}

type ImportSummary = {
  total: number
  imported: number
  updated: number
  skipped: number
  failedRows: Array<{
    row: number
    email: string
    reason: string
  }>
}

const statusOptions = [
  "All Status",
  "Active",
  "Inactive",
  "Pending",
]

const DEFAULT_PRODUCT_FILTER = "All Products"

export default function MembersPage() {
  const {
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
    loading: toastLoading,
    dismiss,
  } = useToast()

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All Status")
  const [plan, setPlan] = useState(DEFAULT_PRODUCT_FILTER)
  const [productOptions, setProductOptions] = useState<string[]>([])
  const [sort, setSort] = useState("Newest")

  const [selected, setSelected] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importInput, setImportInput] =
    useState<HTMLInputElement | null>(null)

  const [showSummaryModal, setShowSummaryModal] =
    useState(false)

  const [importSummary, setImportSummary] =
    useState<ImportSummary | null>(null)

  

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false)

  

  const loadMembers = async () => {
    try {
      setLoading(true)
      setLoadError("")

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw authError
      }

      if (!user) {
        throw new Error("You must be logged in.")
      }

      const {
        data: currentProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw profileError
      }

      if (!currentProfile?.gym_id) {
        throw new Error("Gym information not found.")
      }

      const gymId = currentProfile.gym_id

      console.log("CURRENT USER:", user.id)
      console.log("CURRENT GYM ID:", gymId)

      

      const {
        data: membersData,
        error: membersError,
      } = await supabase
        .from("members")
        .select(
          "id, first_name, last_name, email, phone, status, joined_at, created_at"
        )
        .eq("gym_id", gymId)
        .order("created_at", {
          ascending: false,
        })

      if (membersError) {
        console.error(
          "Members query error:",
          membersError
        )
        throw membersError
      }

      console.log(
        "ACTUAL MEMBERS:",
        membersData
      )

      

      const {
        data: productsData,
        error: productsError,
      } = await supabase
        .from("products")
        .select("id, name")
        .eq("gym_id", gymId)
        .order("name", {
          ascending: true,
        })

      if (productsError) {
        console.warn(
          "Products query error:",
          productsError
        )
      }

      

      const {
        data: checkinsData,
        error: checkinsError,
      } = await supabase
        .from("checkins")
        .select("member_id, checked_in_at")
        .eq("gym_id", gymId)
        .order("checked_in_at", {
          ascending: false,
        })

      if (checkinsError) {
        console.warn(
          "Checkins query error:",
          checkinsError
        )
      }

      

      const {
        data: membershipsData,
        error: membershipsError,
      } = await supabase
        .from("member_memberships")
        .select(`
          member_id,
          status,
          product_id,
          products (
            id,
            name
          )
        `)
        .eq("gym_id", gymId)

      if (membershipsError) {
        console.warn(
          "Member memberships query error:",
          membershipsError
        )
      }

      console.log(
        "MEMBER MEMBERSHIPS:",
        membershipsData
      )

      

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, status, created_at"
        )
        .eq("gym_id", gymId)
        .eq("role", "member")
        .order("created_at", {
          ascending: false,
        })

      if (profilesError) {
        console.warn(
          "Member profiles query error:",
          profilesError
        )
      }

      

      const {
        data: submissionsData,
        error: submissionsError,
      } = await supabase
        .from("signup_submissions")
        .select(
          "member_id, selected_product"
        )
        .eq("gym_id", gymId)
        .not("member_id", "is", null)

      if (submissionsError) {
        console.warn(
          "Signup submissions query error:",
          submissionsError
        )
      }

      

      const productNames = (productsData ?? [])
        .map((product: any) => product.name)
        .filter(
          (name: any): name is string =>
            Boolean(name)
        )

      setProductOptions(productNames)

      

      const latestCheckinMap =
        new Map<string, string>()

      ;(checkinsData ?? []).forEach(
        (checkin: any) => {
          if (
            checkin.member_id &&
            !latestCheckinMap.has(
              checkin.member_id
            )
          ) {
            latestCheckinMap.set(
              checkin.member_id,
              checkin.checked_in_at
            )
          }
        }
      )

      

      const activeProductMap =
        new Map<string, string>()

      ;(membershipsData ?? []).forEach(
        (membership: any) => {
          if (
            membership.status === "active" &&
            membership.member_id &&
            membership.products?.name &&
            !activeProductMap.has(
              membership.member_id
            )
          ) {
            activeProductMap.set(
              membership.member_id,
              membership.products.name
            )
          }
        }
      )

      

      const submissionMap =
        new Map<string, unknown>()

      ;(submissionsData ?? []).forEach(
        (submission: any) => {
          if (
            submission.member_id &&
            !submissionMap.has(
              submission.member_id
            )
          ) {
            submissionMap.set(
              submission.member_id,
              submission.selected_product
            )
          }
        }
      )

      

      const memberMap =
        new Map<string, any>()

      ;(membersData ?? []).forEach(
        (member: any) => {
          memberMap.set(
            member.id,
            {
              id: member.id,

              name:
                `${member.first_name || ""} ${
                  member.last_name || ""
                }`.trim() ||
                "Unnamed Member",

              email:
                member.email || "",

              phone:
                member.phone || "—",

              status:
                member.status || "active",

              joinedAt:
                member.joined_at ||
                member.created_at,
            }
          )
        }
      )

      

      ;(profilesData ?? []).forEach(
        (profile: any) => {
          if (!memberMap.has(profile.id)) {
            memberMap.set(
              profile.id,
              {
                id: profile.id,

                name:
                  profile.full_name?.trim() ||
                  "Unnamed Member",

                email:
                  profile.email || "",

                phone: "—",

                status:
                  profile.status || "active",

                joinedAt:
                  profile.created_at,
              }
            )
          }
        }
      )

      

      const formattedMembers: Member[] =
        Array.from(
          memberMap.values()
        ).map((raw: any) => {
          const name =
            raw.name || "Unnamed Member"

          const avatar = name
            .split(" ")
            .filter(Boolean)
            .map(
              (part: string) =>
                part
                  .charAt(0)
                  .toUpperCase()
            )
            .join("")
            .slice(0, 2)

          const normalizedStatus =
            String(
              raw.status || "pending"
            ).toLowerCase()

          const memberStatus: MemberStatus =
            normalizedStatus === "active"
              ? "Active"
              : normalizedStatus ===
                  "inactive"
                ? "Inactive"
                : "Pending"

          
          let product =
            activeProductMap.get(
              raw.id
            )

          
          if (!product) {
            const selectedProduct =
              submissionMap.get(
                raw.id
              )

            if (
              typeof selectedProduct ===
              "string"
            ) {
              product =
                selectedProduct
            } else if (
              selectedProduct &&
              typeof selectedProduct ===
                "object"
            ) {
              const productObject =
                selectedProduct as SelectedProduct

              product =
                productObject.name ||
                productObject.title ||
                productObject.productName
            }
          }

          const lastCheckIn =
            latestCheckinMap.get(
              raw.id
            )

          return {
            id: raw.id,

            name,

            email: raw.email,

            phone: raw.phone,

            plan:
              product ||
              "No Product",

            status:
              memberStatus,

            joined: raw.joinedAt
              ? new Date(
                  raw.joinedAt
                ).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )
              : "—",

            lastCheckIn:
              lastCheckIn
                ? new Date(
                    lastCheckIn
                  ).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )
                : "Never",

            avatar:
              avatar || "M",
          }
        })

      console.log(
        "FINAL MEMBERS FOR TABLE:",
        formattedMembers
      )

      setMembers(
        formattedMembers
      )
    } catch (error) {
      console.error(
        "Failed to load members:",
        error
      )

      const message =
        error instanceof Error
          ? error.message
          : "Unable to load members."

      setLoadError(message)

      toastError(
        "We couldn't load the members right now. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])

  

  const filteredMembers = useMemo(() => {
    let result = [...members]

    const query =
      search
        .toLowerCase()
        .trim()

    if (query) {
      result = result.filter(
        (member) =>
          member.name
            .toLowerCase()
            .includes(query) ||
          member.email
            .toLowerCase()
            .includes(query) ||
          member.phone
            .toLowerCase()
            .includes(query)
      )
    }

    if (status !== "All Status") {
      result =
        result.filter(
          (member) =>
            member.status === status
        )
    }

    if (
      plan !==
      DEFAULT_PRODUCT_FILTER
    ) {
      result =
        result.filter(
          (member) =>
            member.plan === plan
        )
    }

    if (sort === "Name A-Z") {
      result.sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      )
    }

    if (sort === "Name Z-A") {
      result.sort((a, b) =>
        b.name.localeCompare(
          a.name
        )
      )
    }

    return result
  }, [
    members,
    search,
    status,
    plan,
    sort,
  ])

  

  const allVisibleSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every(
      (member) =>
        selected.includes(
          member.id
        )
    )

  const toggleSelect = (
    id: string
  ) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter(
            (item) =>
              item !== id
          )
        : [...prev, id]
    )
  }

  const toggleSelectAll =
    () => {
      if (
        allVisibleSelected
      ) {
        setSelected((prev) =>
          prev.filter(
            (id) =>
              !filteredMembers.some(
                (member) =>
                  member.id === id
              )
          )
        )
      } else {
        setSelected((prev) => [
          ...new Set([
            ...prev,
            ...filteredMembers.map(
              (member) =>
                member.id
            ),
          ]),
        ])
      }
    }

  

  const clearFilters =
    () => {
      setSearch("")
      setStatus("All Status")
      setPlan(
        DEFAULT_PRODUCT_FILTER
      )
      setSort("Newest")
    }

  const hasFilters =
    search !== "" ||
    status !== "All Status" ||
    plan !==
      DEFAULT_PRODUCT_FILTER

  

  const statusStyles: Record<
    MemberStatus,
    string
  > = {
    Active:
      "bg-gray-100 text-gray-700",

    Inactive:
      "bg-gray-100 text-gray-400",

    Pending:
      "bg-gray-900 text-white",
  }

  

  const totalMembers =
    members.length

  const activeMembers =
    members.filter(
      (member) =>
        member.status ===
        "Active"
    ).length

  const inactiveMembers =
    members.filter(
      (member) =>
        member.status ===
        "Inactive"
    ).length

  const pendingMembers =
    members.filter(
      (member) =>
        member.status ===
        "Pending"
    ).length

  

  const openMemberDetails = (
    member: Member
  ) => {
    setSelectedMember(member)
    setShowDeleteConfirm(false)
  }

  const closeMemberDetails =
    () => {
      setSelectedMember(null)
      setShowDeleteConfirm(false)
    }

  

  const handleImportCSV =
    async (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        event.target.files?.[0]

      if (!file) return

      setImporting(true)
      setLoadError("")

      const toastId =
        toastLoading(
          "Importing CSV members..."
        )

      try {
        const text =
          await file.text()

        const lines =
          text
            .split(/\r?\n/)
            .map((line) =>
              line.trim()
            )
            .filter(Boolean)

        if (lines.length < 2) {
          dismiss(toastId)

          toastError(
            "CSV file is empty or has no member rows."
          )

          return
        }

        const parseCSVLine =
          (line: string) => {
            const values: string[] = []

            let current = ""

            let insideQuotes =
              false

            for (
              let i = 0;
              i < line.length;
              i++
            ) {
              const char =
                line[i]

              if (char === '"') {
                if (
                  insideQuotes &&
                  line[i + 1] ===
                    '"'
                ) {
                  current += '"'
                  i++
                } else {
                  insideQuotes =
                    !insideQuotes
                }
              } else if (
                char === "," &&
                !insideQuotes
              ) {
                values.push(
                  current.trim()
                )

                current = ""
              } else {
                current += char
              }
            }

            values.push(
              current.trim()
            )

            return values
          }

        const headers =
          parseCSVLine(
            lines[0]
          ).map((header) =>
            header
              .toLowerCase()
              .replace(/\s+/g, "")
              .replace(/_/g, "")
          )

        const getIndex =
          (...names: string[]) =>
            names
              .map(
                (name) =>
                  headers.indexOf(
                    name
                  )
              )
              .find(
                (index) =>
                  index >= 0
              ) ?? -1

        const firstNameIndex =
          getIndex(
            "firstname",
            "first"
          )

        const lastNameIndex =
          getIndex(
            "lastname",
            "last"
          )

        const emailIndex =
          getIndex("email")

        const phoneIndex =
          getIndex(
            "phone",
            "phonenumber"
          )

        const addressIndex =
          getIndex("address")

        const cityIndex =
          getIndex("city")

        const stateIndex =
          getIndex("state")

        const zipIndex =
          getIndex(
            "zip",
            "zipcode",
            "postalcode"
          )

        const authNetCustomerIdIndex =
          getIndex(
            "authorizenetcustomerid",
            "authorizenetid",
            "authnetcustomerid",
            "customerid"
          )

        if (
          firstNameIndex ===
            -1 ||
          lastNameIndex ===
            -1 ||
          emailIndex === -1
        ) {
          dismiss(toastId)

          toastError(
            "CSV must contain First Name, Last Name and Email columns."
          )

          return
        }

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser()

        if (!user) {
          dismiss(toastId)

          toastError(
            "You must be logged in."
          )

          return
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("gym_id")
          .eq("id", user.id)
          .single()

        if (
          profileError ||
          !profile?.gym_id
        ) {
          dismiss(toastId)

          toastError(
            "Gym information not found."
          )

          return
        }

        let successCount = 0
        let updatedCount = 0
        let failedCount = 0

        const errors: string[] =
          []

        for (
          let i = 1;
          i < lines.length;
          i++
        ) {
          const values =
            parseCSVLine(
              lines[i]
            )

          const firstName =
            values[
              firstNameIndex
            ]?.trim()

          const lastName =
            values[
              lastNameIndex
            ]?.trim()

          const email =
            values[
              emailIndex
            ]?.trim()

          if (
            !firstName ||
            !lastName ||
            !email
          ) {
            failedCount++

            errors.push(
              `Row ${
                i + 1
              }: missing required fields`
            )

            continue
          }

          const response =
            await fetch(
              "/api/members",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify(
                  {
                    gymId:
                      profile.gym_id,

                    firstName,

                    lastName,

                    email,

                    phone:
                      phoneIndex >=
                      0
                        ? values[
                            phoneIndex
                          ]?.trim() ||
                          null
                        : null,

                    address:
                      addressIndex >=
                      0
                        ? values[
                            addressIndex
                          ]?.trim() ||
                          null
                        : null,

                    city:
                      cityIndex >= 0
                        ? values[
                            cityIndex
                          ]?.trim() ||
                          null
                        : null,

                    state:
                      stateIndex >=
                      0
                        ? values[
                            stateIndex
                          ]?.trim() ||
                          null
                        : null,

                    zip:
                      zipIndex >= 0
                        ? values[
                            zipIndex
                          ]?.trim() ||
                          null
                        : null,

                    authorizeNetCustomerId:
                      authNetCustomerIdIndex >=
                      0
                        ? values[
                            authNetCustomerIdIndex
                          ]?.trim() ||
                          null
                        : null,

                    status:
                      "Active",

                    isCsvImport:
                      true,
                  }
                ),
              }
            )

          const result =
            await response.json()

          if (
            !response.ok ||
            !result.success
          ) {
            failedCount++

            errors.push(
              `Row ${
                i + 1
              } (${email}): ${
                result.message ||
                "Import failed"
              }`
            )
          } else if (
            result.action ===
            "updated"
          ) {
            updatedCount++
          } else {
            successCount++
          }
        }

        setImportSummary({
          total:
            lines.length - 1,

          imported:
            successCount,

          updated:
            updatedCount,

          skipped:
            failedCount,

          failedRows:
            errors.map(
              (err, idx) => ({
                row: idx + 1,

                email:
                  err
                    .split("(")[1]
                    ?.split(")")[0] ||
                  "",

                reason:
                  err.split(
                    "): "
                  )[1] || err,
              })
            ),
        })

        setShowSummaryModal(
          true
        )

        dismiss(toastId)

        if (
          failedCount > 0 &&
          (successCount > 0 ||
            updatedCount > 0)
        ) {
          toastWarning(
            `The CSV was imported, but ${failedCount} row${
              failedCount > 1
                ? "s"
                : ""
            } could not be added.`
          )
        } else if (
          failedCount > 0 &&
          successCount === 0 &&
          updatedCount === 0
        ) {
          toastError(
            "We couldn't import the CSV. Please check the file format and try again."
          )
        } else {
          toastSuccess(
            `CSV imported successfully. ${
              successCount +
              updatedCount
            } member${
              successCount +
                updatedCount >
              1
                ? "s"
                : ""
            } processed.`
          )
        }
      } catch (error) {
        dismiss(toastId)

        console.error(
          "CSV import failed:",
          error
        )

        toastError(
          "We couldn't import the CSV. Please check the file format and try again."
        )
      } finally {
        setImporting(false)

        if (importInput) {
          importInput.value = ""
        }
      }
    }

  

  const exportMembers = (
    membersToExport: Member[]
  ) => {
    if (
      !membersToExport.length
    ) {
      return
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Product",
      "Status",
      "Joined",
      "Last Check-in",
    ]

    const rows =
      membersToExport.map(
        (member) => [
          member.name,
          member.email,
          member.phone,
          member.plan,
          member.status,
          member.joined,
          member.lastCheckIn,
        ]
      )

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value ?? ""
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n")

    const blob =
      new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      })

    const url =
      URL.createObjectURL(
        blob
      )

    const anchor =
      document.createElement(
        "a"
      )

    anchor.href = url

    anchor.download = `members-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(
      anchor
    )

    anchor.click()

    anchor.remove()

    URL.revokeObjectURL(url)

    toastSuccess(
      "Members exported successfully."
    )
  }

  

  const handleDelete = async (
    memberId: string
  ) => {
    const toastId =
      toastLoading(
        "Deleting member..."
      )

    try {
      setLoadError("")

      const response =
        await fetch(
          `/api/members/${memberId}`,
          {
            method: "DELETE",
          }
        )

      const result =
        await response.json()

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Unable to delete member."
        )
      }

      setMembers((prev) =>
        prev.filter(
          (member) =>
            member.id !==
            memberId
        )
      )

      setSelected((prev) =>
        prev.filter(
          (id) =>
            id !== memberId
        )
      )

      dismiss(toastId)

      toastSuccess(
        "Member deleted successfully."
      )

      closeMemberDetails()
    } catch (error) {
      dismiss(toastId)

      console.error(
        "Failed to delete member:",
        error
      )

      toastError(
        "We couldn't delete this member. Please try again."
      )
    }
  }

  

  const handleBulkDelete =
    async () => {
      if (!selected.length) {
        return
      }

      const count =
        selected.length

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${count} selected member${
            count > 1
              ? "s"
              : ""
          }? This action cannot be undone.`
        )

      if (!confirmed) {
        return
      }

      const toastId =
        toastLoading(
          `Deleting ${count} member${
            count > 1
              ? "s"
              : ""
          }...`
        )

      try {
        setLoadError("")

        const response =
          await fetch(
            "/api/members/bulk-delete",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  memberIds:
                    selected,
                }
              ),
            }
          )

        const result =
          await response.json()

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to bulk delete members."
          )
        }

        setMembers((prev) =>
          prev.filter(
            (member) =>
              !selected.includes(
                member.id
              )
          )
        )

        setSelected([])

        dismiss(toastId)

        toastSuccess(
          `${count} member${
            count > 1
              ? "s"
              : ""
          } deleted successfully.`
        )
      } catch (error) {
        dismiss(toastId)

        console.error(
          "Failed to delete members:",
          error
        )

        toastError(
          "We couldn't delete the selected members. Please try again."
        )
      }
    }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {}

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="flex items-center gap-2">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                  <Users size={19} />
                </div>

                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Members
                  </h1>

                  <p className="text-sm text-gray-500">
                    Manage your gym members and customers.
                  </p>
                </div>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <input
                ref={(input) =>
                  setImportInput(input)
                }
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={
                  handleImportCSV
                }
              />

              <button
                type="button"
                disabled={importing}
                onClick={() =>
                  importInput?.click()
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />

                <span className="hidden sm:inline">
                  {importing
                    ? "Importing..."
                    : "Import CSV"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportMembers(
                    filteredMembers
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Download size={16} />

                <span className="hidden sm:inline">
                  Export
                </span>
              </button>

              <Link
                href="/members/create"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
              >
                <Plus size={17} />
                Add Member
              </Link>

            </div>

          </div>
        </div>
      </div>

      {}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Total Members
              </p>

              <Users
                size={17}
                className="text-gray-400"
              />
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading
                ? "—"
                : totalMembers}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              All gym members
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Active
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading
                ? "—"
                : activeMembers}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Active members
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Inactive
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading
                ? "—"
                : inactiveMembers}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Needs attention
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Pending
              </p>

              <UserPlus
                size={17}
                className="text-gray-400"
              />
            </div>

            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading
                ? "—"
                : pendingMembers}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Pending accounts
            </p>
          </div>

        </div>

        {}

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {}

          <div className="border-b border-gray-200 p-4 sm:p-5">

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex flex-1 flex-col gap-3 sm:flex-row">

                {}

                <div className="relative flex-1 xl:max-w-md">

                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search members..."
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      <X size={16} />
                    </button>
                  )}

                </div>

                {}

                <div className="hidden items-center gap-2 md:flex">

                  <div className="relative">

                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value
                        )
                      }
                      className="h-11 appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none focus:border-gray-400"
                    >
                      {statusOptions.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                  </div>

                  <div className="relative">

                    <select
                      value={plan}
                      onChange={(e) =>
                        setPlan(
                          e.target.value
                        )
                      }
                      className="h-11 max-w-[190px] appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none focus:border-gray-400"
                    >

                      <option value={DEFAULT_PRODUCT_FILTER}>
                        {DEFAULT_PRODUCT_FILTER}
                      </option>

                      {productOptions.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}

                      <option value="No Product">
                        No Product
                      </option>

                    </select>

                    <ChevronDown
                      size={15}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                  </div>

                </div>

                {}

                <button
                  type="button"
                  onClick={() =>
                    setShowFilters(
                      (prev) =>
                        !prev
                    )
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 md:hidden"
                >
                  <Filter size={16} />
                  Filters
                </button>

              </div>

              {}

              <div className="relative">

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value
                    )
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none focus:border-gray-400 sm:w-auto"
                >
                  <option value="Newest">
                    Newest
                  </option>

                  <option value="Name A-Z">
                    Name A-Z
                  </option>

                  <option value="Name Z-A">
                    Name Z-A
                  </option>
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

              </div>

            </div>

            {}

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:hidden">

                <div className="relative">

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none"
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                </div>

                <div className="relative">

                  <select
                    value={plan}
                    onChange={(e) =>
                      setPlan(
                        e.target.value
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none"
                  >

                    <option value={DEFAULT_PRODUCT_FILTER}>
                      {DEFAULT_PRODUCT_FILTER}
                    </option>

                    {productOptions.map(
                      (option) => (
                        <option
                          key={option}
                          value={option}
                        >
                          {option}
                        </option>
                      )
                    )}

                    <option value="No Product">
                      No Product
                    </option>

                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                </div>

              </div>
            )}

            {}

            {hasFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2">

                {search && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                    Search: {search}
                  </span>
                )}

                {status !==
                  "All Status" && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                    {status}
                  </span>
                )}

                {plan !==
                  DEFAULT_PRODUCT_FILTER && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                    {plan}
                  </span>
                )}

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="text-xs font-medium text-gray-500 hover:text-gray-900"
                >
                  Clear all
                </button>

              </div>
            )}

          </div>

          {}

          {selected.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">

              <p className="text-sm font-medium text-gray-700">
                {selected.length} member
                {selected.length >
                1
                  ? "s"
                  : ""}{" "}
                selected
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    exportMembers(
                      members.filter(
                        (member) =>
                          selected.includes(
                            member.id
                          )
                      )
                    )
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download size={14} />
                  Export
                </button>

                <button
                  type="button"
                  onClick={
                    handleBulkDelete
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>

              </div>
            </div>
          )}

          {}

          {loading && (
            <div className="px-5 py-16 text-center">

              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

              <p className="mt-4 text-sm text-gray-500">
                Loading members...
              </p>

            </div>
          )}

          {}

          {!loading &&
            !loadError &&
            filteredMembers.length >
              0 && (
              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[900px]">

                  <thead>

                    <tr className="border-b border-gray-200 bg-gray-50/70">

                      <th className="w-12 px-5 py-3 text-left">

                        <input
                          type="checkbox"
                          checked={
                            allVisibleSelected
                          }
                          onChange={
                            toggleSelectAll
                          }
                          className="h-4 w-4 rounded border-gray-300 accent-black"
                        />

                      </th>

                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Member
                      </th>

                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Product
                      </th>

                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>

                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Joined
                      </th>

                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Last Check-in
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredMembers.map(
                      (member) => (
                        <tr
                          key={member.id}
                          onClick={() =>
                            openMemberDetails(
                              member
                            )
                          }
                          className="group cursor-pointer border-b border-gray-100 transition hover:bg-gray-50/70"
                        >

                          {}

                          <td
                            className="px-5 py-4"
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                          >

                            <input
                              type="checkbox"
                              checked={selected.includes(
                                member.id
                              )}
                              onChange={() =>
                                toggleSelect(
                                  member.id
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 accent-black"
                            />

                          </td>

                          {}

                          <td className="px-3 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                                {member.avatar}
                              </div>

                              <div className="min-w-0">

                                <p className="block truncate text-sm font-semibold text-gray-900">
                                  {member.name}
                                </p>

                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                  {member.email}
                                </p>

                              </div>

                            </div>

                          </td>

                          {}

                          <td className="px-3 py-4">

                            <span className="text-sm text-gray-700">
                              {member.plan}
                            </span>

                          </td>

                          {}

                          <td className="px-3 py-4">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[member.status]}`}
                            >
                              {member.status}
                            </span>

                          </td>

                          {}

                          <td className="px-3 py-4 text-sm text-gray-500">
                            {member.joined}
                          </td>

                          {}

                          <td className="px-3 py-4 text-sm text-gray-500">
                            {member.lastCheckIn}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          {}

          {!loading &&
            !loadError &&
            filteredMembers.length >
              0 && (
              <div className="divide-y divide-gray-100 md:hidden">

                {filteredMembers.map(
                  (member) => (
                    <div
                      key={member.id}
                      onClick={() =>
                        openMemberDetails(
                          member
                        )
                      }
                      className="cursor-pointer p-4 transition hover:bg-gray-50"
                    >

                      <div className="flex items-start gap-3">

                        <div
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                        >

                          <input
                            type="checkbox"
                            checked={selected.includes(
                              member.id
                            )}
                            onChange={() =>
                              toggleSelect(
                                member.id
                              )
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-black"
                          />

                        </div>

                        <div className="flex min-w-0 flex-1 items-start gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                            {member.avatar}
                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="block truncate text-sm font-semibold text-gray-900">
                              {member.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {member.email}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-2">

                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[member.status]}`}
                              >
                                {member.status}
                              </span>

                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                                {member.plan}
                              </span>

                            </div>

                          </div>

                        </div>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 pl-7">

                        <div className="rounded-xl bg-gray-50 p-3">

                          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            Joined
                          </p>

                          <p className="mt-1 text-xs font-medium text-gray-700">
                            {member.joined}
                          </p>

                        </div>

                        <div className="rounded-xl bg-gray-50 p-3">

                          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            Last Check-in
                          </p>

                          <p className="mt-1 text-xs font-medium text-gray-700">
                            {member.lastCheckIn}
                          </p>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          {}

          {!loading &&
            !loadError &&
            filteredMembers.length ===
              0 && (
              <div className="px-5 py-16 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Search
                    size={20}
                    className="text-gray-400"
                  />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-gray-900">
                  No members found
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {members.length ===
                  0
                    ? "No members have been created yet."
                    : "Try changing your search or filters."}
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                    className="mt-4 text-sm font-semibold text-gray-900 underline"
                  >
                    Clear filters
                  </button>
                )}

              </div>
            )}

          {}

          {!loading &&
            !loadError &&
            filteredMembers.length >
              0 && (
              <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">

                <p className="text-xs text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    1–
                    {
                      filteredMembers.length
                    }
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-gray-700">
                    {
                      filteredMembers.length
                    }
                  </span>{" "}
                  members
                </p>

                <div className="flex items-center gap-1">

                  <button
                    type="button"
                    disabled
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-300"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <button
                    type="button"
                    className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white"
                  >
                    1
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-300"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>

                </div>

              </div>
            )}

        </div>

      </main>

      {}

      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeMemberDetails}
        >

          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {}

            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Member Details
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  View member information and actions
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeMemberDetails
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>

            </div>

            {}

            <div className="px-5 py-5">

              <div className="flex items-center gap-4">

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-white">
                  {
                    selectedMember.avatar
                  }
                </div>

                <div className="min-w-0">

                  <h3 className="truncate text-lg font-semibold text-gray-900">
                    {
                      selectedMember.name
                    }
                  </h3>

                  <p className="mt-1 truncate text-sm text-gray-500">
                    {
                      selectedMember.email
                    }
                  </p>

                  <div className="mt-2">

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[selectedMember.status]}`}
                    >
                      {
                        selectedMember.status
                      }
                    </span>

                  </div>

                </div>

              </div>

              {}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Email
                  </p>

                  <p className="mt-1.5 break-all text-sm font-medium text-gray-800">
                    {
                      selectedMember.email ||
                      "—"
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Phone
                  </p>

                  <p className="mt-1.5 text-sm font-medium text-gray-800">
                    {
                      selectedMember.phone ||
                      "—"
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Product
                  </p>

                  <p className="mt-1.5 text-sm font-medium text-gray-800">
                    {
                      selectedMember.plan
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Joined
                  </p>

                  <p className="mt-1.5 text-sm font-medium text-gray-800">
                    {
                      selectedMember.joined
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:col-span-2">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Last Check-in
                  </p>

                  <p className="mt-1.5 text-sm font-medium text-gray-800">
                    {
                      selectedMember.lastCheckIn
                    }
                  </p>

                </div>

              </div>

              {}

              {showDeleteConfirm && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

                  <p className="text-sm font-semibold text-red-700">
                    Delete this member?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600">
                    This action cannot be undone.
                  </p>

                  <div className="mt-3 flex items-center justify-end gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setShowDeleteConfirm(
                          false
                        )
                      }
                      className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          selectedMember.id
                        )
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>

                  </div>

                </div>
              )}

            </div>

            {}

            {!showDeleteConfirm && (
              <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">

                {}

                <button
                  type="button"
                  onClick={
                    closeMemberDetails
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  <X size={15} />
                  Close
                </button>

                {}

                <Link
                  href={`/members/${selectedMember.id}/edit`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
                >
                  <Edit3 size={15} />
                  Edit Member
                </Link>

                {}

                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      true
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Trash2 size={15} />
                  Delete Member
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {}

      {showSummaryModal &&
        importSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">

            <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Upload size={20} />
                  </div>

                  <div>

                    <h3 className="text-lg font-semibold text-gray-900">
                      CSV Import Summary
                    </h3>

                    <p className="text-xs text-gray-500">
                      Review import results and row details
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSummaryModal(
                      false
                    )
                    loadMembers()
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={18} />
                </button>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-center">

                  <span className="text-xs font-medium text-gray-500">
                    Processed
                  </span>

                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {
                      importSummary.total
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">

                  <span className="text-xs font-medium text-emerald-700">
                    Imported
                  </span>

                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {
                      importSummary.imported
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">

                  <span className="text-xs font-medium text-blue-700">
                    Updated
                  </span>

                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {
                      importSummary.updated
                    }
                  </p>

                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-center">

                  <span className="text-xs font-medium text-rose-700">
                    Failed
                  </span>

                  <p className="mt-1 text-xl font-bold text-rose-600">
                    {
                      importSummary.skipped
                    }
                  </p>

                </div>

              </div>

              {importSummary.failedRows
                .length > 0 && (
                <div className="mt-5">

                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Failed Rows & Reasons (
                    {
                      importSummary
                        .failedRows
                        .length
                    }
                    )
                  </h4>

                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-200 rounded-xl border border-gray-200 bg-gray-50 text-xs">

                    {importSummary.failedRows.map(
                      (
                        fail,
                        i
                      ) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-2 p-2.5"
                        >

                          <div>

                            <span className="font-semibold text-gray-800">
                              Row{" "}
                              {
                                fail.row
                              }
                            </span>

                            {fail.email && (
                              <span className="ml-1.5 text-gray-500">
                                (
                                {
                                  fail.email
                                }
                                )
                              </span>
                            )}

                          </div>

                          <span className="text-right font-medium text-red-600">
                            {
                              fail.reason
                            }
                          </span>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={() => {
                    setShowSummaryModal(
                      false
                    )
                    loadMembers()
                  }}
                  className="h-10 rounded-xl bg-gray-900 px-5 text-sm font-semibold text-white shadow transition hover:bg-gray-800"
                >
                  Done
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  )
}
