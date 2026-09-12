"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/Toast";

// FcmInit and PwaInstallPrompt are intentionally NOT mounted here — they
// register a service worker, ask for notification permission, and offer a
// PWA install prompt, none of which apply to customers browsing a public
// menu. They're mounted only in the dashboard layout, which is what both
// restaurant admins and staff render.
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
