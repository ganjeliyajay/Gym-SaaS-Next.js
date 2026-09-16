"use client";

import {
  Quote,
  Star,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

const testimonials = [
  {
    name: "Marcus Vance",
    role: "Founder, IronPulse Athletic Club",
    initials: "MV",
    quote:
      "ThinkAuric replaced five different tools for us. Our staff finally has one place to manage members, billing, waivers, and access.",
    result: "+38% operational efficiency",
  },
  {
    name: "Sarah Chen",
    role: "Owner, Apex Combat & Fitness",
    initials: "SC",
    quote:
      "The combination of digital waivers, automated billing, and QR check-ins completely changed how our front desk operates.",
    result: "12 hrs saved every week",
  },
  {
    name: "Derek O'Connor",
    role: "CEO, Metrix Barbell Franchise",
    initials: "DO",
    quote:
      "Managing multiple locations used to be painful. The analytics and super-admin tools give us the visibility we need to scale confidently.",
    result: "7 locations managed",
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-[#070b14] py-24 sm:py-28 lg:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute right-[-180px] top-1/4 h-[450px] w-[450px] rounded-full bg-amber-500/[0.045] blur-[140px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Trusted by Gym Operators
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
            Built for operators who{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              refuse to settle.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            See why ambitious fitness businesses are moving their operations
            onto one modern platform.
          </p>
        </div>

        {/* Testimonials */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/20 hover:bg-white/[0.045] hover:shadow-[0_25px_80px_rgba(0,0,0,0.3)]"
            >
              {/* Glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-400/[0.07] blur-[65px] opacity-0 transition duration-500 group-hover:opacity-100" />

              {/* Quote icon */}
              <div className="relative flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.07]">
                  <Quote className="h-5 w-5 text-amber-400/80" />
                </div>

                <span className="text-[10px] font-bold tracking-[0.18em] text-white/15">
                  0{index + 1}
                </span>
              </div>

              {/* Stars */}
              <div className="relative mt-6 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="relative mt-5 flex-1 text-sm leading-7 text-white/60">
                “{testimonial.quote}”
              </p>

              {/* Result */}
              <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.045] px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                    Business Result
                  </p>

                  <p className="mt-0.5 text-xs font-bold text-emerald-300">
                    {testimonial.result}
                  </p>
                </div>
              </div>

              {/* User */}
              <div className="relative mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/20 bg-gradient-to-br from-amber-400/20 to-orange-500/10 text-xs font-black text-amber-300">
                  {testimonial.initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {testimonial.name}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] text-white/30">
                    {testimonial.role}
                  </p>
                </div>

                <ArrowUpRight className="h-4 w-4 text-white/15 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-400" />
              </div>

              {/* Bottom line */}
              <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent transition-all duration-500 group-hover:w-2/3" />
            </article>
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-6 rounded-3xl border border-white/[0.07] bg-white/[0.02] px-6 py-5">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs font-medium text-white/30">
              Trusted by ambitious fitness operators
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Athletic Clubs",
                "Combat Gyms",
                "CrossFit Boxes",
                "Barbell Clubs",
                "Fitness Franchises",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/30"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}