import QRCode from "qrcode";
import { getRestaurantMenuUrl } from "@/lib/restaurant-site";

export async function generateMenuQR(
  slug: string,
  tableNumber?: number,
  customDomain?: string | null,
  landingEnabled?: boolean,
  domainVerifiedAt?: Date | string | null
): Promise<string> {
  let menuUrl = getRestaurantMenuUrl({
    slug,
    customDomain,
    landingEnabled,
    domainVerifiedAt,
  });

  if (tableNumber) menuUrl += `?table=${tableNumber}`;

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
