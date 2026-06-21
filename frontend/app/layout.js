import { Inter } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/layout/MobileNav";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Debrief",
  description: "Mobile-first field visit intelligence for fast debrief capture and manager synthesis.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Debrief",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f2d2e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ServiceWorkerRegister />
        <div className="mx-auto min-h-screen w-full max-w-7xl">
          {children}
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
