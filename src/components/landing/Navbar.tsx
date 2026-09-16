"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dumbbell,
  ArrowRight,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-2xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setMobileOpen(false)}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-lg transition duration-300 group-hover:bg-amber-400/50" />

            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20 transition duration-300 group-hover:scale-105">
              <Dumbbell className="h-5 w-5" strokeWidth={2.5} />
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-[outfit] text-lg font-extrabold tracking-tight text-white">
                ThinkAuric
              </span>

              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300">
                Gym SaaS
              </span>
            </div>

            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-white/35">
              POWERING MODERN FITNESS
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative rounded-xl px-4 py-2.5 text-xs font-semibold text-white/55 transition-all duration-200 hover:bg-white/[0.04] hover:text-white"
            >
              {item.label}

              <span className="absolute bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-300 group-hover:w-5" />
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-xs font-bold text-white/60 transition hover:bg-white/[0.04] hover:text-white"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-xs font-extrabold text-black shadow-lg shadow-amber-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:from-amber-300 hover:to-amber-400 hover:shadow-amber-500/30"
          >
            <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />

            <Sparkles className="relative h-3.5 w-3.5" />
            <span className="relative">Get Started</span>

            <ArrowRight className="relative h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:border-amber-400/30 hover:bg-amber-400/10 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`overflow-hidden border-t border-white/[0.06] bg-[#080c16] transition-all duration-300 md:hidden ${
          mobileOpen
            ? "max-h-[420px] opacity-100"
            : "max-h-0 border-t-transparent opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-amber-300"
              >
                <span>{item.label}</span>
                <ArrowRight className="h-4 w-4 text-white/20" />
              </a>
            ))}
          </nav>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              Sign In
            </Link>

            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-xs font-extrabold text-black shadow-lg shadow-amber-500/15 transition hover:from-amber-300 hover:to-amber-400"
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}