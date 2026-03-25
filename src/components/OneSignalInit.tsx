"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type OneSignalNamespace = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  Slidedown: {
    promptPush: () => Promise<void>;
  };
  Notifications: {
    permission: boolean;
    requestPermission: () => Promise<void>;
  };
};

type WindowWithOneSignal = Window & {
  OneSignalDeferred?: Array<(os: OneSignalNamespace) => void | Promise<void>>;
};

export default function OneSignalInit({ appId }: { appId?: string }) {
  const { data: session, status } = useSession();
  const initialized = useRef(false);

  // Load SDK and initialize
  useEffect(() => {
    if (!appId || initialized.current) return;
    initialized.current = true;

    const win = window as WindowWithOneSignal;
    win.OneSignalDeferred = win.OneSignalDeferred || [];

    // Push init config before loading the script
    win.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          serviceWorkerUpdaterPath: "/OneSignalSDKUpdaterWorker.js",
          notifyButton: { enable: true },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: true,
                  text: {
                    actionMessage: "Get notified when customers call for a waiter!",
                    acceptButton: "Allow",
                    cancelButton: "Later",
                  },
                  delay: { pageViews: 1, timeDelay: 3 },
                },
              ],
            },
          },
        });
      } catch {
        // Ignore init errors to avoid blocking app render.
      }
    });

    // Load the SDK script
    if (!document.getElementById("onesignal-sdk")) {
      const script = document.createElement("script");
      script.id = "onesignal-sdk";
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, [appId]);

  // Sync auth state with OneSignal
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
        // Ignore auth sync errors
      }
    });
  }, [appId, session?.user?.id, status]);

  return null;
}
