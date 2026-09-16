
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Check,
  CreditCard,
  CalendarDays,
  Clock3,
  Download,
  ShieldCheck,
  Sparkles,
  ReceiptText,
  X,
  Loader2,
  ShoppingBag,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/toast"

type Product = {
  id: string
  name: string
  description?: string | null
  price: number
  active?: boolean
  payment_type?: string | null
  billing_interval?: string | null
  duration_type?: string | null
  duration_value?: number | null
  duration_unit?: string | null
  access_type?: string | null
  visit_limit?: number | null
  class_access?: boolean | null
  selected_classes?: any[] | null
  discount_enabled?: boolean | null
  discount_value?: number | null
  discount_type?: string | null
}

type MembershipData = {
  member: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email?: string | null
    joined_at: string | null
    status: string | null
  }
  product: Product | null
  latestPayment: any | null
  payments: any[]
  memberships: any[]
}

type CardDetails = {
  cardNumber: string
  expirationDate: string
  cardCode: string
  zip: string
}

export default function MembershipPage() {
  const toast = useToast()

  const [data, setData] = useState<MembershipData | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null)

  const [purchasing, setPurchasing] = useState(false)

  const [purchaseCard, setPurchaseCard] = useState<CardDetails>({
    cardNumber: "",
    expirationDate: "",
    cardCode: "",
    zip: "",
  })

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [canceling, setCanceling] = useState(false)

  const [showUpdatePaymentModal, setShowUpdatePaymentModal] =
    useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)

  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: "",
    expirationDate: "",
    cardCode: "",
    zip: "",
  })

  const [showWaiverModal, setShowWaiverModal] = useState(false)
  const [waiverLoading, setWaiverLoading] = useState(false)

  const [signedWaiver, setSignedWaiver] = useState<{
    text: string
    signature: string
    date: string
  } | null>(null)

  useEffect(() => {
    loadMembershipData()
  }, [])

  async function loadMembershipData() {
    let mounted = true

    try {
      setLoading(true)
      setError("")

      const {
        data: auth,
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) {
        throw new Error(authError.message)
      }

      const user = auth.user

      if (!user) {
        throw new Error("Please sign in to view your membership.")
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("gym_id")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError) {
        throw new Error(profileError.message)
      }

      if (!profile?.gym_id) {
        throw new Error("Gym profile not found.")
      }

      const gymId = profile.gym_id

      let member: any = null
      let memberError: any = null

      const byAuthId = await supabase
        .from("members")
        .select(
          "id, first_name, last_name, email, joined_at, status, gym_id"
        )
        .eq("id", user.id)
        .eq("gym_id", gymId)
        .maybeSingle()

      member = byAuthId.data
      memberError = byAuthId.error

      if (memberError) {
        throw new Error(memberError.message)
      }

      if (!member && user.email) {
        const byEmail = await supabase
          .from("members")
          .select(
            "id, first_name, last_name, email, joined_at, status, gym_id"
          )
          .eq("gym_id", gymId)
          .ilike("email", user.email)
          .maybeSingle()

        if (byEmail.error) {
          throw new Error(byEmail.error.message)
        }

        member = byEmail.data
      }

      if (!member) {
        throw new Error(
          "Member record not found for your account."
        )
      }

      const {
        data: productRows,
        error: productError,
      } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          active,
          payment_type,
          billing_interval,
          duration_type,
          duration_value,
          duration_unit,
          access_type,
          visit_limit,
          class_access,
          selected_classes,
          discount_enabled,
          discount_value,
          discount_type
        `)
        .eq("gym_id", gymId)
        .eq("active", true)
        .order("price", { ascending: true })

      if (productError) {
        console.error(
          "Membership products error:",
          productError
        )
      }

      const {
        data: paymentRows,
        error: paymentsError,
      } = await supabase
        .from("payments")
        .select(
          `
            id,
            amount,
            currency,
            payment_type,
            status,
            paid_at,
            created_at,
            payment_method,
            product_id,
            membership_id,
            products(
              id,
              name,
              description,
              price,
              billing_interval,
              duration_type,
              duration_value,
              duration_unit,
              access_type,
              visit_limit,
              class_access,
              selected_classes,
              active
            )
          `
        )
        .eq("gym_id", gymId)
        .eq("member_id", member.id)
        .order("paid_at", {
          ascending: false,
          nullsFirst: false,
        })
        .order("created_at", {
          ascending: false,
        })

      if (paymentsError) {
        throw new Error(paymentsError.message)
      }

      const {
        data: membershipRows,
        error: membershipError,
      } = await supabase
        .from("member_memberships")
        .select(
          `
            id,
            product_id,
            status,
            price_paid,
            start_date,
            end_date,
            remaining_visits,
            classes_used_this_period,
            period_start_date,
            period_end_date,
            authorize_net_subscription_id,
            authorize_net_transaction_id,
            created_at,
            products(
              id,
              name,
              description,
              price,
              payment_type,
              billing_interval,
              duration_type,
              duration_value,
              duration_unit,
              access_type,
              visit_limit,
              class_access,
              selected_classes,
              active
            )
          `
        )
        .eq("gym_id", gymId)
        .eq("member_id", member.id)
        .order("created_at", {
          ascending: false,
        })

      if (membershipError) {
        console.error(
          "Member memberships query error:",
          membershipError
        )
      }

      const rows = paymentRows || []

      const paidPayments = rows.filter(
        (payment: any) => payment.status === "paid"
      )

      const activeMembership =
        (membershipRows || []).find(
          (membership: any) =>
            membership.status === "active" &&
            (
              !membership.end_date ||
              new Date(membership.end_date).getTime() >
              Date.now()
            )
        ) || null

      const latestPayment =
        paidPayments[0] || null

      const rawCurrentProduct =
        activeMembership?.products ||
        latestPayment?.products ||
        null

      const currentProduct: Product | null =
        Array.isArray(rawCurrentProduct)
          ? (rawCurrentProduct[0] as Product | undefined) || null
          : rawCurrentProduct
            ? (rawCurrentProduct as Product)
            : null

      if (mounted) {
        setData({
          member: {
            id: member.id,
            first_name: member.first_name,
            last_name: member.last_name,
            email: member.email,
            joined_at: member.joined_at,
            status: member.status,
          },
          product: currentProduct,
          latestPayment,
          payments: paidPayments,
          memberships: membershipRows || [],
        })

        setProducts(
          (productRows || []) as Product[]
        )

        setLoading(false)
      }
    } catch (err: any) {
      if (mounted) {
        const message =
          err?.message ||
          "Failed to load membership."

        setError(message)
        toast.error(message)
        setLoading(false)
      }
    }

    return () => {
      mounted = false
    }
  }

  function getProductPrice(product: Product) {
    let price = Number(product.price || 0)

    if (
      product.discount_enabled &&
      product.discount_value
    ) {
      if (
        product.discount_type ===
        "percentage"
      ) {
        price =
          price -
          (price *
            Number(product.discount_value)) /
          100
      } else {
        price = Math.max(
          0,
          price -
          Number(product.discount_value)
        )
      }
    }

    return Math.round(
      Math.max(0, price) * 100
    ) / 100
  }

  const openPurchaseModal = (
    product: Product
  ) => {
    setSelectedProduct(product)

    setPurchaseCard({
      cardNumber: "",
      expirationDate: "",
      cardCode: "",
      zip: "",
    })

    setShowPurchaseModal(true)
  }

  const closePurchaseModal = () => {
    if (purchasing) return

    setShowPurchaseModal(false)
    setSelectedProduct(null)

    setPurchaseCard({
      cardNumber: "",
      expirationDate: "",
      cardCode: "",
      zip: "",
    })
  }

  const handlePurchase = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (!selectedProduct) {
      toast.error(
        "Please select a membership plan."
      )
      return
    }

    const cardNumber =
      purchaseCard.cardNumber.replace(
        /\s/g,
        ""
      )

    const expirationDate =
      purchaseCard.expirationDate.trim()

    const cvv =
      purchaseCard.cardCode.trim()

    if (
      !cardNumber ||
      !expirationDate ||
      !cvv
    ) {
      toast.error(
        "Please provide card number, expiration date and CVV."
      )
      return
    }

    if (cardNumber.length < 13) {
      toast.error(
        "Please enter a valid card number."
      )
      return
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      toast.error(
        "Please enter a valid CVV."
      )
      return
    }

    if (
      !/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(
        expirationDate
      )
    ) {
      toast.error(
        "Expiration date must be in MM/YY format."
      )
      return
    }

    setPurchasing(true)

    try {
      const { data: auth } =
        await supabase.auth.getUser()

      const user = auth.user

      if (!user) {
        throw new Error(
          "Please sign in again."
        )
      }

      const amount =
        getProductPrice(selectedProduct)

      const isRecurring =
        selectedProduct.payment_type ===
        "recurring"

      const response = await fetch(
        "/api/billing/charge",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productId:
              selectedProduct.id,
            amount,
            cardNumber,
            expirationDate,
            cvv,
            isRecurring,
            customerDetails: {
              firstName:
                data?.member.first_name ||
                user.user_metadata
                  ?.first_name ||
                "Member",

              lastName:
                data?.member.last_name ||
                user.user_metadata
                  ?.last_name ||
                "Member",

              email:
                data?.member.email ||
                user.email ||
                "",

              zip:
                purchaseCard.zip || "",
            },
          }),
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
          result.error ||
          "Payment failed."
        )
      }

      const purchasedMembership = result.membership
        ? {
          ...result.membership,
          status: "active",
          products: selectedProduct,
        }
        : null

      if (purchasedMembership) {
        setData((prev) =>
          prev
            ? {
              ...prev,
              member: {
                ...prev.member,
                status: "active",
              },
              product: selectedProduct,
              latestPayment: result.payment || prev.latestPayment,
              payments: result.payment
                ? [result.payment, ...prev.payments.filter((payment: any) => payment.id !== result.payment.id)]
                : prev.payments,
              memberships: [
                purchasedMembership,
                ...prev.memberships.filter(
                  (membership: any) => membership.id !== purchasedMembership.id
                ),
              ],
            }
            : prev
        )
      }

      toast.success(
        "Membership purchased successfully!"
      )

      closePurchaseModal()

      await loadMembershipData()
    } catch (err: any) {
      toast.error(
        err?.message ||
        "Failed to purchase membership."
      )
    } finally {
      setPurchasing(false)
    }
  }

  const handleCancelMembership =
    async () => {
      const activeMembership =
        data?.memberships?.find(
          (membership: any) =>
            membership.status === "active" &&
            (
              !membership.end_date ||
              new Date(membership.end_date).getTime() >
              Date.now()
            )
        ) || null

      if (!activeMembership && !data?.latestPayment) {
        toast.error("No active membership found.")
        return
      }

      setCanceling(true)

      try {
        const subscriptionId =
          activeMembership?.authorize_net_subscription_id ||
          data?.latestPayment?.authorize_net_subscription_id ||
          null

        const res = await fetch(
          "/api/billing/cancel-subscription",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              memberId:
                data?.member?.id || undefined,
              paymentId:
                data?.latestPayment?.id || undefined,
              subscriptionId:
                subscriptionId || undefined,
              reason:
                "Cancelled by member via portal",
            }),
          }
        )

        const result =
          await res.json()

        if (!res.ok || !result.success) {
          throw new Error(
            result.message ||
            result.error ||
            "Failed to cancel membership."
          )
        }

        setData((prev) => {
          if (!prev) return prev

          return {
            ...prev,
            member: {
              ...prev.member,
              status: "inactive",
            },
            memberships: prev.memberships.map(
              (membership: any) =>
                membership.id === activeMembership?.id
                  ? {
                    ...membership,
                    status: "cancelled",
                  }
                  : membership
            ),
          }
        })

        toast.success(
          "Membership successfully cancelled."
        )

        setShowCancelModal(false)

        await loadMembershipData()
      } catch (err: any) {
        toast.error(
          err?.message ||
          "Failed to cancel membership."
        )
      } finally {
        setCanceling(false)
      }
    }

  const handleUpdatePaymentMethod =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault()

      const activeMembership =
        data?.memberships?.find(
          (membership: any) =>
            membership.status === "active" &&
            (
              !membership.end_date ||
              new Date(membership.end_date).getTime() >
              Date.now()
            )
        ) || null

      const cardNumber =
        cardDetails.cardNumber.replace(/\D/g, "")
      const expirationDate =
        cardDetails.expirationDate.replace(/\s/g, "")
      const cvv =
        cardDetails.cardCode.replace(/\D/g, "")
      const zip =
        cardDetails.zip.trim()

      if (
        cardNumber.length < 13 ||
        cardNumber.length > 19
      ) {
        toast.error(
          "Please enter a valid card number."
        )
        return
      }

      if (
        !/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(
          expirationDate
        )
      ) {
        toast.error(
          "Expiration date must be in MM/YY format."
        )
        return
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        toast.error(
          "Please enter a valid CVV."
        )
        return
      }

      if (!activeMembership?.authorize_net_subscription_id) {
        toast.error(
          "No active recurring subscription was found."
        )
        return
      }

      setUpdatingPayment(true)

      try {
        const res = await fetch(
          "/api/billing/update-payment-method",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              memberId:
                data?.member?.id || undefined,
              subscriptionId:
                activeMembership.authorize_net_subscription_id,
              cardNumber,
              expirationDate,
              cvv,
              zip,
            }),
          }
        )

        const result =
          await res.json()

        if (
          !res.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
            "Failed to update payment method."
          )
        }

        const masked =
          result.paymentMethod ||
          `Card ending in ${result.last4 || cardNumber.slice(-4)}`

        setData((prev) =>
          prev
            ? {
              ...prev,
              latestPayment: prev.latestPayment
                ? {
                  ...prev.latestPayment,
                  payment_method: masked,
                }
                : prev.latestPayment,
            }
            : null
        )

        toast.success(
          "Payment method successfully updated!"
        )

        setShowUpdatePaymentModal(
          false
        )

        setCardDetails({
          cardNumber: "",
          expirationDate: "",
          cardCode: "",
          zip: "",
        })
      } catch (err: any) {
        toast.error(
          err?.message ||
          "Failed to update payment method."
        )
      } finally {
        setUpdatingPayment(false)
      }
    }

  const loadAndShowWaiver =
    async () => {
      if (!data?.member?.id) return

      setWaiverLoading(true)
      setShowWaiverModal(true)

      try {
        const {
          data: signedRow,
        } = await supabase
          .from("signed_waivers")
          .select(
            "waiver_name, resolved_content, signer_name, signed_at, signature_data"
          )
          .eq(
            "member_id",
            data.member.id
          )
          .order("signed_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

        if (signedRow) {
          setSignedWaiver({
            text:
              signedRow.resolved_content,
            signature:
              signedRow.signature_data ||
              signedRow.signer_name ||
              "Electronic Signature On File",
            date:
              signedRow.signed_at,
          })
        } else {
          const {
            data: submission,
          } = await supabase
            .from("signup_submissions")
            .select(
              "waiver_snapshot, created_at"
            )
            .eq(
              "member_id",
              data.member.id
            )
            .order("created_at", {
              ascending: false,
            })
            .limit(1)
            .maybeSingle()

          if (
            submission?.waiver_snapshot
          ) {
            const snapshotText =
              typeof submission.waiver_snapshot ===
                "string"
                ? submission.waiver_snapshot
                : (
                  submission
                    .waiver_snapshot
                    ?.resolvedContent ||
                  submission
                    .waiver_snapshot
                    ?.content ||
                  JSON.stringify(
                    submission.waiver_snapshot,
                    null,
                    2
                  )
                )

            setSignedWaiver({
              text: snapshotText,
              signature:
                "Electronic Signature On File",
              date:
                submission.created_at ||
                data.member.joined_at ||
                new Date().toISOString(),
            })
          } else {
            setSignedWaiver({
              text:
                `STANDARD GYM MEMBERSHIP AGREEMENT & LIABILITY WAIVER\n\nI hereby understand and acknowledge that participation in gym training and fitness activities involves inherent risk. I acknowledge that I am physically capable of participating, assume all risk, and agree to abide by all gym rules.\n\nMember: ${capitalize(
                  data.member.status ||
                  "Active"
                )}\nJoined Date: ${formatDate(
                  data.member.joined_at
                )}`,
              signature:
                "Electronic Signature Verified",
              date:
                data.member.joined_at ||
                new Date().toISOString(),
            })
          }
        }
      } catch {
        setSignedWaiver({
          text:
            "Gym Liability Waiver & Membership Agreement on file.",
          signature:
            "Verified Electronic Signature",
          date:
            data.member.joined_at ||
            new Date().toISOString(),
        })
      } finally {
        setWaiverLoading(false)
      }
    }

  const latestPayment =
    data?.latestPayment || null

  const currentMembership =
    data?.memberships?.find(
      (membership: any) =>
        membership.status === "active" &&
        (
          !membership.end_date ||
          new Date(membership.end_date).getTime() > Date.now()
        )
    ) || null

  const currentMembershipProduct = Array.isArray(
    currentMembership?.products
  )
    ? currentMembership.products[0]
    : currentMembership?.products

  const product =
    currentMembershipProduct ||
    data?.product ||
    null

  const price =
    currentMembership?.price_paid ??
    latestPayment?.amount ??
    product?.price ??
    0

  const currency =
    latestPayment?.currency ||
    "USD"

  const billingLabel =
    getBillingLabel(
      product,
      latestPayment
    )

  const renewalDate =
    currentMembership?.end_date ||
    getRenewalDate(
      currentMembership?.start_date ||
      currentMembership?.period_start_date ||
      latestPayment?.paid_at ||
      latestPayment?.created_at,
      product,
      latestPayment
    )

  const benefits = useMemo(
    () => getBenefits(product),
    [product]
  )

  const hasActiveMembership =
    Boolean(currentMembership && product)

  const downloadReceipt = (
    payment: any
  ) => {
    const text = [
      "Payment Receipt",
      `Payment ID: ${payment.id}`,
      `Date: ${formatDate(
        payment.paid_at ||
        payment.created_at
      )}`,
      `Description: ${payment.products?.name ||
      "Membership payment"
      }`,
      `Amount: ${formatMoney(
        payment.amount,
        payment.currency
      )}`,
      `Status: ${payment.status}`,
    ].join("\n")

    const blob = new Blob(
      [text],
      {
        type: "text/plain",
      }
    )

    const url =
      URL.createObjectURL(blob)

    const anchor =
      document.createElement("a")

    anchor.href = url

    anchor.download = `receipt-${String(
      payment.id
    ).slice(0, 8)}.txt`

    document.body.appendChild(anchor)

    anchor.click()

    anchor.remove()

    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <StateCard
        message="Loading membership..."
      />
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={22} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Membership unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {error ||
              "Unable to load your membership."}
          </p>

          <Link
            href="/member"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!hasActiveMembership) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <Link
              href="/member"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <p className="text-sm font-medium text-gray-500">
              Member Area
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              Membership
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Choose a membership plan to get
              started.
            </p>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <ShoppingBag size={24} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-gray-900">
                Choose Your Membership
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                You don't currently have an active
                membership. Select one of the plans
                below to continue.
              </p>
            </div>

            {products.length === 0 ? (
              <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <AlertCircle
                  size={24}
                  className="mx-auto text-gray-400"
                />

                <p className="mt-3 text-sm font-medium text-gray-700">
                  No membership plans are
                  currently available.
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Please contact your gym to make
                  a membership plan available.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {products.map(
                  (membershipProduct) => {
                    const finalPrice =
                      getProductPrice(
                        membershipProduct
                      )

                    const productBenefits =
                      getBenefits(
                        membershipProduct
                      )

                    return (
                      <div
                        key={
                          membershipProduct.id
                        }
                        className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                              <Sparkles
                                size={12}
                              />
                              Membership
                            </div>

                            <h3 className="mt-4 text-lg font-bold text-gray-900">
                              {
                                membershipProduct.name
                              }
                            </h3>
                          </div>

                          {membershipProduct.payment_type ===
                            "recurring" && (
                              <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                                Recurring
                              </span>
                            )}
                        </div>

                        <p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500">
                          {membershipProduct.description ||
                            "Gym membership plan with access to available facilities and services."}
                        </p>

                        <div className="mt-5">
                          <span className="text-3xl font-bold text-gray-900">
                            {formatMoney(
                              finalPrice,
                              "USD"
                            )}
                          </span>

                          <span className="ml-1 text-sm text-gray-500">
                            {getBillingLabel(
                              membershipProduct,
                              null
                            )}
                          </span>
                        </div>

                        <div className="mt-5 space-y-2">
                          {productBenefits
                            .slice(0, 5)
                            .map(
                              (
                                benefit
                              ) => (
                                <div
                                  key={
                                    benefit
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
                                    <Check
                                      size={
                                        11
                                      }
                                    />
                                  </div>

                                  <span className="text-xs text-gray-600">
                                    {
                                      benefit
                                    }
                                  </span>
                                </div>
                              )
                            )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            openPurchaseModal(
                              membershipProduct
                            )
                          }
                          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                          <CreditCard
                            size={16}
                          />
                          Buy Membership
                        </button>
                      </div>
                    )
                  }
                )}
              </div>
            )}
          </div>
        </main>

        {showPurchaseModal &&
          selectedProduct && (
            <PurchaseModal
              product={selectedProduct}
              card={purchaseCard}
              setCard={setPurchaseCard}
              purchasing={purchasing}
              onClose={closePurchaseModal}
              onSubmit={handlePurchase}
              getProductPrice={
                getProductPrice
              }
            />
          )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/member"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>

          <div>
            <p className="text-sm font-medium text-gray-500">
              Member Area
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
              Membership
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your membership, benefits and
              billing history.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            { }
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="bg-gray-900 p-6 text-white sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                      <Sparkles size={13} />

                      {data.member.status ===
                        "active"
                        ? "Active Membership"
                        : `${capitalize(
                          data.member.status ||
                          "Membership"
                        )} Membership`}
                    </div>

                    <h2 className="mt-5 text-2xl font-bold">
                      {product?.name ||
                        "Membership"}
                    </h2>

                    <p className="mt-2 text-sm text-white/60">
                      {product?.description ||
                        "Your current membership plan and access details."}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-3xl font-bold">
                      {formatMoney(
                        price,
                        currency
                      )}
                    </p>

                    <p className="mt-1 text-sm text-white/50">
                      {billingLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <MembershipStat
                  icon={
                    <CalendarDays
                      size={18}
                    />
                  }
                  label="Started"
                  value={formatDate(
                    data.member.joined_at
                  )}
                />

                <MembershipStat
                  icon={
                    <Clock3 size={18} />
                  }
                  label="Renews"
                  value={
                    renewalDate
                      ? formatDate(
                        renewalDate
                      )
                      : "Not available"
                  }
                />

                <MembershipStat
                  icon={
                    <CreditCard
                      size={18}
                    />
                  }
                  label="Payment"
                  value={
                    latestPayment?.payment_method
                      ? capitalize(
                        String(
                          latestPayment.payment_method
                        )
                      )
                      : "Saved payment"
                  }
                />
              </div>
            </section>

            { }
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Membership Benefits
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Everything included in your
                  current plan.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {benefits.map(
                  (benefit) => (
                    <div
                      key={benefit}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
                        <Check size={14} />
                      </div>

                      <span className="text-sm font-medium text-gray-700">
                        {benefit}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>

            { }
            <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Billing History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Your recent membership payments.
                  </p>
                </div>

                <ReceiptText
                  size={20}
                  className="text-gray-400"
                />
              </div>

              {data.payments.length ===
                0 ? (
                <div className="mt-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No paid membership payments
                  found.
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        {[
                          "Invoice",
                          "Date",
                          "Description",
                          "Amount",
                          "Status",
                          "Action",
                        ].map(
                          (heading) => (
                            <th
                              key={
                                heading
                              }
                              className={`${heading ===
                                "Action"
                                ? "text-right "
                                : ""
                                }pb-3 text-xs font-semibold uppercase tracking-wider text-gray-400`}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.payments.map(
                        (
                          payment: any
                        ) => (
                          <tr
                            key={
                              payment.id
                            }
                          >
                            <td className="py-4 text-sm font-medium text-gray-900">
                              #
                              {String(
                                payment.id
                              )
                                .slice(
                                  0,
                                  8
                                )
                                .toUpperCase()}
                            </td>

                            <td className="py-4 text-sm text-gray-500">
                              {formatDate(
                                payment.paid_at ||
                                payment.created_at
                              )}
                            </td>

                            <td className="py-4 text-sm text-gray-600">
                              {payment
                                .products
                                ?.name ||
                                "Membership payment"}
                            </td>

                            <td className="py-4 text-sm font-medium text-gray-900">
                              {formatMoney(
                                payment.amount,
                                payment.currency
                              )}
                            </td>

                            <td className="py-4">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                <Check
                                  size={
                                    12
                                  }
                                />

                                {capitalize(
                                  payment.status
                                )}
                              </span>
                            </td>

                            <td className="py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadReceipt(
                                    payment
                                  )
                                }
                                aria-label="Download receipt"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Download
                                  size={
                                    15
                                  }
                                />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            { }
            {products.length > 1 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Other Membership Plans
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Available plans at your gym.
                    </p>
                  </div>

                  <ShoppingBag
                    size={20}
                    className="text-gray-400"
                  />
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {products
                    .filter(
                      (item) =>
                        item.id !==
                        product?.id
                    )
                    .map(
                      (item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                {item.description ||
                                  "Membership plan"}
                              </p>
                            </div>

                            <p className="text-sm font-bold text-gray-900">
                              {formatMoney(
                                getProductPrice(
                                  item
                                ),
                                "USD"
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openPurchaseModal(
                                item
                              )
                            }
                            className="mt-4 h-9 w-full rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Purchase Plan
                          </button>
                        </div>
                      )
                    )}
                </div>
              </section>
            )}
          </div>

          { }
          <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
            { }
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                <CalendarDays size={19} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Next Renewal
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Your membership renewal is based on
                your current membership plan.
              </p>

              <div className="mt-5 rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500">
                  Renewal Date
                </p>

                <p className="mt-1 text-lg font-bold text-gray-900">
                  {renewalDate
                    ? formatDate(
                      renewalDate
                    )
                    : "Not available"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {renewalDate
                    ? `${formatMoney(
                      price,
                      currency
                    )} based on your current membership payment.`
                    : "No renewal date is available."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCancelModal(
                    true
                  )
                }
                className="mt-4 h-10 w-full rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                Cancel Membership
              </button>
            </div>

            { }
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Payment Method
                </h3>

                <CreditCard
                  size={18}
                  className="text-gray-400"
                />
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
                  CARD
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {latestPayment?.payment_method
                      ? capitalize(
                        String(
                          latestPayment.payment_method
                        )
                      )
                      : "Saved payment method"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Securely handled through
                    Authorize.Net.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowUpdatePaymentModal(
                    true
                  )
                }
                className="mt-4 h-10 w-full rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Update Payment Method
              </button>
            </div>

            { }
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Legal Waivers
                </h3>

                <ShieldCheck
                  size={18}
                  className="text-gray-400"
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                View your electronically signed gym
                agreement & liability waiver.
              </p>

              <button
                type="button"
                onClick={
                  loadAndShowWaiver
                }
                className="mt-4 h-10 w-full rounded-xl border border-gray-200 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                View Signed Waiver
              </button>
            </div>

            { }
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Secure Billing
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Payment information is securely
                    handled through the configured
                    payment gateway.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      { }
      {showPurchaseModal &&
        selectedProduct && (
          <PurchaseModal
            product={selectedProduct}
            card={purchaseCard}
            setCard={setPurchaseCard}
            purchasing={purchasing}
            onClose={closePurchaseModal}
            onSubmit={handlePurchase}
            getProductPrice={
              getProductPrice
            }
          />
        )}

      { }
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Cancel Membership
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowCancelModal(
                    false
                  )
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Are you sure you want to cancel your{" "}
              <span className="font-semibold text-gray-900">
                {product?.name ||
                  "current plan"}
              </span>
              ?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowCancelModal(
                    false
                  )
                }
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep Membership
              </button>

              <button
                type="button"
                disabled={canceling}
                onClick={
                  handleCancelMembership
                }
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {canceling && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      { }
      {showUpdatePaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Update Payment Method
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowUpdatePaymentModal(
                    false
                  )
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Enter your new card details to update
              your billing method.
            </p>

            <form
              onSubmit={
                handleUpdatePaymentMethod
              }
              className="mt-5 space-y-4"
            >
              <CardFields
                card={cardDetails}
                setCard={setCardDetails}
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowUpdatePaymentModal(
                      false
                    )
                  }
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    updatingPayment
                  }
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {updatingPayment && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  Save New Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      { }
      {showWaiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Signed Liability Waiver
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowWaiverModal(
                    false
                  )
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {waiverLoading ? (
              <div className="flex justify-center py-12">
                <Loader2
                  size={28}
                  className="animate-spin text-gray-500"
                />
              </div>
            ) : signedWaiver ? (
              <div className="mt-4 space-y-4">
                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-700">
                  {signedWaiver.text}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                  <div>
                    <p className="text-xs text-gray-500">
                      Signature
                    </p>

                    <p className="font-serif text-sm font-semibold italic text-gray-900">
                      {
                        signedWaiver.signature
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Timestamp
                    </p>

                    <p className="text-xs font-medium text-gray-700">
                      {formatDate(
                        signedWaiver.date
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowWaiverModal(
                    false
                  )
                }
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PurchaseModal({
  product,
  card,
  setCard,
  purchasing,
  onClose,
  onSubmit,
  getProductPrice,
}: {
  product: Product
  card: CardDetails
  setCard: React.Dispatch<
    React.SetStateAction<CardDetails>
  >
  purchasing: boolean
  onClose: () => void
  onSubmit: (
    e: React.FormEvent
  ) => void
  getProductPrice: (
    product: Product
  ) => number
}) {
  const price =
    getProductPrice(product)

  const benefits =
    getBenefits(product)

  const recurring =
    product.payment_type ===
    "recurring"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-white">
                <CreditCard
                  size={17}
                />
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Buy Membership
                </h3>

                <p className="text-xs text-gray-500">
                  Secure payment
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={purchasing}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="p-5"
        >
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Selected Plan
                </p>

                <p className="mt-1 text-base font-bold text-gray-900">
                  {product.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {product.description ||
                    "Gym membership plan"}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">
                  {formatMoney(
                    price,
                    "USD"
                  )}
                </p>

                <p className="text-xs text-gray-500">
                  {getBillingLabel(
                    product,
                    null
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-gray-900">
              Plan Includes
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {benefits
                .slice(0, 6)
                .map(
                  (benefit) => (
                    <div
                      key={
                        benefit
                      }
                      className="flex items-center gap-2"
                    >
                      <Check
                        size={14}
                        className="text-gray-900"
                      />

                      <span className="text-xs text-gray-600">
                        {benefit}
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Card Details
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Your card is processed securely
                  through Authorize.Net.
                </p>
              </div>

              <ShieldCheck
                size={19}
                className="text-gray-500"
              />
            </div>

            <div className="mt-4">
              <CardFields
                card={card}
                setCard={setCard}
              />
            </div>
          </div>

          {recurring && (
            <div className="mt-4 flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <Clock3
                size={16}
                className="mt-0.5 shrink-0 text-gray-600"
              />

              <p className="text-xs leading-5 text-gray-600">
                This is a recurring membership.
                Your card will be billed according
                to the plan's billing schedule.
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
            <div>
              <p className="text-xs text-gray-500">
                Total
              </p>

              <p className="text-xl font-bold text-gray-900">
                {formatMoney(
                  price,
                  "USD"
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={purchasing}
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={purchasing}
                className="flex min-w-[145px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {purchasing ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard
                      size={16}
                    />
                    Pay & Join
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function CardFields({
  card,
  setCard,
}: {
  card: CardDetails
  setCard: React.Dispatch<
    React.SetStateAction<CardDetails>
  >
}) {
  const formatCardNumber = (
    value: string
  ) => {
    return value
      .replace(/\D/g, "")
      .slice(0, 19)
      .replace(/(.{4})/g, "$1 ")
      .trim()
  }

  const formatExpiry = (
    value: string
  ) => {
    const digits = value
      .replace(/\D/g, "")
      .slice(0, 4)

    return digits.length > 2
      ? `${digits.slice(0, 2)}/${digits.slice(2)}`
      : digits
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="membership-card-number"
          className="text-xs font-medium text-gray-700"
        >
          Card Number
        </label>
        <input
          id="membership-card-number"
          name="cardNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4000 0012 3456 7890"
          maxLength={23}
          value={card.cardNumber || ""}
          onChange={(e) => {
            const value = e.currentTarget.value
            setCard((prev) => ({
              ...prev,
              cardNumber: formatCardNumber(value),
            }))
          }}
          className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="membership-expiry"
            className="text-xs font-medium text-gray-700"
          >
            Expires
          </label>
          <input
            id="membership-expiry"
            name="expirationDate"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            maxLength={5}
            value={card.expirationDate || ""}
            onChange={(e) => {
              const value = e.currentTarget.value
              setCard((prev) => ({
                ...prev,
                expirationDate: formatExpiry(value),
              }))
            }}
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            required
          />
        </div>

        <div>
          <label
            htmlFor="membership-cvv"
            className="text-xs font-medium text-gray-700"
          >
            CVV
          </label>
          <input
            id="membership-cvv"
            name="cvv"
            type="tel"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={card.cardCode || ""}
            onChange={(e) => {
              const value = e.currentTarget.value
              setCard((prev) => ({
                ...prev,
                cardCode: value.replace(/\D/g, "").slice(0, 4),
              }))
            }}
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
            required
          />
        </div>

        <div>
          <label
            htmlFor="membership-zip"
            className="text-xs font-medium text-gray-700"
          >
            ZIP
          </label>
          <input
            id="membership-zip"
            name="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="90210"
            maxLength={10}
            value={card.zip || ""}
            onChange={(e) => {
              const value = e.currentTarget.value
              setCard((prev) => ({
                ...prev,
                zip: value.slice(0, 10),
              }))
            }}
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>
    </div>
  )
}

function getBenefits(
  product: any
): string[] {
  if (!product) {
    return ["Membership access"]
  }

  const benefits: string[] = []

  if (product.access_type) {
    benefits.push(
      `${capitalize(
        String(product.access_type)
      )} access`
    )
  }

  if (product.class_access === true) {
    benefits.push(
      "Access to group classes"
    )
  }

  if (
    Array.isArray(
      product.selected_classes
    ) &&
    product.selected_classes.length
  ) {
    benefits.push(
      `Access to ${product.selected_classes.length} selected classes`
    )
  }

  if (product.visit_limit != null) {
    benefits.push(
      `${product.visit_limit} visits included`
    )
  }

  if (!benefits.length) {
    benefits.push(
      "Membership access"
    )
  }

  return benefits
}

function getBillingLabel(
  product: any,
  payment: any
) {
  if (
    payment?.payment_type ===
    "one-time"
  ) {
    return "one-time"
  }

  if (product?.payment_type === "one-time") {
    return "one-time"
  }

  if (product?.billing_interval) {
    return `per ${String(
      product.billing_interval
    ).replace(
      /^1\s*/,
      ""
    )}`
  }

  if (
    product?.duration_value &&
    product?.duration_unit
  ) {
    return `per ${product.duration_value} ${product.duration_unit}`
  }

  if (
    product?.duration_type ===
    "limited" &&
    product?.duration_value &&
    product?.duration_unit
  ) {
    return `per ${product.duration_value} ${product.duration_unit}`
  }

  return "membership payment"
}

function getRenewalDate(
  date:
    | string
    | null
    | undefined,
  product: any,
  payment?: any
) {
  if (
    !date ||
    payment?.payment_type ===
    "one-time" ||
    product?.payment_type ===
    "one-time" ||
    product?.duration_type ===
    "one-time"
  ) {
    return null
  }

  const d = new Date(date)

  if (Number.isNaN(d.getTime())) {
    return null
  }

  const value = Number(
    product?.duration_value || 1
  )

  const unit = String(
    product?.duration_unit ||
    product?.billing_interval ||
    "month"
  ).toLowerCase()

  if (unit.includes("day")) {
    d.setDate(
      d.getDate() + value
    )
  } else if (
    unit.includes("week")
  ) {
    d.setDate(
      d.getDate() + value * 7
    )
  } else if (
    unit.includes("year")
  ) {
    d.setFullYear(
      d.getFullYear() + value
    )
  } else {
    d.setMonth(
      d.getMonth() + value
    )
  }

  return d.toISOString()
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "Not available"
  }

  const d = new Date(value)

  if (Number.isNaN(d.getTime())) {
    return "Not available"
  }

  return d.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }
  )
}

function formatMoney(
  value:
    | number
    | null
    | undefined,
  currency = "USD"
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency,
    }
  ).format(
    Number(value || 0)
  )
}

function capitalize(
  value: string
) {
  return (
    value.charAt(0).toUpperCase() +
    value
      .slice(1)
      .replace(
        /_/g,
        " "
      )
  )
}

function StateCard({
  message,
  error = false,
}: {
  message: string
  error?: boolean
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <p
          className={`text-sm ${error
            ? "text-red-600"
            : "text-gray-500"
            }`}
        >
          {message}
        </p>
      </div>
    </div>
  )
}

function MembershipStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
        {icon}
      </div>

      <div>
        <p className="text-xs text-gray-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  )
}
