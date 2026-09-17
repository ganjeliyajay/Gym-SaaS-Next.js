"use client"

import Link from "next/link"
import { Check, Crown, Sparkles, Zap } from "lucide-react"
import { useState } from "react"

type BillingCycle = "monthly" | "yearly"

const plans = [
  {
    name: "Starter",
    label: "For small gyms",
    monthly: 999,
    yearly: 9990,
    description:
      "Everything you need to organize the core operations of a growing gym.",
    icon: Zap,
    features: [
      "Member management",
      "Membership management",
      "Attendance tracking",
      "Basic payment tracking",
      "Basic dashboard",
      "1 admin account",
    ],
  },
  {
    name: "Growth",
    label: "For growing gyms",
    monthly: 2999,
    yearly: 29990,
    description:
      "Powerful tools for gyms that are ready to streamline operations and grow.",
    icon: Sparkles,
    popular: true,
    features: [
      "Everything in Starter",
      "Advanced dashboard",
      "Classes & scheduling",
      "Team & trainer management",
      "Role-based access",
      "Advanced payment management",
      "Business insights",
    ],
  },
  {
    name: "Pro",
    label: "For serious growth",
    monthly: 6999,
    yearly: 69990,
    description:
      "A complete operational platform for larger and more ambitious fitness businesses.",
    icon: Crown,
    features: [
      "Everything in Growth",
      "Advanced analytics",
      "Advanced team controls",
      "Priority features",
      "Scalable gym operations",
      "Premium management tools",
      "Built for multi-workflow operations",
    ],
  },
]

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(price)

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-orange-500/[0.045] blur-[150px]" />

      <div className="pointer-events-none absolute bottom-0 left-[-10%] h-96 w-96 rounded-full bg-red-500/[0.03] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
           ===================================================== */}

        <div
          data-reveal
          className="mx-auto max-w-3xl text-center reveal-hidden"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            <Sparkles className="h-4 w-4" />
            Simple pricing
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Growth Plan.
            </span>
          </h2>

          <p className="mt-6 text-base leading-7 text-white/50 sm:text-lg">
            Start with the tools you need today and upgrade as your gym grows.
          </p>
        </div>

        {/* =====================================================
            BILLING TOGGLE
           ===================================================== */}

        <div
          data-reveal
          className="mt-10 flex justify-center reveal-hidden"
          style={{ transitionDelay: "100ms" }}
        >
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.035] p-1.5 shadow-xl backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                billingCycle === "monthly"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                billingCycle === "yearly"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Yearly
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                  billingCycle === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-orange-500/10 text-orange-400"
                }`}
              >
                Save
              </span>
            </button>
          </div>
        </div>

        {/* =====================================================
            PRICING CARDS
           ===================================================== */}

        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            const price =
              billingCycle === "monthly" ? plan.monthly : plan.yearly

            return (
              <article
                key={plan.name}
                data-reveal
                className={`group relative flex flex-col rounded-[2rem] p-[1px] reveal-hidden ${
                  plan.popular
                    ? "bg-gradient-to-b from-orange-400 via-orange-500/50 to-red-600/20 shadow-2xl shadow-orange-500/10 lg:scale-[1.035] lg:z-10"
                    : "bg-white/10"
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <div
                  className={`relative flex h-full flex-col overflow-hidden rounded-[calc(2rem-1px)] p-6 sm:p-8 ${
                    plan.popular
                      ? "bg-gradient-to-b from-orange-500/[0.09] via-black to-black"
                      : "bg-gradient-to-b from-white/[0.05] to-white/[0.02]"
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-orange-500/20">
                      <Crown className="h-3 w-3" />
                      Most Popular
                    </div>
                  )}

                  {/* Glow */}
                  <div
                    className={`pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full blur-3xl ${
                      plan.popular
                        ? "bg-orange-500/15"
                        : "bg-orange-500/0 group-hover:bg-orange-500/10"
                    } transition-all duration-500`}
                  />

                  {/* Icon */}
                  <div
                    className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${
                      plan.popular
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "border border-white/10 bg-white/[0.05] text-orange-400"
                    } transition-all duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Plan Name */}
                  <div className="relative mt-6">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                      {plan.label}
                    </p>

                    <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                      {plan.name}
                    </h3>

                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/40">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="relative mt-7 border-y border-white/10 py-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                        ₹{formatPrice(price)}
                      </span>

                      <span className="mb-1 text-sm text-white/35">
                        /{billingCycle === "monthly" ? "month" : "year"}
                      </span>
                    </div>

                    {billingCycle === "yearly" && (
                      <p className="mt-2 text-xs font-semibold text-orange-400">
                        Annual billing
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href="/register"
                    className={`relative mt-7 flex items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold transition-all duration-300 ${
                      plan.popular
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5 hover:shadow-orange-500/30"
                        : "border border-white/10 bg-white/[0.05] text-white hover:border-orange-500/25 hover:bg-orange-500/10"
                    }`}
                  >
                    Start with {plan.name}
                  </Link>

                  {/* Features */}
                  <div className="relative mt-8 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/30">
                      What&apos;s included
                    </p>

                    <ul className="mt-5 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm text-white/55"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                            <Check className="h-3 w-3 text-orange-400" />
                          </span>

                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* =====================================================
            BOTTOM NOTE
           ===================================================== */}

        <div
          data-reveal
          className="mx-auto mt-10 max-w-3xl text-center reveal-hidden"
          style={{ transitionDelay: "350ms" }}
        >
          <p className="text-xs leading-6 text-white/30">
            Plans shown above are presented in Indian Rupees (INR). Choose the
            plan that matches your current gym operations and scale as your
            requirements grow.
          </p>
        </div>
      </div>
    </section>
  )
}
