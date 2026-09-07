import { Sun, Cloud, CloudRain, CloudDrizzle, CloudLightning, Snowflake, CloudFog, Armchair } from "lucide-react";
import { MoodTheme, WeatherData } from "@/types";

const WEATHER_ICON: Record<string, typeof Sun> = {
  Clear: Sun, Clouds: Cloud, Rain: CloudRain, Drizzle: CloudDrizzle,
  Thunderstorm: CloudLightning, Snow: Snowflake, Mist: CloudFog, Fog: CloudFog, Haze: CloudFog,
};

interface Props {
  name: string;
  city: string;
  logo: string | null;
  totalItems: number;
  tableNumber: number | null;
  weather: WeatherData | null;
  ruleName: string;
  theme: MoodTheme;
}

export default function MenuHero({ name, city, logo, totalItems, tableNumber, weather, ruleName, theme }: Props) {
  const isDark = theme.mode === "dark";

  return (
    <header className="relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? `linear-gradient(160deg, ${theme.primary}25, ${theme.bg} 70%)`
            : `linear-gradient(160deg, ${theme.primary}18, ${theme.accent}20, ${theme.bg} 80%)`,
        }}
      />

      {/* Decorative circles */}
      <div
        className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: theme.primary }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: theme.accent }}
      />

      <div className="relative max-w-lg mx-auto px-4 pt-3 pb-2">
        {/* Top row: table + weather */}
        <div className="flex items-center justify-between mb-3">
          {tableNumber ? (
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: theme.primary }}
              />
              <div
                className="relative flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full"
                style={{ backgroundColor: theme.primary, color: "#fff", boxShadow: `0 4px 14px ${theme.primary}40` }}
              >
                <Armchair className="w-4 h-4" />
                Table {tableNumber}
              </div>
            </div>
          ) : <div />}

          {weather && (
            <div
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-2xl"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)",
                backdropFilter: "blur(12px)",
                boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {(() => {
                const WeatherIcon = WEATHER_ICON[weather.main] || Cloud;
                return <WeatherIcon className="w-5 h-5 animate-float" style={{ color: theme.primary }} />;
              })()}
              <div>
                <span className="font-bold">{weather.temp}°</span>
                <span className="text-xs opacity-50 ml-1 capitalize">{weather.description}</span>
              </div>
            </div>
          )}
        </div>

        {/* Restaurant info */}
        <div className="flex items-start gap-4">
          {logo && (
            <img
              src={logo}
              alt={name}
              className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-white/20"
            />
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">{name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm opacity-50 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {city}
              </span>
              <span className="opacity-20">•</span>
              <span className="text-sm opacity-50">{totalItems} items</span>
            </div>
          </div>
        </div>

        {/* Mood badge */}
        {ruleName !== "Default" && (
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mt-3"
            style={{
              backgroundColor: theme.primary + "18",
              color: theme.primary,
              border: `1px solid ${theme.primary}25`,
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
            {ruleName}
          </div>
        )}
      </div>

      {/* Wave bottom */}
      <svg viewBox="0 0 1440 24" fill="none" className="w-full block -mb-px" style={{ color: theme.bg }}>
        <path d="M0 24h1440V8c-120 8-320 16-720 16S120 16 0 8v16z" fill="currentColor" />
      </svg>
    </header>
  );
}
