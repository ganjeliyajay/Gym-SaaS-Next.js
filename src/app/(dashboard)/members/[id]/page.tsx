"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Edit3,
  FileCheck,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Member = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  status: string
  joined: string
  lastCheckIn: string
  avatar: string
}

type Product = {
  id?: string
  name: string
  price: string
  started: string
  nextBilling: string
  access: string
  status: string
}

type Payment = {
  id?: string
  date: string
  description: string
  amount: string
  status: string
  rawStatus?: string
}

type CheckIn = {
  date: string
  time: string
  location: string
}

type Waiver = {
  name: string
  signedAt: string
  snapshot?: any
}

export default function MemberDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const memberId = params.id as string

  const {
    success: toastSuccess,
    error: toastError,
    loading: toastLoading,
    dismiss,
  } = useToast()

  const [activeTab, setActiveTab] = useState("Overview")
  const [openMenu, setOpenMenu] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [member, setMember] = useState<Member | null>(null)
  const [activeProducts, setActiveProducts] = useState<Product[]>([])
  const [pastProducts, setPastProducts] = useState<Product[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [waivers, setWaivers] = useState<Waiver[]>([])

  const [gymId, setGymId] = useState("")
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [selectedAddProductId, setSelectedAddProductId] = useState("")
  const [addingProduct, setAddingProduct] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [cancellingProduct, setCancellingProduct] = useState(false)
  const [selectedWaiverModal, setSelectedWaiverModal] = useState<any>(null)

  useEffect(() => {
    if (!memberId) return

    const loadMember = async () => {
      try {
        setLoading(true)
        setError("")

        
        
        
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          throw new Error("You must be logged in.")
        }

        
        
        
        const { data: currentProfile, error: profileError } = await supabase
          .from("profiles")
          .select("gym_id, role")
          .eq("id", user.id)
          .single()

        if (profileError || !currentProfile?.gym_id) {
          throw new Error("Gym information not found.")
        }

        const currentGymId = currentProfile.gym_id

        
        
        
        
        const { data: memberRow, error: memberError } = await supabase
          .from("members")
          .select(`
            id,
            gym_id,
            first_name,
            last_name,
            email,
            phone,
            status,
            joined_at,
            created_at
          `)
          .eq("id", memberId)
          .eq("gym_id", currentGymId)
          .single()

        if (memberError || !memberRow) {
          throw new Error("Member not found.")
        }

        
        
        
        
        
        
        const { data: memberProfile, error: memberProfileError } =
          await supabase
            .from("profiles")
            .select("id, full_name, email, status, created_at")
            .eq("gym_id", currentGymId)
            .eq("role", "member")
            .or(
              `id.eq.${memberRow.id},email.eq.${memberRow.email}`,
            )
            .maybeSingle()

        if (memberProfileError) {
        }

        
        
        
        const { data: submission, error: submissionError } =
          await supabase
            .from("signup_submissions")
            .select(
              `
                id,
                customer_data,
                selected_product,
                waiver_accepted,
                waiver_snapshot,
                created_at
              `,
            )
            .eq("member_id", memberId)
            .eq("gym_id", currentGymId)
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle()

        if (submissionError) {
        }

        const customerData = (submission?.customer_data || {}) as Record<
          string,
          unknown
        >

        
        
        
        const getCustomerField = (keywords: string[]) => {
          const key = Object.keys(customerData).find((field) => {
            const normalized = field
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")

            return keywords.some((keyword) =>
              normalized.includes(keyword),
            )
          })

          return key ? String(customerData[key] ?? "") : ""
        }

        
        
        
        const firstName =
          memberRow.first_name ||
          getCustomerField(["firstname"])

        const lastName =
          memberRow.last_name ||
          getCustomerField(["lastname"])

        const profileFullName =
          memberProfile?.full_name || ""

        const fallbackFullName =
          getCustomerField(["fullname", "name"])

        const fullName =
          `${firstName} ${lastName}`.trim() ||
          profileFullName ||
          fallbackFullName

        let finalFirstName = firstName
        let finalLastName = lastName

        if (!finalFirstName && !finalLastName && fullName) {
          const parts = fullName.trim().split(/\s+/)

          finalFirstName = parts.shift() || ""
          finalLastName = parts.join(" ")
        }

        const phone =
          memberRow.phone ||
          getCustomerField([
            "phone",
            "phonenumber",
            "mobile",
            "mobilephone",
          ])

        const address = getCustomerField([
          "address",
          "streetaddress",
        ])

        const city = getCustomerField(["city"])

        const state = getCustomerField(["state"])

        const zip = getCustomerField([
          "zip",
          "zipcode",
          "postalcode",
        ])

        const email =
          memberRow.email ||
          memberProfile?.email ||
          getCustomerField(["email"])

        const displayName =
          `${finalFirstName} ${finalLastName}`.trim() ||
          profileFullName ||
          "Unnamed Member"

        const avatar =
          displayName
            .split(" ")
            .filter(Boolean)
            .map((part: string) =>
              part.charAt(0).toUpperCase(),
            )
            .join("")
            .slice(0, 2) || "M"

        const normalizedStatus = String(
          memberRow.status ||
            memberProfile?.status ||
            "pending",
        ).toLowerCase()

        const displayStatus =
          normalizedStatus === "active"
            ? "Active"
            : normalizedStatus === "inactive"
              ? "Inactive"
              : "Pending"

        const joinedDate =
          memberRow.joined_at ||
          memberRow.created_at ||
          memberProfile?.created_at

        
        
        
        setMember({
          id: memberRow.id,
          firstName: finalFirstName,
          lastName: finalLastName,
          email,
          phone,
          address,
          city,
          state,
          zip,
          status: displayStatus,
          joined: joinedDate
            ? new Date(joinedDate).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )
            : "—",
          lastCheckIn: "—",
          avatar,
        })

        
        
        
        const {
          data: latestPaymentRow,
          error: latestPaymentError,
        } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            currency,
            status,
            paid_at,
            created_at,
            product_id,
            products (
              id,
              name,
              price,
              billing_interval,
              access_type,
              visit_limit,
              active
            )
          `)
          .eq("member_id", memberId)
          .eq("gym_id", currentGymId)
          .eq("status", "paid")
          .order("paid_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

        if (latestPaymentError) {
        }

        let currentProductName = ""

        if (latestPaymentRow?.products) {
          const product = Array.isArray(
            latestPaymentRow.products,
          )
            ? latestPaymentRow.products[0]
            : latestPaymentRow.products

          currentProductName = product?.name || ""

          const startedDate =
            latestPaymentRow.paid_at ||
            latestPaymentRow.created_at

          setActiveProducts([
            {
              id: product?.id,
              name: currentProductName,
              price: `${latestPaymentRow.currency || "USD"} ${Number(
                latestPaymentRow.amount ||
                  product?.price ||
                  0,
              ).toFixed(2)}`,
              started: startedDate
                ? new Date(
                    startedDate,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
              nextBilling: "Monthly",
              access:
                product?.access_type === "full"
                  ? "Full Access"
                  : product?.access_type === "visits"
                    ? `${product?.visit_limit || 0} Visits`
                    : "Standard",
              status: "Active",
            },
          ])
        } else {
          setActiveProducts([])
        }

        
        
        
        const { data: signedWaiverRows } = await supabase
          .from("signed_waivers")
          .select(
            "id, waiver_name, resolved_content, signer_name, signed_at, signature_data",
          )
          .eq("member_id", memberId)
          .eq("gym_id", currentGymId)
          .order("signed_at", {
            ascending: false,
          })

        if (
          signedWaiverRows &&
          signedWaiverRows.length > 0
        ) {
          setWaivers(
            signedWaiverRows.map((sw: any) => ({
              name:
                sw.waiver_name ||
                "General Gym Waiver",
              signedAt: sw.signed_at
                ? new Date(
                    sw.signed_at,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
              snapshot: {
                name: sw.waiver_name,
                resolvedContent:
                  sw.resolved_content,
                signature: sw.signature_data,
                signer: sw.signer_name,
                date: sw.signed_at,
              },
            })),
          )
        } else if (
          submission?.waiver_accepted &&
          submission?.waiver_snapshot
        ) {
          const snapshot =
            submission.waiver_snapshot as Record<
              string,
              unknown
            >

          setWaivers([
            {
              name: String(
                snapshot.name ||
                  "General Gym Waiver",
              ),
              signedAt: submission.created_at
                ? new Date(
                    submission.created_at,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
              snapshot,
            },
          ])
        } else {
          setWaivers([])
        }

        
        
        
        const {
          data: paymentRows,
          error: paymentsError,
        } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            currency,
            status,
            paid_at,
            created_at,
            payment_type,
            product_id,
            products (
              name
            )
          `)
          .eq("member_id", memberId)
          .eq("gym_id", currentGymId)
          .order("created_at", {
            ascending: false,
          })

        if (paymentsError) {
        }

        const formattedPayments: Payment[] = (
          paymentRows || []
        ).map((payment: any) => {
          const product = Array.isArray(
            payment.products,
          )
            ? payment.products[0]
            : payment.products

          const paymentDate =
            payment.paid_at ||
            payment.created_at

          return {
            id: payment.id,
            date: paymentDate
              ? new Date(
                  paymentDate,
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—",
            description:
              product?.name ||
              (payment.payment_type === "recurring"
                ? "Membership Payment"
                : "Payment"),
            amount: `${payment.currency || "USD"} ${Number(
              payment.amount || 0,
            ).toFixed(2)}`,
            status: String(
              payment.status || "pending",
            )
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) =>
                char.toUpperCase(),
              ),
            rawStatus: payment.status,
          }
        })

        setPayments(formattedPayments)

        
        
        
        const {
          data: checkInRows,
          error: checkInsError,
        } = await supabase
          .from("checkins")
          .select(
            "id, checked_in_at, method",
          )
          .eq("member_id", memberId)
          .eq("gym_id", currentGymId)
          .order("checked_in_at", {
            ascending: false,
          })

        if (checkInsError) {
        }

        const formattedCheckIns: CheckIn[] = (
          checkInRows || []
        ).map((checkIn: any) => {
          const checkedAt = new Date(
            checkIn.checked_in_at,
          )

          return {
            date: checkedAt.toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            ),
            time: checkedAt.toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "2-digit",
              },
            ),
            location:
              checkIn.method === "qr"
                ? "QR Check-in"
                : checkIn.method === "gym_door"
                  ? "Gym Door"
                  : "Manual Check-in",
          }
        })

        setCheckIns(formattedCheckIns)

        
        
        
        const historicalProducts: Product[] = (
          paymentRows || []
        )
          .filter(
            (payment: any) =>
              payment.product_id &&
              payment.products,
          )
          .map((payment: any) => {
            const product = Array.isArray(
              payment.products,
            )
              ? payment.products[0]
              : payment.products

            return {
              id: payment.product_id,
              name:
                product?.name ||
                "Membership Product",
              price:
                payment.amount != null
                  ? `$${Number(
                      payment.amount,
                    ).toFixed(2)}`
                  : "$0.00",
              started: payment.created_at
                ? new Date(
                    payment.created_at,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—",
              nextBilling: "—",
              access: "Full Access",
              status: String(
                payment.status ||
                  "pending",
              )
                .replace(/_/g, " ")
                .replace(/\b\w/g, (char) =>
                  char.toUpperCase(),
                ),
            }
          })

        const uniquePastProducts =
          historicalProducts.filter(
            (product, index, all) =>
              product.name !==
                currentProductName &&
              all.findIndex(
                (item) =>
                  item.name === product.name,
              ) === index,
          )

        setPastProducts(
          uniquePastProducts,
        )

        
        
        
        const { data: prods } =
          await supabase
            .from("products")
            .select(
              "id, name, price, payment_type, billing_interval",
            )
            .eq("gym_id", currentGymId)
            .eq("active", true)

        setAvailableProducts(
          prods || [],
        )

        setGymId(currentGymId)
      } catch (err) {
        toastError(
          "We couldn't load this member right now. Please try again.",
        )

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load member.",
        )
      } finally {
        setLoading(false)
      }
    }

    loadMember()
  }, [memberId])

  
  
  
  const handleAddProduct = async () => {
    if (
      !selectedAddProductId ||
      !gymId ||
      !memberId ||
      addingProduct
    ) {
      return
    }

    setAddingProduct(true)

    const toastId = toastLoading(
      "Assigning product to member...",
    )

    try {
      const prod =
        availableProducts.find(
          (p) =>
            p.id === selectedAddProductId,
        )

      if (!prod) {
        dismiss(toastId)
        toastError(
          "Please select a product.",
        )
        return
      }

      const { error: payErr } =
        await supabase
          .from("payments")
          .insert({
            gym_id: gymId,
            member_id: memberId,
            product_id: prod.id,
            amount: Number(
              prod.price || 0,
            ),
            currency: "USD",
            payment_type:
              prod.payment_type ||
              "one-time",
            status: "paid",
            paid_at:
              new Date().toISOString(),
            payment_method:
              "Admin Added",
            metadata: {
              source:
                "admin_manual_assignment",
              product_name: prod.name,
            },
          })

      if (payErr) {
        throw payErr
      }

      const { error: memberUpdateError } =
        await supabase
          .from("members")
          .update({
            status: "active",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", memberId)
          .eq("gym_id", gymId)

      if (memberUpdateError) {
        throw memberUpdateError
      }

      setShowAddProduct(false)
      setSelectedAddProductId("")

      dismiss(toastId)

      toastSuccess(
        "Product assigned successfully.",
      )

      window.location.reload()
    } catch (err) {
      dismiss(toastId)

      toastError(
        "We couldn't assign the product. Please check the details and try again.",
      )
    } finally {
      setAddingProduct(false)
    }
  }

  
  
  
  const handleCancelProduct = async (
    productName: string,
  ) => {
    if (
      !gymId ||
      !memberId ||
      cancellingProduct
    ) {
      return
    }

    if (
      !confirm(
        `Are you sure you want to cancel ${productName}?`,
      )
    ) {
      return
    }

    setCancellingProduct(true)

    const toastId = toastLoading(
      "Cancelling product membership...",
    )

    try {
      const res = await fetch(
        "/api/billing/cancel-subscription",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            memberId,
            gymId,
          }),
        },
      )

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to cancel.",
        )
      }

      dismiss(toastId)

      toastSuccess(
        "Membership cancelled successfully.",
      )

      window.location.reload()
    } catch (err) {
      dismiss(toastId)

      toastError(
        "We couldn't cancel the membership. Please try again.",
      )
    } finally {
      setCancellingProduct(false)
    }
  }

  
  
  
  const handleRefund = async (
    paymentId: string,
  ) => {
    if (
      !paymentId ||
      !gymId ||
      refundingId
    ) {
      return
    }

    if (
      !confirm(
        "Are you sure you want to issue a refund for this transaction?",
      )
    ) {
      return
    }

    setRefundingId(paymentId)

    const toastId = toastLoading(
      "Processing refund...",
    )

    try {
      const res = await fetch(
        "/api/billing/refund",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            paymentId,
            gymId,
            reason:
              "Admin issued refund",
          }),
        },
      )

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(
          data.message ||
            "Refund failed.",
        )
      }

      dismiss(toastId)

      toastSuccess(
        "Refund processed successfully.",
      )

      window.location.reload()
    } catch (err) {
      dismiss(toastId)

      toastError(
        "We couldn't process the refund. Please try again.",
      )
    } finally {
      setRefundingId(null)
    }
  }

  
  
  
  const handleDeleteMember =
    async () => {
      if (!memberId || !gymId) {
        return
      }

      const toastId = toastLoading(
        "Deleting member...",
      )

      try {
        const response = await fetch(
          `/api/members/${memberId}`,
          {
            method: "DELETE",
          },
        )

        const result =
          await response.json()

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to delete member.",
          )
        }

        dismiss(toastId)

        toastSuccess(
          "Member deleted successfully.",
        )

        setShowDelete(false)

        router.replace("/members")
      } catch (err) {
        dismiss(toastId)

        toastError(
          "We couldn't delete this member. Please try again.",
        )
      }
    }

  const tabs = [
    "Overview",
    "Products",
    "Payments",
    "Check-ins",
    "Waivers",
  ]

  
  
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">
              Loading member...
            </p>
          </div>
        </div>
      </div>
    )
  }

  
  
  
  if (error || !member) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <X
              size={20}
              className="text-red-500"
            />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Member not found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {error ||
              "Unable to load this member."}
          </p>

          <Link
            href="/members"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white"
          >
            Back to Members
          </Link>
        </div>
      </div>
    )
  }

  const totalSpent =
    payments.reduce(
      (total, payment) => {
        const amount =
          Number(
            payment.amount.replace(
              /[^0-9.]/g,
              "",
            ),
          ) || 0

        return total + amount
      },
      0,
    )

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/members"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
              >
                <ArrowLeft size={18} />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Member Profile
                  </h1>

                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                    {member.status}
                  </span>
                </div>

                <p className="mt-0.5 text-sm text-gray-500">
                  View and manage member
                  information.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/members/${member.id}/edit`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Edit3 size={16} />
                Edit Member
              </Link>

              <button
                type="button"
                onClick={() =>
                  setOpenMenu(
                    !openMenu,
                  )
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                <MoreHorizontal
                  size={18}
                />

                {openMenu && (
                  <div className="absolute right-0 top-12 z-40 w-48 rounded-xl border border-gray-200 bg-white p-1.5 text-left shadow-xl">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Mail size={15} />
                      Send Email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(
                          false,
                        )
                        setShowAddProduct(
                          true,
                        )
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <CreditCard
                        size={15}
                      />
                      Add Product
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(
                          false,
                        )
                        setShowDelete(
                          true,
                        )
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2
                        size={15}
                      />
                      Delete Member
                    </button>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gray-900 px-5 py-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-gray-900">
                  {member.avatar}
                </div>

                <div className="min-w-0 text-white">
                  <h2 className="truncate text-2xl font-bold">
                    {member.firstName}{" "}
                    {member.lastName}
                  </h2>

                  <div className="mt-2 flex flex-col gap-1 text-sm text-gray-300 sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} />
                      {member.email}
                    </span>

                    <span className="hidden sm:block">
                      •
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Phone size={14} />
                      {member.phone ||
                        "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Member Since
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {member.joined}
                </p>
              </div>
            </div>
          </div>

          {}
          <div className="overflow-x-auto">
            <div className="flex min-w-max border-b border-gray-200 px-4 sm:px-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab)
                  }
                  className={`relative px-4 py-4 text-sm font-medium transition ${
                    activeTab === tab
                      ? "text-gray-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab}

                  {activeTab ===
                    tab && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gray-900" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {}
        {activeTab ===
          "Overview" && (
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              {}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">
                    Active Products
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {
                      activeProducts.length
                    }
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">
                    Check-ins
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {checkIns.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">
                    Payments
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {payments.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">
                    Total Spent
                  </p>

                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    $
                    {totalSpent.toFixed(
                      2,
                    )}
                  </p>
                </div>
              </div>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Active Product
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Current membership
                      and access.
                    </p>
                  </div>

                  <Link
                    href={`/members/${member.id}/edit`}
                    className="text-xs font-semibold text-gray-700 hover:text-gray-900"
                  >
                    Manage
                  </Link>
                </div>

                {activeProducts.length >
                0 ? (
                  activeProducts.map(
                    (product) => (
                      <div
                        key={
                          product.name
                        }
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                              <Dumbbell
                                size={
                                  18
                                }
                              />
                            </div>

                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {
                                  product.name
                                }
                              </h4>

                              <p className="mt-1 text-xs text-gray-500">
                                {
                                  product.price
                                }
                              </p>
                            </div>
                          </div>

                          <span className="w-fit rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                            {
                              product.status
                            }
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              Started
                            </p>

                            <p className="mt-1 text-xs font-medium text-gray-700">
                              {
                                product.started
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              Next Billing
                            </p>

                            <p className="mt-1 text-xs font-medium text-gray-700">
                              {
                                product.nextBilling
                              }
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wide text-gray-400">
                              Access
                            </p>

                            <p className="mt-1 text-xs font-medium text-gray-700">
                              {
                                product.access
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                    <Dumbbell
                      size={20}
                      className="mx-auto text-gray-400"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No active
                      product
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      This member has
                      no product
                      assigned.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setShowAddProduct(
                      true,
                    )
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <Plus size={16} />
                  Add Product
                </button>
              </section>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Recent
                      Check-ins
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Latest gym visits.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "Check-ins",
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-gray-700"
                  >
                    View All
                    <ChevronRight
                      size={14}
                    />
                  </button>
                </div>

                {checkIns.length >
                0 ? (
                  <div className="space-y-1">
                    {checkIns
                      .slice(0, 4)
                      .map(
                        (
                          checkIn,
                          index,
                        ) => (
                          <div
                            key={`${checkIn.date}-${index}`}
                            className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                                <Check
                                  size={
                                    15
                                  }
                                />
                              </div>

                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {
                                    checkIn.date
                                  }
                                </p>

                                <p className="text-xs text-gray-500">
                                  {
                                    checkIn.location
                                  }
                                </p>
                              </div>
                            </div>

                            <span className="text-xs font-medium text-gray-500">
                              {
                                checkIn.time
                              }
                            </span>
                          </div>
                        ),
                      )}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-6 text-center">
                    <p className="text-sm text-gray-500">
                      No check-ins
                      yet.
                    </p>
                  </div>
                )}
              </section>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Recent Payments
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Latest billing
                      activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(
                        "Payments",
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-gray-700"
                  >
                    View All
                    <ChevronRight
                      size={14}
                    />
                  </button>
                </div>

                {payments.length >
                0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Date
                          </th>

                          <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Description
                          </th>

                          <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Amount
                          </th>

                          <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {payments.map(
                          (
                            payment,
                          ) => (
                            <tr
                              key={`${payment.date}-${payment.description}`}
                              className="border-b border-gray-100 last:border-0"
                            >
                              <td className="py-3 text-xs text-gray-500">
                                {
                                  payment.date
                                }
                              </td>

                              <td className="py-3 text-xs font-medium text-gray-700">
                                {
                                  payment.description
                                }
                              </td>

                              <td className="py-3 text-right text-xs font-semibold text-gray-800">
                                {
                                  payment.amount
                                }
                              </td>

                              <td className="py-3 text-right">
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700">
                                  {
                                    payment.status
                                  }
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-6 text-center">
                    <CreditCard
                      size={20}
                      className="mx-auto text-gray-400"
                    />

                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No payments
                      yet
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Payment history
                      will appear
                      here.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {}
            <div className="space-y-6">
              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Contact Information
                  </h3>

                  <Link
                    href={`/members/${member.id}/edit`}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </Link>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail
                      size={16}
                      className="mt-0.5 text-gray-400"
                    />

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Email
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-700">
                        {member.email ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone
                      size={16}
                      className="mt-0.5 text-gray-400"
                    />

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Phone
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {member.phone ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="mt-0.5 text-gray-400"
                    />

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Address
                      </p>

                      <p className="mt-1 text-sm leading-5 text-gray-700">
                        {member.address ||
                          "—"}
                        <br />
                        {member.city ||
                          "—"}
                        {member.state
                          ? `, ${member.state}`
                          : ""}
                        {member.zip
                          ? ` ${member.zip}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Signed Waivers
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Member agreements.
                    </p>
                  </div>

                  <FileCheck
                    size={17}
                    className="text-gray-400"
                  />
                </div>

                {waivers.length >
                0 ? (
                  waivers.map(
                    (waiver) => (
                      <div
                        key={
                          waiver.name
                        }
                        className="rounded-xl border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                            <ShieldCheck
                              size={
                                16
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">
                              {
                                waiver.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Signed{" "}
                              {
                                waiver.signedAt
                              }
                            </p>
                          </div>

                          <Check
                            size={16}
                            className="ml-auto text-gray-700"
                          />
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-xl bg-gray-50 p-5 text-center">
                    <ShieldCheck
                      size={20}
                      className="mx-auto text-gray-400"
                    />

                    <p className="mt-2 text-sm text-gray-500">
                      No signed
                      waivers.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "Waivers",
                    )
                  }
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs font-semibold text-gray-600"
                >
                  View Waiver
                  <ChevronRight
                    size={13}
                  />
                </button>
              </section>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Account
                </h3>

                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Account Status
                    </span>

                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-700">
                      {member.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Last Check-in
                    </span>

                    <span className="text-xs font-medium text-gray-700">
                      {
                        member.lastCheckIn
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Member Since
                    </span>

                    <span className="text-xs font-medium text-gray-700">
                      {member.joined}
                    </span>
                  </div>
                </div>
              </section>

              {}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">
                  Quick Actions
                </h3>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowAddProduct(
                        true,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <CreditCard
                      size={16}
                    />
                    Add Product
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Mail size={16} />
                    Send Email
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <CalendarDays
                      size={16}
                    />
                    View Calendar
                  </button>
                </div>
              </section>

              {}
              <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-red-700">
                  Danger Zone
                </h3>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Deleting this member
                  removes their account
                  and member history.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowDelete(true)
                  }
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                  Delete Member
                </button>
              </section>
            </div>
          </div>
        )}

        {}
        {activeTab ===
          "Products" && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Member Products
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Active and past
                    memberships.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowAddProduct(
                      true,
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  <Plus size={16} />
                  Add Product
                </button>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Active
                </h4>

                {activeProducts.length >
                0 ? (
                  activeProducts.map(
                    (product) => (
                      <div
                        key={
                          product.name
                        }
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
                              <Dumbbell
                                size={
                                  18
                                }
                              />
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {
                                  product.name
                                }
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {
                                  product.price
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              {
                                product.status
                              }
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleCancelProduct(
                                  product.name,
                                )
                              }
                              disabled={
                                cancellingProduct
                              }
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancellingProduct
                                ? "Cancelling..."
                                : "Cancel Product"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No active
                    products.
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Past Products
                </h4>

                {pastProducts.length >
                0 ? (
                  pastProducts.map(
                    (product) => (
                      <div
                        key={
                          product.name
                        }
                        className="rounded-xl border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {
                                product.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {
                                product.started
                              }{" "}
                              —{" "}
                              {
                                product.nextBilling
                              }
                            </p>
                          </div>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
                            {
                              product.status
                            }
                          </span>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No past
                    products.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {}
        {activeTab ===
          "Payments" && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900">
                Payment History
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                All payments associated
                with this member.
              </p>
            </div>

            {payments.length >
            0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Date
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Description
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Amount
                      </th>

                      <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Status
                      </th>

                      <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map(
                      (payment) => (
                        <tr
                          key={`${payment.date}-${payment.description}`}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="py-4 text-sm text-gray-500">
                            {
                              payment.date
                            }
                          </td>

                          <td className="py-4 text-sm font-medium text-gray-800">
                            {
                              payment.description
                            }
                          </td>

                          <td className="py-4 text-sm font-semibold text-gray-900">
                            {
                              payment.amount
                            }
                          </td>

                          <td className="py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                payment.rawStatus ===
                                "refunded"
                                  ? "border border-amber-200 bg-amber-50 text-amber-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {
                                payment.status
                              }
                            </span>
                          </td>

                          <td className="py-4 text-right">
                            {payment.rawStatus ===
                              "paid" &&
                              payment.id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRefund(
                                      payment.id!,
                                    )
                                  }
                                  disabled={
                                    refundingId ===
                                    payment.id
                                  }
                                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                  {refundingId ===
                                  payment.id
                                    ? "Refunding..."
                                    : "Refund"}
                                </button>
                              )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-10 text-center">
                <CreditCard
                  size={22}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No payment history
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Payments will appear
                  here once billing is
                  connected.
                </p>
              </div>
            )}
          </div>
        )}

        {}
        {activeTab ===
          "Check-ins" && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900">
                Check-in History
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Member gym attendance
                history.
              </p>
            </div>

            {checkIns.length >
            0 ? (
              <div className="space-y-2">
                {checkIns.map(
                  (
                    checkIn,
                    index,
                  ) => (
                    <div
                      key={`${checkIn.date}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-gray-100 p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                          <Check
                            size={
                              16
                            }
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {
                              checkIn.date
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {
                              checkIn.location
                            }
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-medium text-gray-600">
                        {
                          checkIn.time
                        }
                      </span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 p-10 text-center">
                <Check
                  size={22}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No check-ins yet
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Check-in history
                  will appear once
                  the check-in module
                  is connected.
                </p>
              </div>
            )}
          </div>
        )}

        {}
        {activeTab ===
          "Waivers" && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-900">
                Signed Waivers
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Legal agreements
                signed by this
                member.
              </p>
            </div>

            {waivers.length >
            0 ? (
              waivers.map(
                (waiver) => (
                  <div
                    key={
                      waiver.name
                    }
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100">
                          <ShieldCheck
                            size={
                              19
                            }
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {
                              waiver.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            Signed on{" "}
                            {
                              waiver.signedAt
                            }
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedWaiverModal(
                            waiver,
                          )
                        }
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                      >
                        View Waiver
                      </button>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="rounded-xl bg-gray-50 p-10 text-center">
                <FileCheck
                  size={22}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No signed waivers
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Signed waivers will
                  appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {}
      {showAddProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <Plus size={18} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Assign Product to
                  Member
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Select a product to
                  assign to{" "}
                  {
                    member.firstName
                  }{" "}
                  {
                    member.lastName
                  }.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddProduct(
                    false,
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Select Gym Product
                </label>

                <select
                  value={
                    selectedAddProductId
                  }
                  onChange={(e) =>
                    setSelectedAddProductId(
                      e.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                >
                  <option value="">
                    -- Choose a
                    Product --
                  </option>

                  {availableProducts.map(
                    (prod) => (
                      <option
                        key={prod.id}
                        value={
                          prod.id
                        }
                      >
                        {prod.name} ($
                        {Number(
                          prod.price ||
                            0,
                        ).toFixed(
                          2,
                        )}) -{" "}
                        {
                          prod.payment_type
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selectedAddProductId && (
                <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                  Assigning this
                  product will mark
                  the member account
                  Active and create a
                  paid membership
                  record.
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowAddProduct(
                    false,
                  )
                }
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  !selectedAddProductId ||
                  addingProduct
                }
                onClick={
                  handleAddProduct
                }
                className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {addingProduct
                  ? "Assigning..."
                  : "Assign Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedWaiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {
                    selectedWaiverModal.name
                  }
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Signed on{" "}
                  {
                    selectedWaiverModal.signedAt
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedWaiverModal(
                    null,
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
              {selectedWaiverModal
                .snapshot
                ?.resolvedContent ||
                selectedWaiverModal
                  .snapshot
                  ?.content ||
                "Legal liability waiver signed by member during registration."}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setSelectedWaiverModal(
                    null,
                  )
                }
                className="h-10 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 size={18} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Delete member?
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  This will
                  permanently remove{" "}
                  <span className="font-semibold text-gray-700">
                    {
                      member.firstName
                    }{" "}
                    {
                      member.lastName
                    }
                  </span>{" "}
                  and their
                  account history.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    false,
                  )
                }
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowDelete(
                    false,
                  )
                }
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteMember
                }
                className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}