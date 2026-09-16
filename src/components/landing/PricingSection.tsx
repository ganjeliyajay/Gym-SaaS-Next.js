"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ArrowRight,
  Sparkles,
  Building2,
  Crown,
  Zap,
} from "lucide-react";

type BillingPeriod = "monthly" | "annual";

const plans = [
  {
    name: "Starter",
    subtitle: "Single Studio",
    icon: Zap,
    monthly: 119,
    annual: 99,
    description: "Everything you need to run a growing fitness studio.",
    features: [
      "Up to 250 active members",
      "Authorize.net checkout",
      "Dynamic legal waivers",
      "Camera QR scanner",
      "Member management",
      "Basic reporting",
    ],
    popular: false,
  },
  {
    name: "Growth Facility",
    subtitle: "Scaling Club",
    icon: Crown,
    monthly: 239,
    annual: 199,
    description: "Advanced tools for gyms ready to scale operations.",
    features: [
      "Unlimited active members",
      "Hardware door API",
      "Class calendar & SMS",
      "Custom subdomain",
      "Leaflet & poster QRs",
      "Full RBAC & team invites",
      "Advanced analytics",
    ],
    popular: true,
  },
  {
    name: "Franchise Enterprise",
    subtitle: "Multi-Location",
    icon: Building2,
    monthly: 479,
    annual: 399,
    description: "Complete infrastructure for multi-location fitness brands.",
    features: [
      "Everything in Growth",
      "Multi-location switching",
      "Super-admin impersonation",
      "MRR / ARR / ARPU telemetry",
      "Executive analytics",
      "Priority infrastructure",
      "Dedicated account manager",
    ],
    popular: false,
  },
];

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] =
    useState<BillingPeriod>("annual");

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-[#070b14] py-24 sm:py-28 lg:py-32"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/[0.045] blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1.5">
            <Sparkles className="h-3 w-3 text-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              Simple, Transparent Pricing
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
            Choose the plan that fits your{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              ambition.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            Start small, scale fast, and upgrade whenever your business is
            ready.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex rounded-2xl border border-white/[0.08] bg-white/[0.025] p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                billingPeriod === "monthly"
                  ? "bg-white/[0.08] text-white shadow-lg"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setBillingPeriod("annual")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
                billingPeriod === "annual"
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-500/15"
                  : "text-white/35 hover:text-white/60"
              }`}
            >
              Annual
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                  billingPeriod === "annual"
                    ? "bg-black/10 text-black"
                    : "bg-emerald-400/10 text-emerald-400"
                }`}
              >
                SAVE
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price =
              billingPeriod === "annual" ? plan.annual : plan.monthly;

            return (
              <div
                key={plan.name}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-500 sm:p-7 ${
                  plan.popular
                    ? "border-amber-400/30 bg-gradient-to-b from-amber-400/[0.08] via-white/[0.035] to-white/[0.02] shadow-[0_25px_90px_rgba(245,158,11,0.09)] lg:-translate-y-2"
                    : "border-white/[0.08] bg-white/[0.025] hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.04]"
                }`}
              >
                {/* Popular glow */}
                {plan.popular && (
                  <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-amber-400/[0.09] blur-[70px]" />
                )}

                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />

                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-300">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan icon */}
                <div className="relative">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                      plan.popular
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                        : "border-white/[0.08] bg-white/[0.04] text-white/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                {/* Plan title */}
                <div className="relative mt-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">
                    {plan.subtitle}
                  </p>

                  <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                    {plan.name}
                  </h3>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-white/35">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="relative mt-7 border-y border-white/[0.06] py-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black tracking-[-0.04em] text-white">
                      ${price}
                    </span>

                    <span className="mb-1.5 text-xs font-medium text-white/25">
                      / month
                    </span>
                  </div>

                  <p className="mt-2 text-[10px] text-white/25">
                    {billingPeriod === "annual"
                      ? "Billed annually"
                      : "Billed monthly"}
                  </p>
                </div>

                {/* CTA */}
                <Link
                  href="/register"
                  className={`relative mt-6 flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-xs font-extrabold transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/15 hover:-translate-y-0.5 hover:shadow-amber-500/25"
                      : "border border-white/10 bg-white/[0.04] text-white hover:border-amber-400/20 hover:bg-white/[0.07]"
                  }`}
                >
                  {plan.popular ? "Start Growing" : "Get Started"}

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {/* Features */}
                <div className="relative mt-7 flex-1">
                  <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-white/20">
                    Everything included
                  </p>

                  <div className="space-y-3">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-start gap-2.5"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                            plan.popular
                              ? "bg-amber-400/10"
                              : "bg-white/[0.05]"
                          }`}
                        >
                          <Check
                            className={`h-2.5 w-2.5 ${
                              plan.popular
                                ? "text-amber-400"
                                : "text-white/40"
                            }`}
                          />
                        </span>

                        <span className="text-xs leading-5 text-white/45">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom accent */}
                <div
                  className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent transition-all duration-500 ${
                    plan.popular
                      ? "w-2/3"
                      : "w-0 group-hover:w-1/2"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom reassurance */}
        <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center justify-center gap-3 text-center sm:flex-row">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            No hidden setup fees
          </div>

          <span className="hidden h-3 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            Upgrade anytime
          </div>

          <span className="hidden h-3 w-px bg-white/10 sm:block" />

          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            Built to scale
          </div>
        </div>
      </div>
    </section>
  );
}