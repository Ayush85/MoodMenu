"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
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

      const registration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

      if (userId && token) {
        currentToken.current = token;
        await registerToken(token);
      } else if (!userId && currentToken.current) {
        await unregisterToken(currentToken.current);
        currentToken.current = null;
      }
    } catch {
      // Ignore — user can still use the app without push
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
    if (!shouldOfferPrompt) return;
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

  if (!displayBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "14px 16px",
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.25)",
        animation: "slideUp .3s ease-out",
      }}
    >
      <div style={{ fontSize: "22px", flexShrink: 0 }}>🔔</div>
      <p style={{ fontSize: "13px", lineHeight: 1.4, flex: 1, margin: 0 }}>
        Enable notifications to get alerted when customers call for a waiter.
      </p>
      <button
        onClick={handleEnable}
        style={{
          background: "#6366f1",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "8px 18px",
          fontSize: "13px",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Enable
      </button>
      <button
        onClick={() => setShowBanner(false)}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          color: "rgba(255,255,255,0.4)",
          border: "none",
          fontSize: "20px",
          cursor: "pointer",
          padding: "2px 6px",
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
