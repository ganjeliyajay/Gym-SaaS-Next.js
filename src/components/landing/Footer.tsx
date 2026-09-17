"use client"

import Link from "next/link"

import { ArrowUpRight, Camera, Dumbbell, Mail, MapPin } from "lucide-react"

const productLinks = [
  { name: "Features", href: "#features" },
  { name: "Pricing", href: "#pricing" },
  { name: "Reviews", href: "#reviews" },
  { name: "FAQ", href: "#faq" },
]

const accountLinks = [
  { name: "Login", href: "/login" },
  { name: "Get Started", href: "/register" },
]

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black">
      {/* Background Glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/5 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer */}
        <div className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <Link href="/" className="group inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20 transition-transform duration-300 group-hover:scale-105">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>

              <div className="leading-none">
                <span className="block text-lg font-black tracking-tight text-white">
                  GYM<span className="text-orange-500">SAAS</span>
                </span>

                <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.25em] text-white/35">
                  Manage. Grow. Repeat.
                </span>
              </div>
            </Link>

            <p className="mt-6 text-sm leading-7 text-white/45">
              A modern gym management platform built to help fitness businesses
              simplify operations, manage members and focus on growth.
            </p>

            {/* Location */}
            <div className="mt-6 flex items-center gap-2 text-sm text-white/35">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span>India</span>
            </div>

            {/* Social */}
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://www.instagram.com/ganjeliya_jay_0745/?utm_source=ig_web_button_share_sheet"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
              >
                <Camera className="h-4 w-4" />
              </a>

              <a
                href="mailto:ganjeliyajay0745@gmail.com?subject=Gym%20SaaS%20Inquiry&body=Hello%2C%20I%20would%20like%20to%20know%20more%20about%20Gym%20SaaS."
                aria-label="Email"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-bold text-white">Product</h3>

            <ul className="mt-5 space-y-3">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-white/40 transition-colors duration-200 hover:text-white"
                  >
                    {link.name}

                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-bold text-white">Account</h3>

            <ul className="mt-5 space-y-3">
              {accountLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-white/40 transition-colors duration-200 hover:text-white"
                  >
                    {link.name}

                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-white">Get Started</h3>

            <p className="mt-5 text-sm leading-6 text-white/40">
              Ready to take control of your gym operations?
            </p>

            <Link
              href="/register"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/25"
            >
              Start Now
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col gap-5 border-t border-white/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Gym SaaS. All rights reserved.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="group flex items-center gap-2 text-xs font-semibold text-white/40 transition-colors duration-200 hover:text-white"
          >
            Back to top
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] transition-all duration-300 group-hover:border-orange-500/30 group-hover:bg-orange-500/10">
              ↑
            </span>
          </button>
        </div>
      </div>
    </footer>
  )
}
