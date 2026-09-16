"use client";

import { useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  MessageCircleQuestion,
} from "lucide-react";

const faqs = [
  {
    question: "How does Authorize.net processing work?",
    answer:
      "ThinkAuric connects with Authorize.net to handle secure membership payments and recurring billing. Your gym can manage payment plans and billing activity directly from the platform.",
  },
  {
    question: "Can I use my own branded domain or subdomain?",
    answer:
      "Yes. Growth and Enterprise plans support custom subdomains so your public signup experience can match your gym's brand and provide members with a seamless experience.",
  },
  {
    question: "Can ThinkAuric connect to my door hardware?",
    answer:
      "Yes. The hardware access API allows supported door and turnstile systems to communicate with the gym platform, allowing member access to be validated in real time.",
  },
  {
    question: "How do dynamic legal waivers work?",
    answer:
      "You can create custom digital waiver forms, collect member signatures during onboarding, and keep signed documents organized with the member's records.",
  },
  {
    question: "Can I import my existing customers?",
    answer:
      "Yes. Existing customer information can be imported using CSV files, making it easier to move your gym operations onto ThinkAuric without manually recreating every member.",
  },
];

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-[#070b14] py-24 sm:py-28 lg:py-32"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute left-[-180px] top-1/3 h-[420px] w-[420px] rounded-full bg-amber-500/[0.04] blur-[140px]" />

      <div className="pointer-events-none absolute right-[-160px] bottom-0 h-[400px] w-[400px] rounded-full bg-orange-500/[0.035] blur-[130px]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
            <HelpCircle className="h-3 w-3 text-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Frequently Asked Questions
            </span>
          </div>

          <h2 className="text-3xl font-black tracking-[-0.035em] text-white sm:text-5xl">
            Questions?{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              We've got answers.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
            Everything you need to know before bringing your gym operations
            onto ThinkAuric.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-14 space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={faq.question}
                className={`group overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-amber-400/20 bg-amber-400/[0.035]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center gap-4 px-5 py-5 text-left sm:px-6"
                >
                  {/* Number */}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black transition ${
                      isOpen
                        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
                        : "border-white/[0.07] bg-white/[0.025] text-white/20"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* Question */}
                  <span
                    className={`flex-1 text-sm font-bold transition ${
                      isOpen ? "text-white" : "text-white/60"
                    }`}
                  >
                    {faq.question}
                  </span>

                  {/* Icon */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "rotate-180 border-amber-400/20 bg-amber-400/10 text-amber-400"
                        : "border-white/[0.07] text-white/25"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>

                {/* Answer */}
                <div
                  className={`grid transition-all duration-300 ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-white/[0.06] px-5 pb-6 pt-5 sm:pl-[76px] sm:pr-16">
                      <p className="text-sm leading-7 text-white/40">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active bottom line */}
                <div
                  className={`h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent transition-all duration-500 ${
                    isOpen ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Support card */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-r from-white/[0.025] via-amber-400/[0.035] to-white/[0.025] p-6 sm:p-7">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] text-amber-400">
              <MessageCircleQuestion className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">
                Still have questions?
              </h3>

              <p className="mt-1 text-xs leading-5 text-white/30">
                Our team can help you understand which setup is right for your
                gym.
              </p>
            </div>

            <a
              href="mailto:support@thinkauric.com"
              className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-bold text-white/60 transition hover:border-amber-400/20 hover:bg-amber-400/[0.06] hover:text-amber-300"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}