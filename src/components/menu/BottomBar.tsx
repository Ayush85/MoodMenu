"use client";

import { Wifi, Bell, CheckCircle2, ChevronUp, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { MoodTheme } from "@/types";

interface Props {
  tableNumber: number | null;
  hasWifi: boolean;
  callStatus: "idle" | "calling" | "sent" | "error";
  onCallWaiter: () => void;
  onToggleWifi: () => void;
  cartCount: number;
  cartTotal: number;
  hasActiveOrder: boolean;
  onOpenOrder: () => void;
  theme: MoodTheme;
}

export default function BottomBar({
  tableNumber,
  hasWifi,
  callStatus,
  onCallWaiter,
  onToggleWifi,
  cartCount,
  cartTotal,
  hasActiveOrder,
  onOpenOrder,
  theme,
}: Props) {
  const isDark = theme.mode === "dark";

  if (!tableNumber && !hasWifi) return null;

  return (
    <>
      <div className="h-[calc(5.5rem+env(safe-area-inset-bottom))]" />

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="max-w-lg mx-auto px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center gap-2"
          style={{
            backgroundColor: isDark ? "rgba(15,15,20,0.95)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          {/* WiFi button */}
          {hasWifi && (
            <button
              type="button"
              onClick={onToggleWifi}
              aria-label="Show WiFi details"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Wifi className="w-5 h-5" style={{ opacity: 0.7 }} />
            </button>
          )}

          {/* Ordering is the primary table action. */}
          {tableNumber && (
            <button
              type="button"
              onClick={onOpenOrder}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-left text-white shadow-sm"
              style={{
                backgroundColor: theme.primary,
                boxShadow: `0 4px 16px ${theme.primary}30`,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <ShoppingBag className="h-4.5 w-4.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold leading-tight">{cartCount > 0 ? "Review order" : hasActiveOrder ? "Track order" : "Your order"}</span>
                <span className="block text-[10px] font-medium text-white/75 leading-tight">{cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? "s" : ""} · ${formatPrice(cartTotal)}` : hasActiveOrder ? "View live status" : "Add items from the menu"}</span>
              </span>
            </button>
          )}

          {/* Call Waiter is intentionally secondary to ordering. */}
          {tableNumber && (
            <button
              type="button"
              onClick={() => { if (callStatus !== "calling" && callStatus !== "sent") onCallWaiter(); }}
              disabled={callStatus === "calling"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-60"
              style={{ backgroundColor: callStatus === "sent" ? "#22c55e" : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"), color: callStatus === "sent" ? "#fff" : theme.text }}
              aria-label={callStatus === "sent" ? "Waiter called" : "Call waiter"}
              title={callStatus === "sent" ? "Waiter called" : "Call waiter"}
            >
              {callStatus === "sent" ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </button>
          )}

          {/* Scroll to top */}
          {!tableNumber && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Scroll to top"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <ChevronUp className="w-5 h-5" style={{ opacity: 0.5 }} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
