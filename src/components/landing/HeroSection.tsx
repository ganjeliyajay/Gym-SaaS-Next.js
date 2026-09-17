"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, type Variants } from "motion/react"
import {
  ArrowRight,
  CheckCircle2,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react"


const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
}

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-black pt-20">
      {/* Background Image */}

      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: [1, 1.025, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Image
            src="/images/landing/gym-hero.png"
            alt="Modern gym training environment"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </motion.div>

        {/* Light dark overlay */}

        <div className="absolute inset-0 bg-black/10" />

        {/* Text readability */}

        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-transparent" />

        {/* Bottom fade */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />

        {/* Orange atmosphere */}

        <motion.div
          className="absolute right-[20%] top-[25%] h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[120px]"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.5, 0.25],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Grid */}

        <div className="hero-grid absolute inset-0" />

        {/* Moving orange light */}

        <motion.div
          className="absolute left-[-20%] top-[45%] h-[2px] w-[45%] bg-gradient-to-r from-transparent via-orange-500 to-transparent"
          animate={{
            x: ["0%", "300%"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Particles */}

        <motion.span
          className="hero-particle left-[8%] top-[30%]"
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 1, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.span
          className="hero-particle left-[20%] top-[70%]"
          animate={{
            y: [0, -25, 0],
            opacity: [0.2, 0.9, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        <motion.span
          className="hero-particle right-[25%] top-[25%]"
          animate={{
            y: [0, -25, 0],
            opacity: [0.2, 1, 0.2],
          }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
      </div>

      {/* Content */}

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex min-h-[calc(100vh-80px)] items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="max-w-3xl py-16 lg:py-20">
            {/* Badge */}

            <motion.div variants={itemVariants}>
              <motion.div
                whileHover={{
                  scale: 1.03,
                  y: -2,
                }}
                className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-black/40 px-4 py-2.5 backdrop-blur-xl"
              >
                <span className="relative flex h-2 w-2">
                  <motion.span
                    className="absolute h-full w-full rounded-full bg-orange-500"
                    animate={{
                      scale: [1, 2, 1],
                      opacity: [0.8, 0, 0.8],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                    }}
                  />

                  <span className="relative h-2 w-2 rounded-full bg-orange-500" />
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
                  #1 Gym Management Platform
                </span>
              </motion.div>
            </motion.div>

            {/* Heading */}

            <motion.h1
              variants={itemVariants}
              className="mt-7 text-[clamp(3.3rem,7vw,7.2rem)] font-black uppercase leading-[0.84] tracking-[-0.065em] text-white"
            >
              It&apos;s Time
              <br />
              To Gain More
              <br />
              <span className="hero-gradient-text">Muscles.</span>
            </motion.h1>

            {/* Description */}

            <motion.p
              variants={itemVariants}
              className="mt-8 max-w-2xl text-sm leading-7 text-white/70 sm:text-base"
            >
              Manage your gym, members, trainers, payments and daily operations
              with one powerful platform built for modern fitness businesses.
            </motion.p>

            {/* Benefits */}

            <motion.div
              variants={itemVariants}
              className="mt-7 flex flex-wrap gap-x-7 gap-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                Easy Setup
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
                <ShieldCheck className="h-4 w-4 text-orange-500" />
                Secure Access
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-white/75">
                <Zap className="h-4 w-4 text-orange-500" />
                Built to Scale
              </div>
            </motion.div>

            {/* Buttons */}

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div
                whileHover={{
                  y: -4,
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.97,
                }}
              >
                <Link
                  href="/register"
                  className="hero-main-button group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 py-4 text-sm font-bold text-white shadow-[0_15px_50px_rgba(249,115,22,0.3)] transition-all duration-300 hover:shadow-[0_20px_70px_rgba(249,115,22,0.45)]"
                >
                  Start Growing Your Gym
                  <motion.span
                    animate={{
                      x: [0, 4, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.span>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{
                  y: -4,
                  scale: 1.02,
                }}
                whileTap={{
                  scale: 0.97,
                }}
              >
                <Link
                  href="#features"
                  className="group inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-black/35 px-7 py-4 text-sm font-bold text-white/85 backdrop-blur-xl transition-all duration-300 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-white"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 transition-all duration-300 group-hover:border-orange-500/70">
                    <Play className="ml-0.5 h-3 w-3 fill-current" />
                  </span>
                  Explore Platform
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust */}

            <motion.div
              variants={itemVariants}
              className="mt-9 flex items-center gap-4"
            >
              <div className="flex -space-x-2">
                {["01", "02", "03", "04"].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{
                      opacity: 0,
                      scale: 0.5,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      delay: 0.8 + index * 0.1,
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-gradient-to-br from-neutral-500 to-neutral-800 text-[9px] font-bold text-white"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-white/80">
                  Built for growing fitness businesses
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm tracking-wide text-orange-500">
                    ★★★★★
                  </span>

                  <span className="text-[10px] text-white/50">
                    Gym management made simple
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Stats */}

            <motion.div
              variants={itemVariants}
              className="mt-9 flex max-w-xl border-t border-white/15 pt-6"
            >
              <motion.div whileHover={{ y: -3 }} className="flex-1">
                <p className="text-2xl font-black text-orange-500">10K+</p>

                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/45">
                  Members Managed
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                className="border-l border-white/15 px-6 sm:px-9"
              >
                <p className="text-2xl font-black text-orange-500">500+</p>

                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/45">
                  Gyms
                </p>
              </motion.div>

              <motion.div
                whileHover={{ y: -3 }}
                className="border-l border-white/15 pl-6 sm:pl-9"
              >
                <p className="text-2xl font-black text-orange-500">99.9%</p>

                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/45">
                  Uptime
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Side Label */}

      <div className="absolute left-5 top-1/2 z-20 hidden -translate-y-1/2 xl:block">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-orange-500" />

          <span className="text-[8px] font-bold uppercase leading-5 tracking-[0.25em] text-white/40">
            Fitness
            <br />
            Management
            <br />
            Made Simple
          </span>
        </div>
      </div>

      {/* Right Label */}

      <div className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 xl:block">
        <div className="flex flex-col items-end gap-3">
          <span className="h-px w-8 bg-orange-500" />

          <span className="text-right text-[8px] font-bold uppercase leading-5 tracking-[0.25em] text-white/40">
            Train
            <br />
            Track
            <br />
            Grow
          </span>
        </div>
      </div>

      {/* Scroll */}

      <motion.div
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.4,
          duration: 0.8,
        }}
        className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center lg:flex"
      >
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/25 p-1.5">
          <motion.span
            className="h-2 w-1 rounded-full bg-orange-500"
            animate={{
              y: [0, 10, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <span className="mt-2 text-[8px] font-bold uppercase tracking-[0.35em] text-white/35">
          Scroll to explore
        </span>
      </motion.div>

      {/* Bottom fade */}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  )
}
