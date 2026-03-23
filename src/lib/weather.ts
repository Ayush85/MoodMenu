import { WeatherData } from "@/types";

export async function getWeather(city: string): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes (works on Vercel + self-hosted)
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

    return data;
  } catch {
    return null;
  }
}
