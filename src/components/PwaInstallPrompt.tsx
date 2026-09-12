"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => undefined);
    }
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  if (!installEvent || dismissed) return null;

  async function install() {
    await installEvent?.prompt();
    setInstallEvent(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-orange-200 bg-white p-3 shadow-2xl md:inset-x-auto md:right-5 md:bottom-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Download className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><p className="text-sm font-bold text-gray-900">Install Menuor</p><p className="text-[11px] leading-tight text-gray-500">Keep your restaurant tools one tap away.</p></div>
      <button onClick={install} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white">Install</button>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss install prompt" className="p-1 text-gray-400"><X className="h-4 w-4" /></button>
    </div>
  );
}
