import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { getRestaurantLandingUrl } from "@/lib/restaurant-site";
import { DEFAULT_THEME, MoodTheme, LandingPageContent } from "@/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, city: true, logo: true, brandTheme: true, landingPage: true, customDomain: true, domainVerifiedAt: true, landingEnabled: true },
  });

  const theme: MoodTheme = { ...DEFAULT_THEME, ...(restaurant?.brandTheme as unknown as Partial<MoodTheme> | null) };
  const content = restaurant?.landingPage as unknown as LandingPageContent | null;
  const name = restaurant?.name || "Menuor";
  const tagline = content?.tagline || restaurant?.city;
  const logoUrl = restaurant?.logo
    ? new URL(restaurant.logo, getRestaurantLandingUrl({ ...restaurant, slug })).toString()
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: theme.bg,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 14, background: theme.primary, display: "flex" }} />
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            width={120}
            height={120}
            style={{ borderRadius: 24, objectFit: "cover", marginBottom: 32 }}
            alt=""
          />
        )}
        <span style={{ fontSize: 72, fontWeight: 800, color: theme.text, letterSpacing: -2, textAlign: "center", maxWidth: 1000 }}>
          {name}
        </span>
        {tagline && (
          <span style={{ marginTop: 16, fontSize: 32, color: theme.text, opacity: 0.65, textAlign: "center", maxWidth: 900 }}>
            {tagline}
          </span>
        )}
      </div>
    ),
    { ...size }
  );
}
