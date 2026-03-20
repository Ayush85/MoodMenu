"use client";

import { useState } from "react";
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
  restaurant: {
    name: string;
    city: string;
    logo: string | null;
    slug: string;
    wifiSsid: string | null;
    wifiPassword: string | null;
  };
  categories: CategoryData[];
  featuredItems: MenuItemData[];
  theme: MoodTheme;
  weather: WeatherData | null;
  ruleName: string;
  greeting: string;
  tableNumber: number | null;
  autoOpenWifiPrompt?: boolean;
}

function getWeatherEmoji(main: string): string {
  const map: Record<string, string> = {
    Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
    Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Fog: "🌫️", Haze: "🌫️",
  };
  return map[main] || "🌤️";
}

export default function MenuClient({
  restaurant,
  categories,
  featuredItems,
  theme,
  weather,
  ruleName,
  greeting,
  tableNumber,
  autoOpenWifiPrompt = false,
}: Props) {
  const isDark = theme.mode === "dark";
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "sent" | "error">("idle");
  const [callMessage, setCallMessage] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [showWifiBanner, setShowWifiBanner] = useState(!!restaurant.wifiSsid);
  const [showWifiPanel, setShowWifiPanel] = useState(
    !!restaurant.wifiSsid && autoOpenWifiPrompt
  );

  async function copyWifi(value: string | null | undefined, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied`);
    } catch {
      alert(`Could not copy ${label.toLowerCase()}`);
    }
  }

  async function callWaiter() {
    if (!tableNumber) return;
    setCallStatus("calling");

    try {
      const res = await fetch(`/api/menu/${restaurant.slug}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber, message: callMessage || undefined }),
      });

      if (res.ok) {
        setCallStatus("sent");
        setShowCallModal(false);
        setCallMessage("");
        setTimeout(() => setCallStatus("idle"), 10000);
      } else {
        const data = await res.json();
        if (res.status === 429) {
          setCallStatus("sent");
          setShowCallModal(false);
        } else {
          alert(data.error || "Failed to call waiter");
          setCallStatus("error");
          setTimeout(() => setCallStatus("idle"), 3000);
        }
      }
    } catch {
      setCallStatus("error");
      setTimeout(() => setCallStatus("idle"), 3000);
    }
  }

  return (
    <div
      className="min-h-screen transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* WiFi Connected Banner */}
      {showWifiBanner && restaurant.wifiSsid && (
        <div
          className="px-5 py-2.5 flex items-center justify-between"
          style={{
            backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)",
            borderBottom: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.12)"}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">📶</span>
            <p className="text-sm font-medium">
              Connected to <span className="font-bold">{restaurant.wifiSsid}</span>
            </p>
          </div>
          <button
            onClick={() => setShowWifiBanner(false)}
            className="text-xs opacity-40 hover:opacity-70 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* WiFi access helper */}
      {restaurant.wifiSsid && (
        <div className="max-w-lg mx-auto px-5 pt-4">
          <button
            onClick={() => setShowWifiPanel((v) => !v)}
            className="w-full text-left rounded-2xl px-4 py-3 border transition"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">WiFi Access</p>
                <p className="text-xs opacity-60">Tap to see SSID and password</p>
              </div>
              <span className="text-xs font-semibold opacity-70">{showWifiPanel ? "Hide" : "Open"}</span>
            </div>
          </button>

          {showWifiPanel && (
            <div
              className="mt-3 rounded-2xl p-4"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-sm font-semibold mb-3">Use the details below to connect</p>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm"><span className="opacity-60">SSID:</span> <span className="font-mono font-semibold">{restaurant.wifiSsid}</span></p>
                <button
                  onClick={() => copyWifi(restaurant.wifiSsid, "SSID")}
                  className="text-xs px-2 py-1 rounded-md"
                  style={{ backgroundColor: theme.primary + "1F", color: theme.primary }}
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm"><span className="opacity-60">Password:</span> <span className="font-mono font-semibold">{restaurant.wifiPassword || "(Open network)"}</span></p>
                {restaurant.wifiPassword && (
                  <button
                    onClick={() => copyWifi(restaurant.wifiPassword, "Password")}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ backgroundColor: theme.primary + "1F", color: theme.primary }}
                  >
                    Copy
                  </button>
                )}
              </div>
              <p className="text-xs opacity-60">
                If WiFi QR does not auto-connect on your phone, open WiFi settings and paste the password.
              </p>
            </div>
          )}
        </div>
      )}

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
          {/* Table badge + Weather */}
          <div className="flex items-center justify-between mb-5">
            {tableNumber ? (
              <div
                className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full"
                style={{
                  backgroundColor: theme.primary,
                  color: "#fff",
                }}
              >
                <span>🪑</span> Table {tableNumber}
              </div>
            ) : <div />}

            {weather && (
              <div
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                }}
              >
                <span className="text-lg">{getWeatherEmoji(weather.main)}</span>
                <span className="font-medium">{weather.temp}°C</span>
              </div>
            )}
          </div>

          {/* Restaurant info */}
          <p className="text-sm opacity-50 mb-1">{greeting}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{restaurant.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm opacity-60">{restaurant.city}</span>
            <span className="opacity-30">|</span>
            <span className="text-sm opacity-60">{totalItems} items</span>
          </div>

          {ruleName !== "Default" && (
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mt-4"
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

        <div className="h-6" style={{
          background: theme.bg,
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
        }} />
      </header>

      <div className="max-w-lg mx-auto px-5 -mt-2">
        {/* Category nav pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5 mb-4">
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
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-5 px-5 snap-x">
              {featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="shrink-0 w-44 rounded-2xl overflow-hidden snap-start"
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
                      style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}40)` }}
                    >
                      <span className="text-4xl opacity-60">🍽️</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-bold text-sm leading-tight">{item.name}</h3>
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
                  className="flex gap-4 p-4 rounded-2xl"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                    boxShadow: isDark ? "none" : "0 1px 8px rgba(0,0,0,0.04)",
                    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}12, ${theme.accent}25)` }}
                    >
                      <span className="text-2xl opacity-40">🍽️</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base leading-snug">{item.name}</h3>
                        <span className="font-extrabold text-base whitespace-nowrap shrink-0" style={{ color: theme.primary }}>
                          Rs. {item.price}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm opacity-50 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    {item.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
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
                <div className="text-center py-8 rounded-2xl opacity-40"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}
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

        {/* Bottom spacing for FAB */}
        {tableNumber && <div className="h-24" />}
      </div>

      {/* Call Waiter FAB */}
      {tableNumber && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-5">
          <div className="max-w-lg w-full">
            {callStatus === "sent" ? (
              <div
                className="w-full py-4 px-6 rounded-2xl text-center font-bold text-white text-base shadow-xl"
                style={{ backgroundColor: "#22c55e" }}
              >
                ✅ Waiter has been called! Please wait...
              </div>
            ) : (
              <button
                onClick={() => setShowCallModal(true)}
                className="w-full py-4 px-6 rounded-2xl text-center font-bold text-white text-base shadow-xl transition active:scale-[0.98]"
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: `0 8px 30px ${theme.primary}50`,
                }}
              >
                🔔 Call Waiter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Call Waiter Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCallModal(false)} />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{
              backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
              color: isDark ? "#fff" : "#000",
            }}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">Call Waiter</h3>
            <p className="text-sm opacity-60 mb-5">
              Table {tableNumber} — a staff member will come to your table
            </p>

            <textarea
              value={callMessage}
              onChange={(e) => setCallMessage(e.target.value)}
              placeholder="Any special request? (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border text-sm mb-4 resize-none outline-none focus:ring-2"
              style={{
                borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                color: isDark ? "#fff" : "#000",
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCallModal(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold transition text-sm"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={callWaiter}
                disabled={callStatus === "calling"}
                className="flex-1 py-3.5 rounded-xl font-bold text-white transition text-sm disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {callStatus === "calling" ? "Calling..." : "🔔 Call Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
