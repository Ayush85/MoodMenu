"use client";

import { useState, useCallback } from "react";
import { MoodTheme, WeatherData } from "@/types";
import MenuHero from "./MenuHero";
import CategoryNav from "./CategoryNav";
import MenuItemCard from "./MenuItemCard";
import BottomBar from "./BottomBar";
import CallWaiterModal from "./CallWaiterModal";
import ItemDetailModal from "./ItemDetailModal";

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
  todaysSpecials: MenuItemData[];
  theme: MoodTheme;
  weather: WeatherData | null;
  ruleName: string;
  greeting: string;
  tableNumber: number | null;
  autoOpenWifiPrompt?: boolean;
}

export default function MenuClient({
  restaurant,
  categories,
  featuredItems,
  todaysSpecials,
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
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  async function callWaiter() {
    if (!tableNumber) return;
    setCallStatus("calling");

    try {
      const res = await fetch(`/api/menu/${restaurant.slug}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber, message: callMessage || undefined }),
      });

      if (res.ok || res.status === 429) {
        setCallStatus("sent");
        setShowCallModal(false);
        setCallMessage("");
        setTimeout(() => setCallStatus("idle"), 10000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to call waiter");
        setCallStatus("error");
        setTimeout(() => setCallStatus("idle"), 3000);
      }
    } catch {
      setCallStatus("error");
      setTimeout(() => setCallStatus("idle"), 3000);
    }
  }

  // Merge specials (deduplicated from featured)
  const featuredIds = new Set(featuredItems.map((i) => i.id));
  const uniqueSpecials = todaysSpecials.filter((i) => !featuredIds.has(i.id));

  return (
    <div
      className="min-h-screen transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Hero */}
      <MenuHero
        name={restaurant.name}
        city={restaurant.city}
        logo={restaurant.logo}
        greeting={greeting}
        totalItems={totalItems}
        tableNumber={tableNumber}
        weather={weather}
        ruleName={ruleName}
        theme={theme}
      />

      <div className="max-w-lg mx-auto px-4">
        {/* Category Navigation */}
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          theme={theme}
        />

        {/* Menu Categories */}
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} className="mb-4 scroll-mt-14">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-sm font-extrabold">{cat.name}</h2>
              <div className="flex-1 h-px" style={{
                background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }} />
              <span className="text-xs font-medium opacity-30">{cat.items.length}</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {cat.items.map((item) => (
                <MenuItemCard key={item.id} item={item} theme={theme} onTap={setSelectedItem} />
              ))}

              {cat.items.length === 0 && (
                <div
                  className="flex flex-col items-center py-10 rounded-2xl opacity-30"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
                >
                  <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">No items yet</p>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Footer */}
        <footer className="text-center py-10 opacity-20">
          <div className="w-8 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: theme.primary + "30" }} />
          <p className="text-xs">Powered by <span className="font-semibold">MoodMenu</span></p>
        </footer>
      </div>

      {/* WiFi Modal */}
      {showWifiModal && restaurant.wifiSsid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowWifiModal(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up"
            style={{ backgroundColor: isDark ? "#1a1a1f" : "#ffffff", color: isDark ? "#fff" : "#000" }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
            <h3 className="text-xl font-bold mb-1">📶 WiFi Access</h3>
            <p className="text-sm opacity-50 mb-5">Connect to the restaurant WiFi</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Network</p>
                  <p className="font-mono font-bold">{restaurant.wifiSsid}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard?.writeText(restaurant.wifiSsid!); alert("SSID copied"); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
                >Copy</button>
              </div>
              {restaurant.wifiPassword && (
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Password</p>
                    <p className="font-mono font-bold">{restaurant.wifiPassword}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(restaurant.wifiPassword!); alert("Password copied"); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
                  >Copy</button>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowWifiModal(false)}
              className="w-full mt-5 py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}
            >Done</button>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <BottomBar
        tableNumber={tableNumber}
        hasWifi={!!restaurant.wifiSsid}
        callStatus={callStatus}
        onCallWaiter={() => setShowCallModal(true)}
        onToggleWifi={() => setShowWifiModal(true)}
        theme={theme}
      />

      {/* Call Waiter Modal */}
      {showCallModal && tableNumber && (
        <CallWaiterModal
          tableNumber={tableNumber}
          callMessage={callMessage}
          callStatus={callStatus}
          onMessageChange={setCallMessage}
          onCall={callWaiter}
          onClose={() => setShowCallModal(false)}
          theme={theme}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
