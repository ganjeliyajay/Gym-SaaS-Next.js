import ScrollProgress from "@/components/ui/ScrollProgress"
import "./globals.css"

import { ToastProvider } from "@/components/ui/toast"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html>
      <body>
        <ScrollProgress  />

        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
