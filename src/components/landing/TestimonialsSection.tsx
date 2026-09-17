"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Quote,
  Sparkles,
  Star,
} from "lucide-react"

const testimonials = [
  {
    quote:
      "Managing our gym operations feels much more organized when everything is available from one dashboard.",
    name: "Gym Owner",
    role: "Fitness Business",
    initials: "GO",
  },
  {
    quote:
      "Having members, attendance and daily operations together makes it easier for our team to stay organized.",
    name: "Fitness Manager",
    role: "Gym Management",
    initials: "FM",
  },
  {
    quote:
      "A centralized management system helps our team spend less time on repetitive admin work and more time with members.",
    name: "Gym Manager",
    role: "Fitness Operations",
    initials: "GM",
  },
]

const benefits = [
  {
    icon: Building2,
    title: "Centralized Operations",
    description:
      "Bring everyday gym management workflows into one connected platform.",
  },
  {
    icon: Sparkles,
    title: "Modern Experience",
    description:
      "Give your team a cleaner and simpler way to manage gym operations.",
  },
  {
    icon: Star,
    title: "Built For Growth",
    description:
      "Start with the essentials and scale your operations as your gym grows.",
  },
]

export default function TestimonialsSection() {
  const [active, setActive] = useState(0)

  const current = testimonials[active]

  const previous = () => {
    setActive((currentIndex) =>
      currentIndex === 0 ? testimonials.length - 1 : currentIndex - 1,
    )
  }

  const next = () => {
    setActive((currentIndex) =>
      currentIndex === testimonials.length - 1 ? 0 : currentIndex + 1,
    )
  }

  return (
    <section
      id="reviews"
      className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/[0.035] blur-[150px]" />

      <div className="pointer-events-none absolute right-[-10%] top-0 h-80 w-80 rounded-full bg-red-500/[0.03] blur-[120px]" />

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
            Built for simpler gym management
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Less Admin.
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              More Growth.
            </span>
          </h2>

          <p className="mt-6 text-base leading-7 text-white/50 sm:text-lg">
            See how a centralized platform can make everyday gym operations
            easier for owners and teams.
          </p>
        </div>

        {/* =====================================================
            TESTIMONIAL CARD
           ===================================================== */}

        <div
          data-reveal
          className="mx-auto mt-14 max-w-5xl reveal-hidden"
          style={{ transitionDelay: "120ms" }}
        >
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.065] via-white/[0.025] to-transparent p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10 lg:p-14">
            {/* Decorative Quote */}
            <div className="pointer-events-none absolute right-5 top-5 opacity-[0.035] sm:right-10 sm:top-8">
              <Quote className="h-36 w-36 text-orange-500 sm:h-48 sm:w-48" />
            </div>

            {/* Top Row */}
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-orange-400 text-orange-400 sm:h-5 sm:w-5"
                  />
                ))}
              </div>

              <div className="text-xs font-bold uppercase tracking-[0.15em] text-white/20">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(testimonials.length).padStart(2, "0")}
              </div>
            </div>

            {/* Quote */}
            <blockquote
              key={active}
              className="relative mt-8 animate-[fadeIn_0.35s_ease-out] text-2xl font-black leading-[1.3] tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              &ldquo;{current.quote}&rdquo;
            </blockquote>

            {/* Author + Controls */}
            <div className="relative mt-10 flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-sm font-black text-white shadow-lg shadow-orange-500/20">
                  {current.initials}
                </div>

                <div>
                  <p className="font-bold text-white">{current.name}</p>

                  <p className="mt-1 text-sm text-white/35">{current.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Previous review"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Next review"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-400 transition-all duration-300 hover:bg-orange-500/20 hover:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="relative mt-8 flex items-center gap-2">
              {testimonials.map((testimonial, index) => (
                <button
                  key={testimonial.name}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Show review ${index + 1}`}
                  aria-current={active === index ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                    active === index
                      ? "w-10 bg-orange-500"
                      : "w-2 bg-white/15 hover:bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            BENEFIT CARDS
           ===================================================== */}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon

            return (
              <article
                key={benefit.title}
                data-reveal
                className="group rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-center transition-all duration-500 hover:-translate-y-1 hover:border-orange-500/20 hover:bg-white/[0.045] reveal-hidden"
                style={{
                  transitionDelay: `${180 + index * 80}ms`,
                }}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 transition-all duration-300 group-hover:bg-orange-500/15">
                  <Icon className="h-5 w-5 text-orange-400 transition-transform duration-300 group-hover:scale-110" />
                </div>

                <h3 className="mt-4 font-black text-white">{benefit.title}</h3>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  {benefit.description}
                </p>
              </article>
            )
          })}
        </div>

        {/* Disclaimer */}
        <p
          data-reveal
          className="mx-auto mt-8 max-w-2xl text-center text-[11px] leading-5 text-white/20 reveal-hidden"
        >
          The statements above are illustrative product-use examples and are not
          presented as verified customer reviews.
        </p>
      </div>
    </section>
  )
}
