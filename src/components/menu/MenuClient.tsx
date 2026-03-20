"use client";

import { MoodTheme, WeatherData } from "@/types";

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string[];
}

interface CategoryData {
  id: string;
  name: string;
  items: MenuItemData[];
}

interface Props {
  restaurant: { name: string; city: string; logo: string | null };
  categories: CategoryData[];
  featuredItems: MenuItemData[];
  theme: MoodTheme;
  weather: WeatherData | null;
  ruleName: string;
}

function getWeatherEmoji(main: string): string {
  const map: Record<string, string> = {
    Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
    Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Fog: "🌫️", Haze: "🌫️",
  };
  return map[main] || "🌤️";
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Late Night Menu";
}

export default function MenuClient({
  restaurant,
  categories,
  featuredItems,
  theme,
  weather,
  ruleName,
}: Props) {
  const isDark = theme.mode === "dark";
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div
      className="min-h-screen transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Hero Header */}
      <header
        className="relative overflow-hidden"
        style={{
          background: isDark
            ? `linear-gradient(135deg, ${theme.primary}22, ${theme.bg})`
            : `linear-gradient(135deg, ${theme.primary}15, ${theme.accent}30)`,
        }}
      >
        <div className="max-w-lg mx-auto px-5 pt-8 pb-6">
          {/* Weather pill */}
          {weather && (
            <div
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full mb-5"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span className="text-lg">{getWeatherEmoji(weather.main)}</span>
              <span className="font-medium">{weather.temp}°C</span>
              <span className="opacity-60 capitalize">{weather.description}</span>
            </div>
          )}

          {/* Restaurant info */}
          <div className="mb-4">
            <p className="text-sm opacity-50 mb-1">{getTimeGreeting()}</p>
            <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm opacity-60">{restaurant.city}</span>
              <span className="opacity-30">|</span>
              <span className="text-sm opacity-60">{totalItems} items</span>
            </div>
          </div>

          {/* Active mood badge */}
          {ruleName !== "Default" && (
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: theme.primary + "20",
                color: theme.primary,
                border: `1px solid ${theme.primary}30`,
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
              {ruleName}
            </div>
          )}
        </div>

        {/* Decorative bottom wave */}
        <div className="h-6" style={{
          background: theme.bg,
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
        }} />
      </header>

      <div className="max-w-lg mx-auto px-5 -mt-2">
        {/* Category nav pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide mb-4">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="shrink-0 text-sm font-medium px-4 py-2 rounded-full transition-colors"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                }}
              >
                {cat.name}
                <span className="ml-1.5 opacity-40">{cat.items.length}</span>
              </a>
            ))}
          </div>
        )}

        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">✨</span>
              <h2 className="text-base font-bold" style={{ color: theme.primary }}>
                Recommended Right Now
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x scrollbar-hide">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="shrink-0 w-44 rounded-2xl overflow-hidden snap-start transition-transform hover:scale-[1.02]"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
                    border: `1.5px solid ${theme.primary}25`,
                    boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-28 object-cover" />
                  ) : (
                    <div
                      className="w-full h-28 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}40)`,
                      }}
                    >
                      <span className="text-4xl opacity-60">🍽️</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-bold text-sm leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs opacity-50 mt-1 line-clamp-1">{item.description}</p>
                    )}
                    <p className="font-extrabold text-sm mt-2" style={{ color: theme.primary }}>
                      Rs. {item.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu Categories */}
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-4">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-extrabold">{cat.name}</h2>
              <div className="flex-1 h-px" style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              }} />
              <span className="text-xs font-medium opacity-40">{cat.items.length}</span>
            </div>

            <div className="space-y-3">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.04)",
                    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Image */}
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary}12, ${theme.accent}25)`,
                      }}
                    >
                      <span className="text-2xl opacity-40">🍽️</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base leading-snug">{item.name}</h3>
                        <span
                          className="font-extrabold text-base whitespace-nowrap shrink-0"
                          style={{ color: theme.primary }}
                        >
                          Rs. {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm opacity-50 mt-1 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {item.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.primary + "15",
                              color: theme.primary,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {cat.items.length === 0 && (
                <div
                  className="text-center py-8 rounded-2xl opacity-40"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  }}
                >
                  <p className="text-sm">No items in this category yet</p>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="text-center py-10 opacity-30">
          <div className="w-8 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: theme.primary + "40" }} />
          <p className="text-xs">Powered by <span className="font-semibold">MoodMenu</span></p>
        </footer>
      </div>
    </div>
  );
}
