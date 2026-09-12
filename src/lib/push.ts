/**
 * Server-side push notification helper using Firebase Cloud Messaging.
 * Sends to specific users by looking up their registered device tokens.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "./db";
import { logger } from "./logger";

interface PushPayload {
  title: string;
  body: string;
  userIds: string[];
  url?: string;
  data?: Record<string, string>;
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function sendPush({ title, body, userIds, url, data }: PushPayload): Promise<boolean> {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY || userIds.length === 0) {
    return false;
  }

  const tokens = await prisma.pushToken.findMany({
    where: { ownerId: { in: userIds } },
    select: { token: true },
  });

  if (tokens.length === 0) return false;

  try {
    const messaging = getMessaging(getAdminApp());

    const res = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title, body },
      data: { ...(url && { url }), ...(data || {}) },
      webpush: url ? { fcmOptions: { link: url } } : undefined,
    });

    const staleTokens = res.responses
      .map((r, i) =>
        !r.success && r.error?.code === "messaging/registration-token-not-registered"
          ? tokens[i].token
          : null
      )
      .filter((t): t is string => t !== null);

    if (staleTokens.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: staleTokens } } });
    }

    return res.successCount > 0;
  } catch (err) {
    logger.error("push.fcm_send_failed", { error: err });
    return false;
  }
}
