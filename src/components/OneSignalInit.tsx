"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

type OneSignalGlobal = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
};

type WindowWithOneSignal = Window & {
  OneSignal?: OneSignalGlobal;
  OneSignalDeferred?: Array<(oneSignal: OneSignalGlobal) => void | Promise<void>>;
};

export default function OneSignalInit({ appId }: { appId?: string }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!appId) return;

    const win = window as WindowWithOneSignal;
    win.OneSignalDeferred = win.OneSignalDeferred || [];

    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
          allowLocalhostAsSecureOrigin: true,
        });
      } catch {
        // Ignore init errors to avoid blocking app render.
      }
    });

    const existingScript = document.getElementById("onesignal-sdk");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "onesignal-sdk";
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [appId]);

  useEffect(() => {
    if (!appId || status === "loading") return;

    const win = window as WindowWithOneSignal;
    win.OneSignalDeferred = win.OneSignalDeferred || [];

    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        if (session?.user?.id) {
          await OneSignal.login(session.user.id);
        } else {
          await OneSignal.logout();
        }
      } catch {
        // Ignore auth sync errors; user can still use app normally.
      }
    });
  }, [appId, session?.user?.id, status]);

  return null;
}
