import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { ORG } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `Lab Operations — ${ORG.displayName}`, template: `%s · GVBL Lab Operations` },
  description: "Daily Laboratory Operations Management System — NGS Laboratory",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#5B2A86",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
