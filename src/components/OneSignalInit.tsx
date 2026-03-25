"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

/* ── OneSignal SDK v16 type surface (only what we use) ── */
interface OneSignalNS {
  init: (opts: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Notifications: {
    permission: boolean;
    permissionNative: "default" | "granted" | "denied";
    requestPermission: () => Promise<void>;
    addEventListener: (event: string, cb: (perm: boolean) => void) => void;
    removeEventListener: (event: string, cb: (perm: boolean) => void) => void;
  };
}

type WindowOS = Window & {
  OneSignalDeferred?: Array<(os: OneSignalNS) => void | Promise<void>>;
};

/* ── Component ── */
export default function OneSignalInit({ appId }: { appId?: string }) {
  const { data: session, status } = useSession();
  const didInit = useRef(false);
  const [showBanner, setShowBanner] = useState(false);
  const [permState, setPermState] = useState<"default" | "granted" | "denied">("default");

  /* 1. Load SDK + init */
  useEffect(() => {
    if (!appId || didInit.current) return;
    didInit.current = true;

    const win = window as WindowOS;
    win.OneSignalDeferred = win.OneSignalDeferred || [];

    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
          autoResubscribe: true,
        });

        // Read initial permission state
        const native = OneSignal.Notifications.permissionNative;
        setPermState(native);

        // Listen for changes
        OneSignal.Notifications.addEventListener("permissionChange", (granted: boolean) => {
          setPermState(granted ? "granted" : "denied");
          if (granted) setShowBanner(false);
        });
      } catch {
        // SDK init failed — app still works without push
      }
    });

    if (!document.getElementById("onesignal-sdk")) {
      const script = document.createElement("script");
      script.id = "onesignal-sdk";
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [appId]);

  /* 2. Sync auth — login/logout */
  useEffect(() => {
    if (!appId || status === "loading") return;

    const win = window as WindowOS;
    win.OneSignalDeferred = win.OneSignalDeferred || [];

    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (session?.user?.id) {
          await OneSignal.login(session.user.id);
        } else {
          await OneSignal.logout();
        }
      } catch {
        // Ignore — user can still use the app
      }
    });
  }, [appId, session?.user?.id, status]);

  /* 3. Show banner for logged-in users who haven't granted permission */
  useEffect(() => {
    if (!appId || status === "loading") return;
    if (!session?.user) {
      setShowBanner(false);
      return;
    }
    // Only prompt if permission is "default" (never asked or dismissed)
    if (permState === "default") {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
    setShowBanner(false);
  }, [appId, status, session?.user, permState]);

  /* 4. Handle enable tap — triggers native browser prompt */
  const handleEnable = useCallback(() => {
    const win = window as WindowOS;
    win.OneSignalDeferred = win.OneSignalDeferred || [];
    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
      } catch {
        // user denied or browser blocked
      }
      setShowBanner(false);
    });
  }, []);

  /* Don't render if no session, already granted, or explicitly denied */
  if (!showBanner) return null;

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
