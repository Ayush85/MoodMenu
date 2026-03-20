import QRCode from "qrcode";

export async function generateQRCode(slug: string): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const menuUrl = `${baseUrl}/menu/${slug}`;

  const dataUrl = await QRCode.toDataURL(menuUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: "#1F2937",
      light: "#FFFFFF",
    },
  });

  return dataUrl;
}
