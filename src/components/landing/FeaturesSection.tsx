"use client"

import Image from "next/image"
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Users,
  UserRoundCog,
  Zap,
} from "lucide-react"

const features = [
  {
    icon: Users,
    number: "01",
    title: "Member Management",
    description:
      "Keep member profiles, memberships and important customer information organized in one place.",
  },
  {
    icon: Zap,
    number: "02",
    title: "Smart Attendance",
    description:
      "Track daily check-ins and member activity with a simple attendance workflow.",
  },
  {
    icon: CreditCard,
    number: "03",
    title: "Payments & Billing",
    description:
      "Keep membership payments and transaction information organized for easier gym operations.",
  },
  {
    icon: CalendarDays,
    number: "04",
    title: "Classes & Scheduling",
    description:
      "Organize classes and schedules so your team and members stay on the same page.",
  },
  {
    icon: UserRoundCog,
    number: "05",
    title: "Team & Roles",
    description:
      "Manage trainers and staff with role-based access designed around your gym's workflow.",
  },
  {
    icon: BarChart3,
    number: "06",
    title: "Gym Analytics",
    description:
      "Bring important gym activity and business insights together through a centralized dashboard.",
  },
]

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-orange-500/[0.045] blur-[140px]" />

      <div className="pointer-events-none absolute bottom-0 right-[-10%] h-[400px] w-[400px] rounded-full bg-red-500/[0.035] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
           ===================================================== */}

        <div
          data-reveal
          className="mx-auto max-w-3xl text-center reveal-hidden"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            <Zap className="h-4 w-4" />
            Everything in one place
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Run Your Gym
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Without The Chaos.
            </span>
          </h2>

          <p className="mt-6 text-base leading-7 text-white/50 sm:text-lg">
            Replace scattered tools and manual processes with one modern
            platform built around the everyday needs of your gym.
          </p>
        </div>

        {/* =====================================================
            FEATURE GRID + IMAGE
           ===================================================== */}

        <div className="mt-16 grid gap-6 lg:grid-cols-12 lg:items-stretch">
          {/* Feature Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {features.map((feature, index) => {
              const Icon = feature.icon

              return (
                <article
                  key={feature.number}
                  data-reveal
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-orange-500/25 hover:bg-white/[0.045] sm:p-7 reveal-hidden"
                  style={{
                    transitionDelay: `${index * 80}ms`,
                  }}
                >
                  {/* Hover Glow */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-orange-500/0 blur-3xl transition-all duration-500 group-hover:bg-orange-500/15" />

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/15 bg-orange-500/10 transition-all duration-500 group-hover:border-orange-500/30 group-hover:bg-orange-500/15">
                        <Icon className="h-5 w-5 text-orange-400 transition-transform duration-500 group-hover:scale-110" />
                      </div>

                      <span className="text-xs font-black tracking-[0.2em] text-white/10 transition-colors duration-500 group-hover:text-orange-500/20">
                        {feature.number}
                      </span>
                    </div>

                    <h3 className="mt-7 text-lg font-black text-white sm:text-xl">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-white/40">
                      {feature.description}
                    </p>

                    <div className="mt-6 h-px w-0 bg-gradient-to-r from-orange-500 to-transparent transition-all duration-500 group-hover:w-full" />
                  </div>
                </article>
              )
            })}
          </div>

          {/* =================================================
              FEATURE IMAGE
             ================================================= */}

          <div
            data-reveal
            className="relative min-h-[460px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] lg:col-span-5 reveal-hidden"
            style={{ transitionDelay: "180ms" }}
          >
            <Image
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1100&q=90"
              alt="Modern gym interior with fitness equipment"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition-transform duration-1000 hover:scale-105"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.08] via-transparent to-transparent" />

            {/* Image Content */}
            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 backdrop-blur-md">
                <ShieldCheck className="h-5 w-5 text-orange-400" />
              </div>

              <h3 className="mt-5 text-2xl font-black text-white sm:text-3xl">
                One dashboard.
                <br />
                <span className="text-orange-400">Total control.</span>
              </h3>

              <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">
                Give your gym team the tools they need to manage everyday
                operations with clarity.
              </p>
            </div>

            {/* Floating Badge */}
            <div className="animate-float absolute right-5 top-5 rounded-2xl border border-white/10 bg-black/70 px-4 py-3 shadow-2xl backdrop-blur-xl sm:right-7 sm:top-7">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-white">
                  All systems active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BOTTOM VALUE STRIP
           ===================================================== */}

        <div
          data-reveal
          className="mt-6 grid gap-4 sm:grid-cols-3 reveal-hidden"
          style={{ transitionDelay: "250ms" }}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 text-center transition-all duration-300 hover:border-orange-500/20 hover:bg-white/[0.035]">
            <p className="text-2xl font-black text-white">01</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
              Centralized platform
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 text-center transition-all duration-300 hover:border-orange-500/20 hover:bg-white/[0.035]">
            <p className="text-2xl font-black text-orange-400">24/7</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
              Access to your operations
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 text-center transition-all duration-300 hover:border-orange-500/20 hover:bg-white/[0.035]">
            <p className="text-2xl font-black text-white">∞</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/30">
              Built to scale
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
