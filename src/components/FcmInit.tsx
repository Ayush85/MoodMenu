"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, X } from "lucide-react";
import { getToken, onMessage } from "firebase/messaging";
import { getFcmMessaging } from "@/lib/firebase-client";

async function registerToken(token: string) {
  try {
    await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Ignore — user can still use the app without push
  }
}

const DISMISS_KEY = "menuor:push-banner-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function wasRecentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode / blocked storage — the banner just reappears next visit
  }
}

async function unregisterToken(token: string) {
  try {
    await fetch("/api/push/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // Ignore
  }
}

export default function FcmInit() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const didInit = useRef(false);
  const currentToken = useRef<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [permState, setPermState] = useState<NotificationPermission>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  /* 1. Register SW */
  useEffect(() => {
    if (didInit.current || typeof window === "undefined" || !("Notification" in window)) return;
    didInit.current = true;

    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch(() => {
        // SW registration failed — app still works without push
      });
  }, []);

  /* 2. Sync auth — register/unregister token */
  const userId = session?.user?.id;

  const syncToken = useCallback(async () => {
    if (!vapidKey || status === "loading") return;
    if (Notification.permission !== "granted") return;

    try {
      const messaging = await getFcmMessaging();
      if (!messaging) return;

      // navigator.serviceWorker.ready never resolves if the worker's
      // install step failed (e.g. a precached URL 404ing) — it just hangs
      // forever with no error, which is exactly what silently broke push
      // registration once before. Time it out instead of trusting it.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("service worker not ready after 10s")), 10000)),
      ]);
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (userId && token) {
        currentToken.current = token;
        await registerToken(token);
      } else if (!userId && currentToken.current) {
        await unregisterToken(currentToken.current);
        currentToken.current = null;
      }
    } catch (error) {
      // Still don't block the app on push failing, but make it visible
      // instead of silently doing nothing — this exact silence is what let
      // push stay broken for a while without anyone being able to tell why.
      console.error("[FcmInit] push token sync failed:", error);
    }
  }, [vapidKey, userId, status]);

  useEffect(() => {
    syncToken();
  }, [syncToken]);

  /* 3. Foreground message handler */
  useEffect(() => {
    if (!vapidKey) return;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const messaging = await getFcmMessaging();
      if (!messaging) return;
      unsubscribe = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        if (title && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/logo.svg" });
        }
      });
    })();

    return () => unsubscribe?.();
  }, [vapidKey]);

  /* 4. Show banner for logged-in users who haven't granted permission */
  const shouldOfferPrompt =
    Boolean(vapidKey) && status !== "loading" && Boolean(session?.user) && permState === "default";

  useEffect(() => {
    if (!shouldOfferPrompt || wasRecentlyDismissed()) return;
    const timer = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(timer);
  }, [shouldOfferPrompt]);

  const displayBanner = showBanner && shouldOfferPrompt;

  /* 5. Handle enable tap — triggers native browser prompt */
  const handleEnable = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermState(permission);
      if (permission === "granted") await syncToken();
    } catch {
      // user denied or browser blocked
    }
    setShowBanner(false);
  }, [syncToken]);

  const dismiss = () => {
    rememberDismissal();
    setShowBanner(false);
  };

  if (!displayBanner) return null;

  // Phones show the restaurant quick-nav bar at the bottom; sit above it.
  const aboveQuickNav = /\/dashboard\/restaurant\/(?!new(?:\/|$))[^/]+/.test(pathname);

  return (
    <section
      aria-label="Enable notifications"
      className={`animate-fade-in-up fixed inset-x-3 z-50 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 pl-4 shadow-xl md:inset-x-auto md:bottom-4 md:right-4 md:max-w-md ${
        aboveQuickNav ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
      }`}
    >
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-800">
        <Bell className="size-4.5" />
      </span>
      <p className="flex-1 text-sm leading-snug text-gray-700">
        Get alerted about waiter calls and new orders, even when this tab isn&apos;t open.
      </p>
      <button
        onClick={handleEnable}
        className="min-h-11 shrink-0 rounded-lg bg-orange-700 px-4 text-sm font-semibold text-white transition hover:bg-orange-800"
      >
        Enable
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification prompt"
        className="grid size-11 shrink-0 place-items-center rounded-lg text-gray-600 transition hover:bg-gray-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </section>
  );
}
