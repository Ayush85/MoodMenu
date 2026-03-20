import QRCode from "qrcode";

export async function generateMenuQR(slug: string, tableNumber?: number): Promise<string> {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  let menuUrl = `${baseUrl}/menu/${slug}`;
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
