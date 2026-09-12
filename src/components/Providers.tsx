"use client";

import { SessionProvider } from "next-auth/react";
import FcmInit from "@/components/FcmInit";
import { ToastProvider } from "@/components/Toast";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <FcmInit />
        <PwaInstallPrompt />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
