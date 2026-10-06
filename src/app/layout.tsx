import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaInit } from "@/components/pwa";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Atom Hub", template: "%s · Atom Hub" },
  description: "A gamified habit tracker and todo list with GitHub-style contribution graphs.",
  applicationName: "Atom Hub",
  appleWebApp: { capable: true, title: "Atom Hub", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#010409" },
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster theme="system" position="top-center" closeButton toastOptions={{ className: "!font-sans" }} />
        <PwaInit />
      </body>
    </html>
  );
}
