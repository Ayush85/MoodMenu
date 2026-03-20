import { WeatherData } from "@/types";

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function getWeather(city: string): Promise<WeatherData | null> {
  const key = city.toLowerCase();
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    );

    if (!res.ok) return null;

    const json = await res.json();
    const data: WeatherData = {
      main: json.weather[0].main,
      description: json.weather[0].description,
      temp: Math.round(json.main.temp),
      icon: json.weather[0].icon,
      city: json.name,
    };

    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}
