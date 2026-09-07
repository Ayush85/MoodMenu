"use client";

import { Wifi, Bell, CheckCircle2, ShoppingCart, ChevronUp } from "lucide-react";
import { MoodTheme } from "@/types";

interface Props {
  tableNumber: number | null;
  hasWifi: boolean;
  callStatus: "idle" | "calling" | "sent" | "error";
  cartCount: number;
  onCallWaiter: () => void;
  onToggleWifi: () => void;
  onOpenCart: () => void;
  theme: MoodTheme;
}

export default function BottomBar({
  tableNumber,
  hasWifi,
  callStatus,
  cartCount,
  onCallWaiter,
  onToggleWifi,
  onOpenCart,
  theme,
}: Props) {
  const isDark = theme.mode === "dark";

  if (!tableNumber && !hasWifi) return null;

  return (
    <>
      <div className="h-20" />

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="max-w-lg mx-auto px-3 py-2.5 flex items-center gap-2"
          style={{
            backgroundColor: isDark ? "rgba(15,15,20,0.95)" : "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          {/* WiFi button */}
          {hasWifi && (
            <div
              role="button"
              tabIndex={0}
              onClick={onToggleWifi}
              onKeyDown={(e) => e.key === "Enter" && onToggleWifi()}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Wifi className="w-5 h-5" style={{ opacity: 0.7 }} />
            </div>
          )}

          {/* Call Waiter button */}
          {tableNumber && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (callStatus !== "calling" && callStatus !== "sent") onCallWaiter();
              }}
              onKeyDown={(e) => e.key === "Enter" && onCallWaiter()}
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm text-center cursor-pointer select-none flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: callStatus === "sent" ? "#22c55e" : theme.primary,
                boxShadow: callStatus === "sent"
                  ? "0 4px 16px rgba(34,197,94,0.3)"
                  : `0 4px 16px ${theme.primary}30`,
                opacity: callStatus === "calling" ? 0.7 : 1,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {callStatus === "sent" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Waiter called!
                </>
              ) : callStatus === "calling" ? (
                "Calling..."
              ) : (
                <>
                  <Bell className="w-4 h-4" /> Call Waiter
                </>
              )}
            </div>
          )}

          {/* Cart button */}
          {tableNumber && (
            <div
              role="button"
              tabIndex={0}
              onClick={onOpenCart}
              onKeyDown={(e) => e.key === "Enter" && onOpenCart()}
              className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: cartCount > 0 ? theme.primary : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <ShoppingCart
                className="w-5 h-5"
                color={cartCount > 0 ? "#fff" : "currentColor"}
                style={{ opacity: cartCount > 0 ? 1 : 0.6 }}
              />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1"
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </div>
          )}

          {/* Scroll to top */}
          {!tableNumber && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              onKeyDown={(e) => e.key === "Enter" && window.scrollTo({ top: 0, behavior: "smooth" })}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <ChevronUp className="w-5 h-5" style={{ opacity: 0.5 }} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
