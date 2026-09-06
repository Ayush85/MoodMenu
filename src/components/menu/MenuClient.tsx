"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { MoodTheme, WeatherData } from "@/types";
import QRCode from "qrcode";
import MenuHero from "./MenuHero";
import CategoryNav from "./CategoryNav";
import MenuItemCard from "./MenuItemCard";
import BottomBar from "./BottomBar";
import CallWaiterModal from "./CallWaiterModal";
import ItemDetailModal from "./ItemDetailModal";
import CartDrawer, { CartItem } from "./CartDrawer";

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
  previewMode?: boolean;
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
  previewMode = false,
}: Props) {
  const isDark = theme.mode === "dark";
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const canOrder = tableNumber !== null;

  // Waiter call state
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "sent" | "error">("idle");
  const [callMessage, setCallMessage] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [showWifiRequired, setShowWifiRequired] = useState(false);
  const [wifiVerified, setWifiVerified] = useState(false);

  // WiFi panel
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiQR, setWifiQR] = useState<string | null>(null);

  // Item detail + cart
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Item search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Session
  interface SessionOrder {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    items: { itemName: string; quantity: number; unitPrice: number }[];
  }
  interface ActiveSession {
    id: string;
    totalAmount: number;
    startedAt: string;
    orders: SessionOrder[];
  }
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [showSessionHistory, setShowSessionHistory] = useState(false);

  async function refreshSession() {
    if (!tableNumber) return;
    try {
      const res = await fetch(`/api/menu/${restaurant.slug}/session?table=${tableNumber}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session || null);
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    refreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  // Filtered items for search
  const allMenuItems = useMemo(
    () => categories.flatMap((cat) => cat.items.map((item) => ({ ...item, categoryName: cat.name }))),
    [categories]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allMenuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [searchQuery, allMenuItems]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems]
  );

  function addToCart(item: MenuItemData, qty: number) {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(99, i.quantity + qty) }
            : i
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty, image: item.image }];
    });
  }

  function updateCartQty(id: string, delta: number) {
    setCartItems((prev) => {
      const next = prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      ).filter((i) => i.quantity > 0);
      return next;
    });
  }

  function clearCart() {
    setCartItems([]);
  }

  function getCartQty(itemId: string) {
    return cartItems.find((i) => i.id === itemId)?.quantity ?? 0;
  }

  // Generate WiFi QR code
  useEffect(() => {
    if (restaurant.wifiSsid) {
      const wifiString = `WIFI:T:WPA;S:${restaurant.wifiSsid};P:${restaurant.wifiPassword || ""};;`;
      QRCode.toDataURL(wifiString, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
        .then(setWifiQR)
        .catch(() => { });
    }
  }, [restaurant.wifiSsid, restaurant.wifiPassword]);

  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  // Check WiFi first, then open call modal
  async function handleCallWaiterTap() {
    if (!tableNumber) return;
    if (wifiVerified) {
      setShowCallModal(true);
      return;
    }

    try {
      const res = await fetch(`/api/menu/${restaurant.slug}/call-waiter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber, message: "__wifi_check__" }),
      });

      if (res.status === 403) {
        setShowWifiRequired(true);
        return;
      }

      setWifiVerified(true);
      setShowCallModal(true);
    } catch {
      setShowCallModal(true);
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

      if (res.ok || res.status === 429) {
        setCallStatus("sent");
        setShowCallModal(false);
        setCallMessage("");
        setTimeout(() => setCallStatus("idle"), 10000);
      } else if (res.status === 403) {
        setShowCallModal(false);
        setShowWifiRequired(true);
        setCallStatus("idle");
      } else {
        setCallStatus("error");
        setTimeout(() => setCallStatus("idle"), 3000);
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
      {/* Preview Mode Banner */}
      {previewMode && (
        <div
          className="sticky top-0 z-50 text-center py-1.5 text-xs font-semibold tracking-wide"
          style={{ backgroundColor: theme.primary, color: "#fff" }}
        >
          Preview Mode — {ruleName}
        </div>
      )}

      {/* Hero */}
      <MenuHero
        name={restaurant.name}
        city={restaurant.city}
        logo={restaurant.logo}
        totalItems={totalItems}
        tableNumber={tableNumber}
        weather={weather}
        ruleName={ruleName}
        theme={theme}
      />

      <div className="max-w-lg mx-auto px-4">

        {/* ── Active Session Banner ── */}
        {activeSession && tableNumber && (
          <div
            className="mb-4 rounded-2xl p-3.5 flex items-center justify-between gap-3"
            style={{ backgroundColor: theme.primary + "15", border: `1px solid ${theme.primary}30` }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: theme.primary + "25" }}
              >
                <svg className="w-4 h-4" fill="none" stroke={theme.primary} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: theme.primary }}>
                  Table {tableNumber} · Active Session
                </p>
                <p className="text-[11px] opacity-60" style={{ color: theme.text }}>
                  {activeSession.orders.length} order{activeSession.orders.length !== 1 ? "s" : ""} · Rs. {activeSession.totalAmount.toLocaleString("en-IN")} total
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSessionHistory(true)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0"
              style={{ backgroundColor: theme.primary, color: "#fff" }}
            >
              View
            </button>
          </div>
        )}

        {/* ── Item Search Bar ── */}
        <div className="mb-4 relative">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" fill="none" stroke={theme.text} strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                    color: theme.text,
                    border: `1.5px solid ${theme.primary}40`,
                  }}
                />
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                className="px-3 py-2.5 rounded-xl text-xs font-semibold shrink-0"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: theme.text }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: theme.text }}
            >
              <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="opacity-40">Search {totalItems} items…</span>
            </button>
          )}
        </div>

        {/* ── Search Results ── */}
        {showSearch && searchQuery && (
          <div className="mb-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 opacity-40">
                <p className="text-sm">No items found for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold opacity-40 mb-2 uppercase tracking-wider">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {searchResults.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      onTap={setSelectedItem}
                      cartQty={getCartQty(item.id)}
                      onQuickAdd={canOrder ? (i) => addToCart(i, 1) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Navigation + content — hidden while searching */}
        {!(showSearch && searchQuery) && (
          <>
            <CategoryNav
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
              theme={theme}
            />

            {/* Today's Specials */}
            {todaysSpecials.length > 0 && (
              <section className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⭐</span>
                  <h2 className="text-sm font-extrabold" style={{ color: theme.primary }}>
                    Today&apos;s Specials
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {todaysSpecials.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      onTap={setSelectedItem}
                      cartQty={getCartQty(item.id)}
                      onQuickAdd={canOrder ? (i) => addToCart(i, 1) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

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
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      onTap={setSelectedItem}
                      cartQty={getCartQty(item.id)}
                      onQuickAdd={canOrder ? (i) => addToCart(i, 1) : undefined}
                    />
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
              <p className="text-xs">Powered by <span className="font-semibold">Menuor</span></p>
            </footer>
          </>
        )}
      </div>

      {/* Session History Modal */}
      {showSessionHistory && activeSession && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowSessionHistory(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-3xl animate-slide-up overflow-hidden"
            style={{ backgroundColor: isDark ? "#1a1a1f" : "#ffffff", color: theme.text, maxHeight: "85vh" }}
          >
            <div className="p-5 overflow-y-auto" style={{ maxHeight: "85vh" }}>
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold">Your Session</h3>
                  <p className="text-[11px] opacity-40">Table {tableNumber} · {activeSession.orders.length} order{activeSession.orders.length !== 1 ? "s" : ""}</p>
                </div>
                <div
                  className="text-sm font-extrabold px-3 py-1.5 rounded-xl"
                  style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
                >
                  Rs. {activeSession.totalAmount.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="space-y-3 pb-6">
                {activeSession.orders.map((order, i) => (
                  <div
                    key={order.id}
                    className="rounded-2xl p-3.5"
                    style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold opacity-60">Order #{i + 1}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={{
                          backgroundColor:
                            order.status === "PAID" ? "#10b981" + "20" :
                              order.status === "SERVED" ? "#8b5cf6" + "20" :
                                order.status === "PREPARING" ? "#f59e0b" + "20" : theme.primary + "20",
                          color:
                            order.status === "PAID" ? "#10b981" :
                              order.status === "SERVED" ? "#8b5cf6" :
                                order.status === "PREPARING" ? "#f59e0b" : theme.primary,
                        }}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((line, j) => (
                        <div key={j} className="flex items-center justify-between text-xs">
                          <span className="opacity-70">{line.quantity}× {line.itemName}</span>
                          <span className="font-semibold opacity-80">Rs. {(line.quantity * line.unitPrice).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 flex justify-end" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}` }}>
                      <span className="text-xs font-bold" style={{ color: theme.primary }}>Rs. {order.total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WiFi Modal */}
      {showWifiModal && restaurant.wifiSsid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowWifiModal(false)}
          />
          <div
            className="relative w-full max-w-lg rounded-t-3xl animate-slide-up overflow-y-auto"
            style={{
              backgroundColor: isDark ? "#1a1a1f" : "#ffffff",
              color: isDark ? "#fff" : "#000",
              maxHeight: "85vh",
            }}
          >
            <div className="p-5 pb-24">
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + "15" }}>
                  <svg className="w-4.5 h-4.5" fill="none" stroke={theme.primary} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold">Free WiFi</h3>
                  <p className="text-[11px] opacity-40">Scan QR or enter manually</p>
                </div>
              </div>

              {wifiQR && (
                <div className="flex justify-center mb-3">
                  <div className="bg-white p-2 rounded-xl" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                    <img src={wifiQR} alt="WiFi QR" className="w-32 h-32" draggable={false} />
                  </div>
                </div>
              )}
              <p className="text-center text-[11px] opacity-35 mb-4">Scan with camera to connect</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider font-semibold opacity-40">Network</p>
                    <p className="font-mono font-bold text-sm">{restaurant.wifiSsid}</p>
                  </div>
                  <div
                    role="button" tabIndex={0}
                    onClick={() => { navigator.clipboard?.writeText(restaurant.wifiSsid!).then(() => alert("Copied")); }}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                    style={{ backgroundColor: theme.primary + "15", color: theme.primary, touchAction: "manipulation" }}
                  >Copy</div>
                </div>
                {restaurant.wifiPassword && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-semibold opacity-40">Password</p>
                      <p className="font-mono font-bold text-sm">{restaurant.wifiPassword}</p>
                    </div>
                    <div
                      role="button" tabIndex={0}
                      onClick={() => { navigator.clipboard?.writeText(restaurant.wifiPassword!).then(() => alert("Copied")); }}
                      className="text-[11px] px-2.5 py-1 rounded-lg font-semibold cursor-pointer"
                      style={{ backgroundColor: theme.primary + "15", color: theme.primary, touchAction: "manipulation" }}
                    >Copy</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <BottomBar
        tableNumber={tableNumber}
        hasWifi={!!restaurant.wifiSsid}
        callStatus={callStatus}
        cartCount={cartCount}
        onCallWaiter={handleCallWaiterTap}
        onToggleWifi={() => setShowWifiModal((v) => !v)}
        onOpenCart={() => setShowCart(true)}
        theme={theme}
      />

      {/* Cart Drawer */}
      {showCart && tableNumber && (
        <CartDrawer
          items={cartItems}
          slug={restaurant.slug}
          tableNumber={tableNumber}
          theme={theme}
          onClose={() => { setShowCart(false); refreshSession(); }}
          onUpdateQty={updateCartQty}
          onClear={clearCart}
        />
      )}

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
          canOrder={canOrder}
          cartQty={getCartQty(selectedItem.id)}
          onAddToCart={(item, qty) => {
            addToCart(item, qty);
          }}
        />
      )}

      {/* WiFi Required Modal */}
      {showWifiRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
            onClick={() => setShowWifiRequired(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 text-center animate-fade-in"
            style={{ backgroundColor: isDark ? "#1a1a1f" : "#ffffff", color: isDark ? "#fff" : "#000" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: theme.primary + "15" }}
            >
              <svg className="w-8 h-8" fill="none" stroke={theme.primary} strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
            </div>

            <h3 className="text-lg font-bold mb-2">Connect to WiFi</h3>
            <p className="text-sm opacity-50 mb-5 leading-relaxed">
              Please connect to the restaurant&apos;s WiFi network to call a waiter. This ensures you&apos;re at the restaurant.
            </p>

            {restaurant.wifiSsid && (
              <div
                className="rounded-xl p-3 mb-4 text-left"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Network</span>
                  <span className="font-mono font-bold text-sm">{restaurant.wifiSsid}</span>
                </div>
                {restaurant.wifiPassword && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-40">Password</span>
                    <span className="font-mono font-bold text-sm">{restaurant.wifiPassword}</span>
                  </div>
                )}
              </div>
            )}

            {wifiQR && (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-2 rounded-xl" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <img src={wifiQR} alt="WiFi QR" className="w-28 h-28" draggable={false} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div
                role="button" tabIndex={0}
                onClick={() => setShowWifiRequired(false)}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-center cursor-pointer"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", touchAction: "manipulation" }}
              >
                Close
              </div>
              <div
                role="button" tabIndex={0}
                onClick={() => { setShowWifiRequired(false); setWifiVerified(false); handleCallWaiterTap(); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white text-center cursor-pointer"
                style={{ backgroundColor: theme.primary, touchAction: "manipulation" }}
              >
                Try Again
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
