"use client";

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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ opacity: 0.7 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
              </svg>
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
              className="flex-1 py-3 rounded-xl font-bold text-white text-sm text-center cursor-pointer select-none"
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
              {callStatus === "sent"
                ? "✅ Waiter called!"
                : callStatus === "calling"
                ? "Calling..."
                : "🔔 Call Waiter"}
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke={cartCount > 0 ? "#fff" : "currentColor"}
                strokeWidth={2}
                viewBox="0 0 24 24"
                style={{ opacity: cartCount > 0 ? 1 : 0.6 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
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
              <svg className="w-5 h-5" style={{ opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
