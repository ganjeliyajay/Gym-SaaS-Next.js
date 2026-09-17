"use client"

import { useEffect } from "react"

export default function LandingMotion() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    )

    if (!elements.length) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches

    if (prefersReducedMotion) {
      elements.forEach((element) => {
        element.classList.add("reveal-visible")
      })

      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          entry.target.classList.add("reveal-visible")
          observer.unobserve(entry.target)
        })
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      },
    )

    elements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null

      const link = target?.closest<HTMLAnchorElement>('a[href^="#"]')

      if (!link) {
        return
      }

      const href = link.getAttribute("href")

      if (!href || href === "#") {
        return
      }

      const section = document.querySelector(href)

      if (!section) {
        return
      }

      event.preventDefault()

      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })

      window.history.replaceState(null, "", href)
    }

    document.addEventListener("click", handleAnchorClick)

    return () => {
      document.removeEventListener("click", handleAnchorClick)
    }
  }, [])

  return null
}
