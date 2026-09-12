import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";
import { withApiLogging } from "@/lib/api-handler";

export const GET = withApiLogging(async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");
  const latitude = req.nextUrl.searchParams.get("lat");
  const longitude = req.nextUrl.searchParams.get("lon");

  const parsedLatitude = latitude !== null ? Number(latitude) : null;
  const parsedLongitude = longitude !== null ? Number(longitude) : null;

  if (!city && (parsedLatitude === null || parsedLongitude === null)) {
    return NextResponse.json(
      { error: "City or latitude/longitude is required" },
      { status: 400 }
    );
  }

  const weather = await getWeather({
    city,
    latitude: parsedLatitude,
    longitude: parsedLongitude,
  });

  if (!weather) {
    return NextResponse.json(
      { error: "Could not fetch weather" },
      { status: 503 }
    );
  }

  return NextResponse.json(weather);
});
