"use client"

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Dumbbell,
  Rocket,
  Users,
} from "lucide-react"

const steps = [
  {
    number: "01",
    icon: Users,
    title: "Set Up Your Gym",
    description:
      "Create your gym workspace and organize your business from one centralized dashboard.",
    points: [
      "Create your gym profile",
      "Configure your team",
      "Set up membership plans",
    ],
  },
  {
    number: "02",
    icon: Dumbbell,
    title: "Manage Daily Operations",
    description:
      "Handle members, attendance, memberships, classes and payments without switching between multiple tools.",
    points: [
      "Manage your members",
      "Track daily attendance",
      "Handle billing and payments",
    ],
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Track & Grow",
    description:
      "Use your dashboard and business insights to understand your gym and make better operational decisions.",
    points: [
      "Monitor gym activity",
      "Review business data",
      "Keep your team organized",
    ],
  },
]

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32"
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute left-0 top-1/3 h-96 w-96 rounded-full bg-orange-500/5 blur-[120px]" />

      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-red-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div
          data-reveal
          className="mx-auto max-w-3xl text-center reveal-hidden"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            <Rocket className="h-4 w-4" />
            Simple. Powerful. Built for gyms.
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            From Setup To
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Gym Growth.
            </span>
          </h2>

          <p className="mt-6 text-base leading-7 text-white/55 sm:text-lg">
            Everything you need to run your gym is connected in one simple
            workflow.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 lg:mt-20">
          {/* Connecting Line */}
          <div className="pointer-events-none absolute left-[16.66%] right-[16.66%] top-10 hidden h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent lg:block" />

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <article
                  key={step.number}
                  data-reveal
                  className="group relative reveal-hidden"
                  style={{
                    transitionDelay: `${index * 120}ms`,
                  }}
                >
                  {/* Step Number */}
                  <div className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-orange-500/20 bg-black shadow-xl shadow-black/40 transition-all duration-500 group-hover:-translate-y-1 group-hover:border-orange-500/50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/10 transition-all duration-500 group-hover:from-orange-500 group-hover:to-red-600">
                      <Icon className="h-6 w-6 text-orange-400 transition-colors duration-500 group-hover:text-white" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className="mt-8 h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-7 transition-all duration-500 group-hover:-translate-y-1 group-hover:border-orange-500/20 group-hover:bg-white/[0.06] sm:p-8">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-[0.2em] text-orange-500/70">
                        STEP {step.number}
                      </span>

                      <span className="text-4xl font-black text-white/[0.04] transition-colors duration-500 group-hover:text-orange-500/10">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black text-white sm:text-2xl">
                      {step.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-white/45">
                      {step.description}
                    </p>

                    <div className="mt-7 space-y-3">
                      {step.points.map((point) => (
                        <div
                          key={point}
                          className="flex items-center gap-3 text-sm text-white/60"
                        >
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div data-reveal className="mx-auto mt-16 max-w-5xl reveal-hidden">
          <div className="relative overflow-hidden rounded-[2rem] border border-orange-500/15 bg-gradient-to-r from-orange-500/[0.08] via-white/[0.04] to-red-500/[0.06] p-7 sm:p-10 lg:p-12">
            {/* Decorative Icon */}
            <div className="pointer-events-none absolute -right-8 -top-8 opacity-[0.04]">
              <Dumbbell className="h-48 w-48 text-orange-500" />
            </div>

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
                  <Rocket className="h-4 w-4" />
                  Ready when you are
                </div>

                <h3 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Your gym deserves a smarter way to operate.
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/45 sm:text-base">
                  Start building a more organized, efficient and scalable gym
                  business with Gym SaaS.
                </p>
              </div>

              <Link
                href="/register"
                className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/30"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
