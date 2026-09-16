
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";


export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
