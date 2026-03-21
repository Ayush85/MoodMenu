import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "MoodMenu — Smart Digital Menus That Adapt to Weather & Mood",
  description:
    "Create beautiful, weather-adaptive digital menus with QR codes for your restaurant. Your menu changes its look and featured items based on weather and time of day.",
  keywords: [
    "digital menu",
    "restaurant menu",
    "QR code menu",
    "weather adaptive menu",
    "smart menu",
    "Nepal restaurant",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers oneSignalAppId={oneSignalAppId}>{children}</Providers>
      </body>
    </html>
  );
}
