"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, X } from "lucide-react";
import { MoodTheme, WeatherData } from "@/types";
import QRCode from "qrcode";
import MenuHero from "./MenuHero";
import MenuItemCard from "./MenuItemCard";
import FeaturedSection from "./FeaturedSection";
import OffersSection from "./OffersSection";
import type { ActiveOffer } from "@/lib/offers";
import BottomBar from "./BottomBar";
import CallWaiterModal from "./CallWaiterModal";
import ItemDetailModal from "./ItemDetailModal";
import OrderPanel, { CartLine, CustomerOrder } from "./OrderPanel";
import ClassicLayout from "./layouts/ClassicLayout";
import TabbedLayout from "./layouts/TabbedLayout";
import MagazineLayout from "./layouts/MagazineLayout";

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
  offers: ActiveOffer[];
  theme: MoodTheme;
  weather: WeatherData | null;
  ruleName: string;
  greeting: string;
  tableNumber: number | null;
  tableToken: string | null;
  autoOpenWifiPrompt?: boolean;
  previewMode?: boolean;
  cardStyle?: "list" | "grid";
  fontFamily?: string;
  layoutTemplate?: "classic" | "tabbed" | "magazine";
}

const LAYOUT_COMPONENTS = {
  classic: ClassicLayout,
  tabbed: TabbedLayout,
  magazine: MagazineLayout,
};

