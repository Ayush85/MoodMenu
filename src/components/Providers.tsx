"use client";

import { SessionProvider } from "next-auth/react";
import FcmInit from "@/components/FcmInit";
import { ToastProvider } from "@/components/Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <FcmInit />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
