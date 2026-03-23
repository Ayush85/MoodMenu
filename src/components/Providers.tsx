"use client";

import { SessionProvider } from "next-auth/react";
import OneSignalInit from "@/components/OneSignalInit";
import { ToastProvider } from "@/components/Toast";

export default function Providers({
  children,
  oneSignalAppId,
}: {
  children: React.ReactNode;
  oneSignalAppId?: string;
}) {
  return (
    <SessionProvider>
      <ToastProvider>
        <OneSignalInit appId={oneSignalAppId} />
        {children}
      </ToastProvider>
    </SessionProvider>
  );
}