export default function MenuClient({
  restaurant,
  categories,
  featuredItems,
  todaysSpecials,
  offers,
  theme,
  weather,
  ruleName,
  greeting,
  tableNumber,
  tableToken,
  autoOpenWifiPrompt = false,
  previewMode = false,
  cardStyle = "list",
  fontFamily,
  layoutTemplate = "classic",
}: Props) {
  const LayoutComponent = LAYOUT_COMPONENTS[layoutTemplate] ?? ClassicLayout;
  const isDark = theme.mode === "dark";
  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

  // Waiter call state
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "sent" | "error">("idle");
  const [callMessage, setCallMessage] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [showWifiRequired, setShowWifiRequired] = useState(false);
  const [wifiVerified, setWifiVerified] = useState(false);

  // WiFi panel
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiQR, setWifiQR] = useState<string | null>(null);

  // Item detail
  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Item search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Customer ordering state. A cart is scoped to the table QR link so it
  // cannot accidentally carry items from another restaurant/table.
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  // A table can have more than one order in flight (customer orders again
  // while the first is still being prepared) — track all of them so placing
  // a second order never silently loses visibility of the first.
  const [activeOrders, setActiveOrders] = useState<CustomerOrder[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const cartHydrated = useRef(false);
  const pendingOrderRequestKey = useRef<string | null>(null);
  // Snapshot of the cart+note the pending key was generated for. If the
  // customer edits their cart after a failed submit and resubmits, reusing
  // the old key would silently hand back the stale order from the first
  // attempt instead of creating one for the edited cart — so the key is
  // only reused when the cart is unchanged from the attempt that made it.
  const pendingOrderSnapshot = useRef<string | null>(null);
  const cartStorageKey = tableNumber ? `menuor-cart:${restaurant.slug}:${tableNumber}` : null;
  const orderStorageKey = tableNumber ? `menuor-active-orders:${restaurant.slug}:${tableNumber}` : null;
  const MAX_TRACKED_ORDERS = 5;

  useEffect(() => {
    pendingOrderRequestKey.current = null;
    pendingOrderSnapshot.current = null;
  }, [tableNumber, tableToken]);

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
        item.tags.some((t) => t.toLowerCase().includes(q)) ||
        item.categoryName.toLowerCase().includes(q)
    );
  }, [searchQuery, allMenuItems]);

  // Generate WiFi QR code
  useEffect(() => {
    if (restaurant.wifiSsid) {
      const wifiString = `WIFI:T:WPA;S:${restaurant.wifiSsid};P:${restaurant.wifiPassword || ""};;`;
      QRCode.toDataURL(wifiString, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
        .then(setWifiQR)
        .catch(() => { });
    }
  }, [restaurant.wifiSsid, restaurant.wifiPassword]);

  // Restore an unfinished cart and the latest order when the guest returns to
  // the menu. The server remains the source of truth for prices and status.
  useEffect(() => {
    cartHydrated.current = false;
    if (!cartStorageKey) {
      setCart([]);
      cartHydrated.current = true;
      return;
    }

    try {
      const storedCart = JSON.parse(localStorage.getItem(cartStorageKey) || "[]") as CartLine[];
      setCart(Array.isArray(storedCart) ? storedCart.filter((item) => item && item.itemId && item.quantity > 0) : []);
    } catch {
      setCart([]);
    } finally {
      cartHydrated.current = true;
    }
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey || !cartHydrated.current) return;
    if (cart.length === 0) localStorage.removeItem(cartStorageKey);
    else localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, cartStorageKey]);

  function readTrackedOrderIds(): string[] {
    if (!orderStorageKey) return [];
    try {
      const stored = JSON.parse(localStorage.getItem(orderStorageKey) || "[]");
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function writeTrackedOrderIds(ids: string[]) {
    if (!orderStorageKey) return;
    const trimmed = ids.slice(0, MAX_TRACKED_ORDERS);
    if (trimmed.length === 0) localStorage.removeItem(orderStorageKey);
    else localStorage.setItem(orderStorageKey, JSON.stringify(trimmed));
  }

  // Restore every order this table was tracking (not just the latest) so a
  // second order placed while the first was still being prepared doesn't
  // orphan the first from the customer's view after a page reload.
  useEffect(() => {
    if (!orderStorageKey || !tableNumber || !tableToken) return;
    const storedIds = readTrackedOrderIds();
    if (storedIds.length === 0) return;
    let cancelled = false;

    Promise.all(
      storedIds.map((id) =>
        fetch(`/api/menu/${restaurant.slug}/orders/${id}?table=${tableNumber}&t=${encodeURIComponent(tableToken)}`)
          .then((res) => (res.ok ? (res.json() as Promise<CustomerOrder>) : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const orders = results.filter((order): order is CustomerOrder => order !== null);
      setActiveOrders(orders);
      // Prune ids that no longer resolve (deleted, or belonged to a stale
      // table token) so they don't get retried forever.
      writeTrackedOrderIds(orders.map((order) => order.id));
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStorageKey, restaurant.slug, tableNumber, tableToken]);

  useEffect(() => {
    const trackedIds = activeOrders.filter((order) => !["PAID", "CANCELED"].includes(order.status)).map((order) => order.id);
    if (trackedIds.length === 0 || !tableNumber || !tableToken) return;

    const refresh = () => {
      Promise.all(
        trackedIds.map((id) =>
          fetch(`/api/menu/${restaurant.slug}/orders/${id}?table=${tableNumber}&t=${encodeURIComponent(tableToken)}`)
            .then((res) => (res.ok ? (res.json() as Promise<CustomerOrder>) : null))
            .catch(() => null),
        ),
      ).then((results) => {
        const updates = new Map(results.filter((order): order is CustomerOrder => order !== null).map((order) => [order.id, order]));
        if (updates.size === 0) return;
        setActiveOrders((current) => current.map((order) => updates.get(order.id) || order));
      });
    };
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrders, restaurant.slug, tableNumber, tableToken]);

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
        body: JSON.stringify({ tableNumber, tableToken, message: "__wifi_check__" }),
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
        body: JSON.stringify({ tableNumber, tableToken, message: callMessage || undefined }),
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

  const itemsWrapperClass = cardStyle === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2";

  function addToCart(item: MenuItemData, quantity = 1) {
    if (!tableNumber) return;
    setOrderError(null);
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id);
      if (existing) {
        return current.map((line) => line.itemId === item.id ? { ...line, quantity: Math.min(20, line.quantity + quantity), price: item.price } : line);
      }
      return [...current, { itemId: item.id, itemName: item.name, price: item.price, quantity: Math.min(20, quantity) }];
    });
    setSelectedItem(null);
  }

  function setCartQuantity(itemId: string, quantity: number) {
    setCart((current) => quantity <= 0
      ? current.filter((line) => line.itemId !== itemId)
      : current.map((line) => line.itemId === itemId ? { ...line, quantity: Math.min(20, quantity) } : line));
  }

  async function submitCustomerOrder(note: string) {
    if (!tableNumber || !tableToken || cart.length === 0) return;
    setIsSubmittingOrder(true);
    setOrderError(null);

    // Only reuse the in-flight idempotency key if the cart is exactly what
    // it was when that key was generated. If the customer edited their cart
    // after an earlier failed attempt, reusing the old key would silently
    // hand back the stale order from that attempt instead of one for the
    // cart they're looking at now.
    const snapshot = JSON.stringify({ items: cart.map((item) => [item.itemId, item.quantity]), note });
    if (pendingOrderRequestKey.current && pendingOrderSnapshot.current !== snapshot) {
      pendingOrderRequestKey.current = null;
    }
    if (!pendingOrderRequestKey.current) {
      pendingOrderRequestKey.current = globalThis.crypto?.randomUUID?.()
        || `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pendingOrderSnapshot.current = snapshot;
    }

    try {
      const response = await fetch(`/api/menu/${restaurant.slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          tableToken,
          idempotencyKey: pendingOrderRequestKey.current,
          note,
          items: cart.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 403) {
        // Same "prove you're at the restaurant" gate as calling a waiter —
        // give it the same dedicated recovery UI instead of a dead-end
        // inline error string.
        setShowWifiRequired(true);
        return;
      }

      if (!response.ok) {
        // The cart is about to change (customer must remove the flagged
        // items), so the pending key must not be reused for that edited
        // cart — clear it now rather than waiting for the snapshot compare
        // above, since we're pruning the cart programmatically here.
        pendingOrderRequestKey.current = null;
        pendingOrderSnapshot.current = null;
        const unavailableIds = Array.isArray(data.unavailableItemIds) ? (data.unavailableItemIds as string[]) : [];
        if (unavailableIds.length > 0) {
          setCart((current) => current.filter((line) => !unavailableIds.includes(line.itemId)));
        }
        setOrderError(data.error || "We could not place your order. Please try again.");
        return;
      }

      const order = data as CustomerOrder;
      setCart([]);
      pendingOrderRequestKey.current = null;
      pendingOrderSnapshot.current = null;
      setActiveOrders((current) => {
        const next = [order, ...current.filter((existing) => existing.id !== order.id)].slice(0, MAX_TRACKED_ORDERS);
        writeTrackedOrderIds(next.map((o) => o.id));
        return next;
      });
    } catch {
      setOrderError("You appear to be offline. Check your connection and try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  function dismissTrackedOrder(orderId: string) {
    setActiveOrders((current) => {
      const next = current.filter((order) => order.id !== orderId);
      writeTrackedOrderIds(next.map((order) => order.id));
      return next;
    });
  }

  return (
    <div
      className="min-h-screen transition-colors duration-700"
      style={{ backgroundColor: theme.bg, color: theme.text, fontFamily }}
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

      <OffersSection offers={offers} theme={theme} />

      {/* Recommended-for-the-weather rail */}
      <div className="max-w-lg mx-auto">
        <FeaturedSection items={featuredItems} ruleName={ruleName} theme={theme} onTap={setSelectedItem} />
      </div>

      <div className="max-w-lg mx-auto px-4">

        {/* ── Item Search Bar ── */}
        <div className="mb-4 relative">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" style={{ color: theme.text }} />
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
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", color: theme.text }}
                aria-label="Cancel search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: theme.text }}
            >
              <Search className="w-4 h-4 opacity-40 shrink-0" />
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
                <div className={itemsWrapperClass}>
                  {searchResults.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      layout={cardStyle}
                      onTap={setSelectedItem}
                      onAdd={tableNumber ? addToCart : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Navigation + content — hidden while searching */}
        <LayoutComponent
          categories={categories}
          todaysSpecials={todaysSpecials}
          theme={theme}
          cardStyle={cardStyle}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          onTapItem={setSelectedItem}
          onAddToOrder={tableNumber ? addToCart : undefined}
          hideContent={showSearch && !!searchQuery}
        />
      </div>

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
      <OrderPanel
        open={showOrderPanel}
        theme={theme}
        cart={cart}
        activeOrders={activeOrders}
        isSubmitting={isSubmittingOrder}
        error={orderError}
        onClose={() => setShowOrderPanel(false)}
        onSubmit={submitCustomerOrder}
        onSetQuantity={setCartQuantity}
        onRemove={(itemId) => setCartQuantity(itemId, 0)}
        onDismissOrder={dismissTrackedOrder}
      />

      <BottomBar
        tableNumber={tableNumber}
        hasWifi={!!restaurant.wifiSsid}
        callStatus={callStatus}
        onCallWaiter={handleCallWaiterTap}
        onToggleWifi={() => setShowWifiModal((v) => !v)}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}
        hasActiveOrder={activeOrders.length > 0}
        onOpenOrder={() => { setOrderError(null); setShowOrderPanel(true); }}
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
          canOrder={!!tableNumber}
          onAddToOrder={tableNumber ? (quantity) => addToCart(selectedItem, quantity) : undefined}
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
