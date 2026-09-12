import { WeatherData } from "@/types";
import { logger } from "@/lib/logger";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WeatherLocation {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function getWeather(location: WeatherLocation): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  const hasCoordinates =
    typeof location.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude);

  const DEFAULT_CITY = "Kathmandu";

  const query = hasCoordinates
    ? `lat=${location.latitude}&lon=${location.longitude}`
    : location.city
      ? `q=${encodeURIComponent(location.city)}`
      : `q=${encodeURIComponent(DEFAULT_CITY)}`;

  const url = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric`;

  try {
    let res: Response;
    try {
      // Cache for 30 minutes (works on Vercel + self-hosted)
      res = await fetch(url, { next: { revalidate: 1800 } });
    } catch {
      // Transient network failure — one short retry with backoff before giving up.
      await sleep(300);
      res = await fetch(url, { next: { revalidate: 1800 } });
    }

    if (!res.ok) return null;

    const json = await res.json();
    const data: WeatherData = {
      main: json.weather[0].main,
      description: json.weather[0].description,
      temp: Math.round(json.main.temp),
      icon: json.weather[0].icon,
      city: json.name,
    };

    return data;
  } catch (error) {
    logger.warn("weather.fetch_failed", { error, query });
    return null;
  }
}

export async function geocodeLocation(city: string): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey || !city.trim()) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;

    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;

    const match = json[0];
    if (typeof match?.lat !== "number" || typeof match?.lon !== "number") return null;

    return { latitude: match.lat, longitude: match.lon };
  } catch (error) {
    logger.warn("weather.geocode_failed", { error, city });
    return null;
  }
}
