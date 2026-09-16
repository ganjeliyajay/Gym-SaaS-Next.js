"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useToast } from "@/components/ui/toast"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Crown,
  ExternalLink,
  HelpCircle,
  Lock,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

type BillingCycle = "Monthly" | "Yearly"

type Plan = {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  popular: boolean
  features: string[]
}

type Subscription = {
  id: string
  plan_id: string
  billing_cycle: "monthly" | "yearly"
  status: string
  next_billing_date: string | null
  payment_method_brand: string | null
  payment_method_last4: string | null
  payment_method_expiry: string | null
}

type Invoice = {
  id: string
  amount: number
  currency: string
  status: string
  invoice_date: string
  invoice_number: string | null
}

export default function BillingPlansPage() {
  const toast = useToast()

  const [billingCycle, setBillingCycle] =
    useState<BillingCycle>("Monthly")
  const [showCancelModal, setShowCancelModal] =
    useState(false)
  const [showPaymentMenu, setShowPaymentMenu] =
    useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] =
    useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("gym_id, role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        throw (
          profileError ||
          new Error("Profile not found")
        )
      }

      setGymId(profile.gym_id)

      const [
        {
          data: planRows,
          error: plansError,
        },
        {
          data: subscriptionRow,
          error: subscriptionError,
        },
        {
          data: invoiceRows,
          error: invoicesError,
        },
      ] = await Promise.all([
        supabase
          .from("saas_plans")
          .select(
            "id,name,description,monthly_price,yearly_price,popular,features",
          )
          .eq("active", true)
          .order("monthly_price"),
        supabase
          .from("gym_subscriptions")
          .select(
            "id,plan_id,billing_cycle,status,next_billing_date,payment_method_brand,payment_method_last4,payment_method_expiry",
          )
          .eq("gym_id", profile.gym_id)
          .maybeSingle(),
        supabase
          .from("gym_subscription_invoices")
          .select(
            "id,amount,currency,status,invoice_date,invoice_number",
          )
          .eq("gym_id", profile.gym_id)
          .order("invoice_date", {
            ascending: false,
          })
          .limit(3),
      ])

      if (plansError) throw plansError
      if (subscriptionError) throw subscriptionError
      if (invoicesError) throw invoicesError

      setPlans(
        (planRows || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          monthlyPrice: Number(p.monthly_price),
          yearlyPrice: Number(p.yearly_price),
          popular: Boolean(p.popular),
          features: Array.isArray(p.features)
            ? p.features
            : [],
        })),
      )

      setSubscription(
        subscriptionRow as Subscription | null,
      )

      setInvoices(
        (invoiceRows || []) as Invoice[],
      )

      if (
        subscriptionRow?.billing_cycle ===
        "yearly"
      ) {
        setBillingCycle("Yearly")
      }
    } catch (error) {
      console.error(
        "Failed to load billing plans:",
        error,
      )
      toast.error(
        "Failed to load billing data",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const currentPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          plan.id === subscription?.plan_id,
      ) || null,
    [plans, subscription],
  )

  const choosePlan = async (plan: Plan) => {
    if (
      !gymId ||
      !subscription ||
      subscription.status === "cancelled"
    ) {
      toast.warning(
        "No active subscription is configured yet",
      )
      return
    }

    if (plan.id === subscription.plan_id) return

    const toastId = toast.loading(
      `Selecting ${plan.name} plan...`,
    )

    try {
      setActionLoading(true)

      const { error } = await supabase
        .from("gym_subscriptions")
        .update({
          plan_id: plan.id,
          billing_cycle:
            billingCycle.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("gym_id", gymId)

      if (error) throw error

      await loadData()

      toast.dismiss(toastId)
      toast.success(
        `${plan.name} plan selected`,
      )
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error(
        error?.message ||
        "Unable to change plan",
      )
    } finally {
      setActionLoading(false)
    }
  }

  const cancelSubscription = async () => {
    if (!subscription || !gymId) return

    const toastId = toast.loading(
      "Cancelling subscription...",
    )

    try {
      setActionLoading(true)

      const { error } = await supabase
        .from("gym_subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("gym_id", gymId)

      if (error) throw error

      setShowCancelModal(false)

      await loadData()

      toast.dismiss(toastId)
      toast.success(
        "Subscription cancelled",
      )
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error(
        error?.message ||
        "Unable to cancel subscription",
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] text-sm text-gray-500">
        Loading billing...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/billing"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </Link>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-500">
              Subscription
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Plans & Billing
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage your gym subscription,
              billing cycle and payment method.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-gray-200 bg-white p-1">
            {(
              ["Monthly", "Yearly"] as BillingCycle[]
            ).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() =>
                  setBillingCycle(cycle)
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${billingCycle === cycle
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-900"
                  }`}
              >
                {cycle}

                {cycle === "Yearly" && (
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                    Save 17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {currentPlan && subscription && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                  <Crown className="h-5 w-5" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {currentPlan.name} Plan
                    </h2>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-600">
                      {subscription.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    Your subscription status is
                    stored for this gym.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>
                      Next billing:{" "}
                      <strong className="text-gray-900">
                        {subscription.next_billing_date
                          ? new Date(
                            subscription.next_billing_date,
                          ).toLocaleDateString()
                          : "Not configured"}
                      </strong>
                    </span>

                    <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block" />

                    <span>
                      Amount:{" "}
                      <strong className="text-gray-900">
                        ₹
                        {(
                          billingCycle ===
                            "Monthly"
                            ? currentPlan.monthlyPrice
                            : currentPlan.yearlyPrice
                        ).toLocaleString("en-IN")}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {subscription.status !==
                "cancelled" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      setShowCancelModal(true)
                    }
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:w-auto"
                  >
                    Cancel subscription
                  </button>
                )}
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Choose a plan
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Plans are loaded from the SaaS
              plan catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                price={
                  billingCycle === "Monthly"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice
                }
                billingCycle={billingCycle}
                current={
                  plan.id ===
                  subscription?.plan_id
                }
                disabled={actionLoading}
                onAction={() =>
                  choosePlan(plan)
                }
              />
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Payment method
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Stored payment-method metadata
                  only; full card numbers are never
                  stored.
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setShowPaymentMenu(
                      (value) => !value,
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {showPaymentMenu && (
                  <div className="absolute right-0 top-10 z-10 w-52 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                    <Link
                      href="/billing"
                      className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Back to billing
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                <CreditCard className="h-5 w-5 text-gray-700" />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {subscription?.payment_method_brand &&
                    subscription.payment_method_last4
                    ? `${subscription.payment_method_brand} ending in ${subscription.payment_method_last4}`
                    : "No payment method configured"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {subscription?.payment_method_expiry
                    ? `Expires ${subscription.payment_method_expiry}`
                    : "Connect a payment provider to manage cards."}
                </p>
              </div>

              {subscription?.payment_method_last4 && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  Default
                </span>
              )}
            </div>

            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-400">
              <Lock className="h-4 w-4" />
              Provider managed
            </span>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Billing history
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Recent subscription invoices and
                  payments.
                </p>
              </div>

              <Link
                href="/billing/transactions"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                View all →
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {invoices.length ? (
              invoices.map((invoice) => (
                <BillingRow
                  key={invoice.id}
                  date={new Date(
                    invoice.invoice_date,
                  ).toLocaleDateString()}
                  description={
                    invoice.invoice_number ||
                    currentPlan?.name ||
                    "Subscription"
                  }
                  amount={`₹${Number(
                    invoice.amount,
                  ).toLocaleString("en-IN")}`}
                  status={invoice.status}
                />
              ))
            ) : (
              <div className="px-5 py-8 text-sm text-gray-500 sm:px-6">
                No subscription invoices
                recorded yet.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Secure billing
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Only subscription metadata is
                stored in Supabase. Full card
                numbers should remain with your
                payment provider.
              </p>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  SSL encrypted
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Secure payments
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <CircleHelp className="h-5 w-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Need help with billing?
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Connect your payment provider
                before enabling live subscription
                collection.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showCancelModal && (
        <CancelModal
          onClose={() =>
            !actionLoading &&
            setShowCancelModal(false)
          }
          onConfirm={cancelSubscription}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

function PlanCard({
  plan,
  price,
  billingCycle,
  current,
  disabled,
  onAction,
}: {
  plan: Plan
  price: number
  billingCycle: BillingCycle
  current: boolean
  disabled: boolean
  onAction: () => void
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white ${plan.popular
          ? "border-gray-900 shadow-lg"
          : "border-gray-200"
        }`}
    >
      {plan.popular && (
        <div className="absolute left-5 top-0 -translate-y-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Most popular
          </span>
        </div>
      )}

      <div className="border-b border-gray-100 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {plan.name}
            </h3>

            <p className="mt-2 min-h-[40px] text-sm leading-5 text-gray-500">
              {plan.description}
            </p>
          </div>

          {plan.popular && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Zap className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-6 flex items-end gap-1">
          <span className="text-3xl font-bold tracking-tight text-gray-900">
            ₹{price.toLocaleString("en-IN")}
          </span>

          <span className="mb-1 text-sm text-gray-400">
            /
            {billingCycle === "Monthly"
              ? "month"
              : "year"}
          </span>
        </div>

        {billingCycle === "Yearly" && (
          <p className="mt-2 text-xs font-medium text-emerald-600">
            Save approximately 17% with yearly
            billing
          </p>
        )}

        <button
          type="button"
          disabled={current || disabled}
          onClick={onAction}
          className={`mt-6 flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition ${current
              ? "cursor-default border border-gray-200 bg-gray-100 text-gray-500"
              : "bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            }`}
        >
          {current ? "Current plan" : "Choose plan"}
        </button>
      </div>

      <div className="flex-1 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
          What's included
        </p>

        <ul className="space-y-3">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm text-gray-600"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-3 w-3" />
              </span>

              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function BillingRow({
  date,
  description,
  amount,
  status,
}: {
  date: string
  description: string
  amount: string
  status: string
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <CreditCard className="h-4 w-4" />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">
            {description}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {date}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 sm:justify-end">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">
            {amount}
          </p>

          <span className="text-xs font-medium capitalize text-emerald-600">
            {status}
          </span>
        </div>
      </div>
    </div>
  )
}

function CancelModal({
  onClose,
  onConfirm,
  loading,
}: {
  onClose: () => void
  onConfirm: () => void
  loading: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <CircleHelp className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Cancel subscription?
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                The subscription status will be
                changed to cancelled.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

              <p className="text-xs leading-5 text-amber-800">
                For live payment cancellation,
                also cancel the subscription at the
                connected payment provider.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700"
            >
              Keep subscription
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white"
            >
              {loading
                ? "Cancelling..."
                : "Confirm cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}