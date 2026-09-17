"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Dumbbell, Menu, X } from "lucide-react"

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Pricing", href: "#pricing" },
  { name: "Reviews", href: "#reviews" },
  { name: "FAQ", href: "#faq" },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24)
    }

    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const closeMenu = () => {
    setIsOpen(false)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/85 shadow-2xl shadow-black/20 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            LOGO
           ===================================================== */}

        <Link
          href="/"
          onClick={closeMenu}
          aria-label="Gym SaaS home"
          className="group flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-orange-500/30">
            <Dumbbell className="h-5.5 w-5.5 text-white" />
          </div>

          <div className="leading-none">
            <span className="block text-lg font-black tracking-tight text-white">
              GYM<span className="text-orange-500">SAAS</span>
            </span>

            <span className="mt-1 hidden text-[9px] font-medium uppercase tracking-[0.25em] text-white/35 sm:block">
              Manage. Grow. Repeat.
            </span>
          </div>
        </Link>

        {/* =====================================================
            DESKTOP NAVIGATION
           ===================================================== */}

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="group relative py-2 text-sm font-medium text-white/60 transition-colors duration-200 hover:text-white"
            >
              {link.name}

              <span className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        {/* =====================================================
            DESKTOP ACTIONS
           ===================================================== */}

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/65 transition-all duration-300 hover:bg-white/[0.05] hover:text-white"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/15 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/30"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* =====================================================
            MOBILE MENU BUTTON
           ===================================================== */}

        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-orange-500/50 lg:hidden"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* =====================================================
          MOBILE NAVIGATION
         ===================================================== */}

      <div
        className={`overflow-hidden border-t border-white/10 bg-black/95 backdrop-blur-xl transition-all duration-300 lg:hidden ${
          isOpen
            ? "max-h-[600px] opacity-100"
            : "max-h-0 border-transparent opacity-0"
        }`}
      >
        <nav
          aria-label="Mobile navigation"
          className="mx-auto max-w-7xl px-4 py-5 sm:px-6"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3.5 text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
              >
                {link.name}
              </Link>
            ))}

            <div className="my-3 h-px bg-white/10" />

            <Link
              href="/login"
              onClick={closeMenu}
              className="rounded-xl px-4 py-3.5 text-sm font-semibold text-white/65 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
            >
              Login
            </Link>

            <Link
              href="/register"
              onClick={closeMenu}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/15"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
