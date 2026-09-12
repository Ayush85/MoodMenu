import QRCode from "qrcode";
import { getRestaurantMenuUrl } from "@/lib/restaurant-site";
import { signTableToken } from "@/lib/table-token";

export async function generateMenuQR(
  slug: string,
  tableNumber?: number,
  customDomain?: string | null,
  landingEnabled?: boolean,
  domainVerifiedAt?: Date | string | null,
  restaurantId?: string
): Promise<string> {
  let menuUrl = getRestaurantMenuUrl({
    slug,
    customDomain,
    landingEnabled,
    domainVerifiedAt,
  });

  // A table-scoped QR must carry a signed token, or the public menu treats
  // the table number as untrusted (see src/lib/table-token.ts) — a caller
  // that passes tableNumber without restaurantId gets a QR that opens the
  // menu but can't call a waiter, so fail loudly instead of silently.
  if (tableNumber) {
    if (!restaurantId) throw new Error("generateMenuQR: restaurantId is required when tableNumber is set");
    menuUrl += `?table=${tableNumber}&t=${signTableToken(restaurantId, tableNumber)}`;
  }

  return QRCode.toDataURL(menuUrl, {
    width: 400,
    margin: 2,
    color: { dark: "#1F2937", light: "#FFFFFF" },
  });
}

export async function generateWifiQR(ssid: string, password: string): Promise<string> {
  // Standard WiFi QR format — phones auto-recognize and connect
  const wifiString = `WIFI:T:WPA;S:${ssid};P:${password};;`;

  return QRCode.toDataURL(wifiString, {
    width: 400,
    margin: 2,
    color: { dark: "#1F2937", light: "#FFFFFF" },
  });
}
