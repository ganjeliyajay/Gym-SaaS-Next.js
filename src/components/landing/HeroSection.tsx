"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Zap,
} from "lucide-react";

const stats = [
  {
    value: "99.98%",
    label: "Door Uptime SLA",
  },
  {
    value: "$24M+",
    label: "Processed Volume",
  },
  {
    value: "< 40ms",
    label: "Door Unlock Latency",
  },
  {
    value: "100%",
    label: "Digital Waivers",
  },
];

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-[#070b14]">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-500/[0.10] blur-[140px]" />

        <div className="absolute -left-40 top-[280px] h-[350px] w-[350px] rounded-full bg-orange-500/[0.06] blur-[120px]" />

        <div className="absolute -right-40 top-[420px] h-[350px] w-[350px] rounded-full bg-yellow-500/[0.05] blur-[120px]" />
      </div>

      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-7 flex justify-center">
            <div className="group inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.07] px-3 py-1.5 shadow-[0_0_30px_rgba(245,158,11,0.05)] backdrop-blur-xl transition hover:border-amber-400/35 hover:bg-amber-400/[0.10]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-[11px]">
                Built for Modern Gyms, Martial Arts Dojos & CrossFit Boxes
              </span>

              <ChevronRight className="h-3.5 w-3.5 text-amber-400/50 transition group-hover:translate-x-0.5" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            The Complete Operating System
            <br className="hidden sm:block" />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                for Elite Athletic Clubs
              </span>

              <span className="absolute -bottom-2 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent blur-[1px]" />
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-white/45 sm:text-base sm:leading-8">
            Run your entire fitness business from one powerful platform.
            Manage members, recurring billing, digital waivers, access
            control, team permissions, and executive analytics without
            stitching together multiple systems.
          </p>

          {/* CTA */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-400 via-amber-400 to-orange-500 px-6 py-3.5 text-sm font-extrabold text-black shadow-[0_15px_45px_rgba(245,158,11,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(245,158,11,0.28)] sm:w-auto"
            >
              <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />

              <Zap className="relative h-4 w-4" />
              <span className="relative">Explore Live Gym Console</span>

              <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/signup/ironpulse/form_vip_onboarding"
              target="_blank"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-3.5 text-sm font-bold text-white/75 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-amber-400/25 hover:bg-white/[0.06] hover:text-white sm:w-auto"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
              Test Public Signup Funnel
              <ArrowRight className="h-4 w-4 text-white/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-amber-400" />
            </Link>
          </div>

          {/* Trust line */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
              Secure Infrastructure
            </span>

            <span className="hidden h-3 w-px bg-white/10 sm:block" />

            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400/70" />
              Built for Scale
            </span>

            <span className="hidden h-3 w-px bg-white/10 sm:block" />

            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-blue-400/70" />
              Recurring Payments
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="grid overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`group relative px-5 py-6 text-center transition duration-300 hover:bg-white/[0.035] ${
                  index !== stats.length - 1
                    ? "border-b border-white/[0.07] sm:border-r lg:border-b-0"
                    : ""
                }`}
              >
                <div className="absolute left-1/2 top-0 h-px w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent opacity-0 transition group-hover:opacity-100" />

                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {stat.value}
                </p>

                <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decorative line */}
        <div className="mx-auto mt-14 flex max-w-3xl items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
          <div className="h-1 w-1 rounded-full bg-amber-400/60" />
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
        </div>
      </div>
    </section>
  );
}