/**
 * Server-side push notification helper using OneSignal REST API v2.
 * Sends to specific users by their external_id (User.id or RestaurantStaff.id).
 */

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

interface PushPayload {
  title: string;
  body: string;
  userIds: string[];
  url?: string;
  data?: Record<string, string>;
}

export async function sendPush({ title, body, userIds, url, data }: PushPayload): Promise<boolean> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey || userIds.length === 0) return false;

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: { external_id: userIds },
        target_channel: "push",
        headings: { en: title },
        contents: { en: body },
        ...(url && { url }),
        ...(data && { data }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Push] OneSignal error:", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Push] Network error:", err);
    return false;
  }
}
