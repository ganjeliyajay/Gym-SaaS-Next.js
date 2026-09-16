"use client";

import {
  CreditCard,
  FileSignature,
  DoorOpen,
  QrCode,
  ShieldCheck,
  BarChart3,
  ArrowUpRight,
  Check,
} from "lucide-react";

const features = [
  {
    number: "01",
    icon: CreditCard,
    title: "Authorize.net Integration",
    description:
      "Automate recurring memberships and securely process payments without switching between multiple platforms.",
    points: [
      "Recurring billing",
      "Secure payment processing",
      "Payment tracking",
    ],
  },
  {
    number: "02",
    icon: FileSignature,
    title: "Dynamic Legal Waiver Builder",
    description:
      "Create digital waivers for every membership and keep signed documents organized inside your gym platform.",
    points: [
      "Custom waiver fields",
      "Digital signatures",
      "Centralized records",
    ],
  },
  {
    number: "03",
    icon: DoorOpen,
    title: "Hardware Door & Turnstile API",
    description:
      "Connect your physical access hardware directly to your membership system for fast and reliable entry control.",
    points: [
      "Real-time access control",
      "Door hardware API",
      "Instant member validation",
    ],
  },
  {
    number: "04",
    icon: QrCode,
    title: "QR Generator & Check-ins",
    description:
      "Turn cameras, posters, and digital touchpoints into powerful member check-in experiences.",
    points: [
      "Camera QR scanning",
      "Poster & leaflet QRs",
      "Fast member check-ins",
    ],
  },
  {
    number: "05",
    icon: ShieldCheck,
    title: "Granular RBAC & Team Invites",
    description:
      "Give every team member exactly the access they need while keeping sensitive gym operations protected.",
    points: [
      "Custom team roles",
      "Permission management",
      "Secure team invites",
    ],
  },
  {
    number: "06",
    icon: BarChart3,
    title: "Executive Super-Admin Analytics",
    description:
      "See the bigger picture with powerful analytics for revenue, memberships, locations, and business growth.",
    points: [
      "MRR & ARR analytics",
      "Membership insights",
      "Multi-location reporting",
    ],
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#070b14] py-24 sm:py-28 lg:py-32"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/[0.045] blur-[150px]" />

      <div className="pointer-events-none absolute bottom-0 left-[-150px] h-[350px] w-[350px] rounded-full bg-orange-500/[0.035] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
              Everything Under One Roof
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
            Everything your gym needs to{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              operate at its best.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            Replace disconnected tools with one intelligent operating system
            built specifically for modern gyms, athletic clubs, and fitness
            businesses.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.number}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-amber-400/20 hover:bg-white/[0.045] hover:shadow-[0_20px_70px_rgba(0,0,0,0.25)]"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-400/[0.08] blur-[55px] opacity-0 transition duration-500 group-hover:opacity-100" />

                {/* Top row */}
                <div className="relative flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] text-amber-300 transition duration-300 group-hover:scale-105 group-hover:border-amber-400/25 group-hover:bg-amber-400/[0.12]">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <span className="text-xs font-bold tracking-[0.15em] text-white/15">
                    {feature.number}
                  </span>
                </div>

                {/* Content */}
                <div className="relative mt-6">
                  <h3 className="text-lg font-extrabold tracking-tight text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-white/40">
                    {feature.description}
                  </p>
                </div>

                {/* Points */}
                <div className="relative mt-6 space-y-2.5 border-t border-white/[0.06] pt-5">
                  {feature.points.map((point) => (
                    <div
                      key={point}
                      className="flex items-center gap-2.5 text-xs font-medium text-white/50"
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/10">
                        <Check className="h-2.5 w-2.5 text-amber-400" />
                      </span>

                      {point}
                    </div>
                  ))}
                </div>

                {/* Bottom arrow */}
                <div className="relative mt-6 flex items-center justify-end">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.07] text-white/20 transition-all duration-300 group-hover:border-amber-400/20 group-hover:bg-amber-400/10 group-hover:text-amber-400">
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent transition-all duration-500 group-hover:w-2/3" />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-r from-white/[0.025] via-amber-400/[0.035] to-white/[0.025] p-5 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-white">
                Built to scale with your fitness business.
              </p>

              <p className="mt-1 text-xs text-white/35">
                From your first 100 members to multiple locations.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Enterprise-ready infrastructure
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}