"use client"

import { useState } from "react"
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react"
import Link from "next/link"

const faqs = [
  {
    question: "What is Gym SaaS?",
    answer:
      "Gym SaaS is a gym management platform that brings members, memberships, attendance, payments, classes, team management and everyday gym operations into one centralized system.",
  },
  {
    question: "Who is Gym SaaS built for?",
    answer:
      "It is designed for gym owners, fitness businesses, managers and teams that want a simpler and more organized way to manage their daily operations.",
  },
  {
    question: "Can I manage my gym members?",
    answer:
      "Yes. You can manage member information and membership activity through the centralized gym management dashboard.",
  },
  {
    question: "Can I track member attendance?",
    answer:
      "Yes. Gym SaaS provides attendance and check-in functionality to help your team keep track of daily member activity.",
  },
  {
    question: "Can I manage memberships and plans?",
    answer:
      "Yes. Membership-related information and plans can be managed through the gym dashboard, helping your team keep member subscriptions organized.",
  },
  {
    question: "Can I manage trainers and staff?",
    answer:
      "Yes. Team management and role-based access allow you to organize trainers and staff while controlling access according to their responsibilities.",
  },
  {
    question: "Can I track payments and billing?",
    answer:
      "Gym SaaS includes payment and billing management features that help keep your gym's transaction information organized.",
  },
  {
    question: "Is the pricing shown in Indian Rupees?",
    answer:
      "Yes. The landing page presents the available example plans in Indian Rupees (INR).",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleFAQ = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-black py-24 sm:py-28 lg:py-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute right-[-10%] top-1/4 h-96 w-96 rounded-full bg-orange-500/[0.045] blur-[130px]" />

      <div className="pointer-events-none absolute bottom-0 left-[-10%] h-80 w-80 rounded-full bg-red-500/[0.025] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
           ===================================================== */}

        <div
          data-reveal
          className="mx-auto max-w-3xl text-center reveal-hidden"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-400">
            <HelpCircle className="h-4 w-4" />
            Frequently asked questions
          </div>

          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Got Questions?
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              We&apos;ve Got Answers.
            </span>
          </h2>

          <p className="mt-6 text-base leading-7 text-white/50 sm:text-lg">
            Everything you need to know before getting started with Gym SaaS.
          </p>
        </div>

        {/* =====================================================
            FAQ LIST
           ===================================================== */}

        <div className="mt-14 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index

            return (
              <div
                key={faq.question}
                data-reveal
                className={`overflow-hidden rounded-2xl border transition-all duration-300 reveal-hidden ${
                  isOpen
                    ? "border-orange-500/25 bg-orange-500/[0.045] shadow-lg shadow-orange-500/[0.03]"
                    : "border-white/10 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.035]"
                }`}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 sm:px-7 sm:py-6"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition-all duration-300 ${
                        isOpen
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "bg-white/10 text-white/35"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <span
                      className={`text-sm font-bold transition-colors duration-300 sm:text-base ${
                        isOpen ? "text-white" : "text-white/70"
                      }`}
                    >
                      {faq.question}
                    </span>
                  </div>

                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                      isOpen
                        ? "rotate-180 bg-orange-500/10 text-orange-400"
                        : "bg-white/5 text-white/35"
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </button>

                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-hidden={!isOpen}
                  className={`grid transition-all duration-300 ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="border-t border-white/5 px-5 pb-6 pt-5 pl-[4.25rem] sm:px-7 sm:pb-7 sm:pl-[4.75rem]">
                      <p className="max-w-3xl text-sm leading-7 text-white/45 sm:text-base">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* =====================================================
            CTA
           ===================================================== */}

        <div
          data-reveal
          className="relative mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-orange-500/[0.08] via-white/[0.035] to-red-500/[0.06] p-6 reveal-hidden sm:p-8"
          style={{ transitionDelay: "250ms" }}
        >
          {/* Decorative Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                <Sparkles className="h-5 w-5 text-orange-400" />
              </div>

              <div>
                <h3 className="font-black text-white">
                  Ready to manage your gym smarter?
                </h3>

                <p className="mt-1 text-sm leading-6 text-white/40">
                  Start building a more organized gym business today.
                </p>
              </div>
            </div>

            <Link
              href="/register"
              className="group inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-black"
            >
              Get Started
              <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
