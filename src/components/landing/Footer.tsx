import Link from "next/link";
import {
  Dumbbell,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Zap,
} from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "FAQ", href: "#faq" },
  ],
  Platform: [
    { label: "Gym Dashboard", href: "/dashboard" },
    { label: "Member Management", href: "/dashboard/members" },
    { label: "Billing", href: "/dashboard/billing" },
    { label: "Check-in", href: "/dashboard/checkin" },
  ],
  Company: [
    { label: "Sign In", href: "/login" },
    { label: "Get Started", href: "/register" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-[#050810]">
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.035] blur-[130px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr] lg:gap-16">
          {/* Brand */}
          <div>
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-amber-400/20 blur-lg transition group-hover:bg-amber-400/35" />

                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-300 to-orange-500 text-black">
                  <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight text-white">
                    ThinkAuric
                  </span>

                  <span className="rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-300">
                    Gym SaaS
                  </span>
                </div>

                <p className="mt-0.5 text-[9px] font-bold tracking-[0.16em] text-white/20">
                  POWERING MODERN FITNESS
                </p>
              </div>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-7 text-white/30">
              The complete operating system for modern gyms, martial arts
              dojos, CrossFit boxes, and fitness franchises.
            </p>

            {/* Trust badges */}
            <div className="mt-7 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
                Secure Cloud Infrastructure
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/25">
                <CreditCard className="h-3.5 w-3.5 text-amber-400/70" />
                Authorize.net Certified Gateway Partner
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
              Product
            </h3>

            <div className="mt-5 space-y-3">
              {footerLinks.Product.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="group flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-amber-300"
                >
                  {link.label}

                  <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
              Platform
            </h3>

            <div className="mt-5 space-y-3">
              {footerLinks.Platform.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="group flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-amber-300"
                >
                  {link.label}

                  <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
              Get Started
            </h3>

            <div className="mt-5 space-y-3">
              {footerLinks.Company.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="group flex items-center gap-1.5 text-xs font-semibold text-white/40 transition hover:text-amber-300"
                >
                  {link.label}

                  <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>

            <Link
              href="/register"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/10 transition hover:-translate-y-0.5 hover:shadow-amber-500/20"
            >
              <Zap className="h-3.5 w-3.5" />
              Start Building
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-4 border-t border-white/[0.07] py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-medium text-white/20">
            © 2026 ThinkAuric Inc. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/15">
              Enterprise Cloud
            </span>

            <span className="h-3 w-px bg-white/[0.08]" />

            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/15">
              Built for Fitness
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}