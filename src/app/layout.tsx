import type { Metadata } from "next"
import ScrollProgress from "@/components/ui/ScrollProgress"
import { ToastProvider } from "@/components/ui/toast"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "Gym SaaS | Manage Your Gym. Grow Your Business.",
    template: "%s | Gym SaaS",
  },

  description:
    "Modern gym management software for members, memberships, attendance, check-ins, billing, teams and gym operations.",

  keywords: [
    "Gym SaaS",
    "Gym Management Software",
    "Gym Management System",
    "Gym Software India",
    "Fitness Management Software",
    "Gym Membership Management",
    "Gym Attendance Software",
    "Gym Billing Software",
    "Fitness Business Software",
  ],

  applicationName: "Gym SaaS",

  authors: [
    {
      name: "Gym SaaS",
    },
  ],

  creator: "Gym SaaS",
  publisher: "Gym SaaS",

  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Gym SaaS",
    title: "Gym SaaS | Manage Your Gym. Grow Your Business.",
    description:
      "Modern gym management software for members, memberships, attendance, check-ins, billing, teams and gym operations.",
  },

  twitter: {
    card: "summary_large_image",
    title: "Gym SaaS | Manage Your Gym. Grow Your Business.",
    description:
      "Modern gym management software built for growing fitness businesses.",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ScrollProgress />

        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
