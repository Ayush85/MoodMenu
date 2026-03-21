"use client";

import { SessionProvider } from "next-auth/react";
import OneSignalInit from "@/components/OneSignalInit";

export default function Providers({
  children,
  oneSignalAppId,
}: {
  children: React.ReactNode;
  oneSignalAppId?: string;
}) {
  return (
    <SessionProvider>
      <OneSignalInit appId={oneSignalAppId} />
      {children}
    </SessionProvider>
  );
}
