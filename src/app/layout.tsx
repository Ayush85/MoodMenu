import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.APP_BASE_URL || "https://menuor.com";
const APP_NAME = "Menuor";
const APP_TITLE = "Menuor — Smart Digital Menus for Restaurants";
const APP_DESC =
  "Give your restaurant a smart digital menu with QR codes, waiter calls, and weather-adaptive themes. Free to start — go live in minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: APP_NAME,
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESC,
  keywords: [
    "digital restaurant menu",
    "QR code menu",
    "smart menu system",
    "restaurant ordering system",
    "waiter call button",
    "Nepal restaurant app",
    "table ordering",
    "weather adaptive menu",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_TITLE,
    description: APP_DESC,
    url: APP_URL,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Menuor" }],
  },
  twitter: {
    card: "summary",
    title: APP_TITLE,
    description: APP_DESC,
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/logo-kathmandu.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers oneSignalAppId={oneSignalAppId}>{children}</Providers>
      </body>
    </html>
  );
}
