import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City is required" }, { status: 400 });
  }

  const weather = await getWeather(city);

  if (!weather) {
    return NextResponse.json(
      { error: "Could not fetch weather" },
      { status: 503 }
    );
  }

  return NextResponse.json(weather);
}
