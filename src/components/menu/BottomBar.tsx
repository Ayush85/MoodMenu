"use client";

import { MoodTheme } from "@/types";

interface Props {
  tableNumber: number | null;
  hasWifi: boolean;
  callStatus: "idle" | "calling" | "sent" | "error";
  onCallWaiter: () => void;
  onToggleWifi: () => void;
  theme: MoodTheme;
}

export default function BottomBar({ tableNumber, hasWifi, callStatus, onCallWaiter, onToggleWifi, theme }: Props) {
  const isDark = theme.mode === "dark";

  if (!tableNumber && !hasWifi) return null;

  return (
    <>
      {/* Spacer */}
      <div className="h-24" />

      {/* Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: isDark ? "rgba(15,15,20,0.92)" : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
          }}
        >
          {/* WiFi button */}
          {hasWifi && (
            <button
              onClick={onToggleWifi}
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
              }}
            >
              <span className="text-lg">📶</span>
            </button>
          )}

          {/* Call Waiter button */}
          {tableNumber && (
            <button
              onClick={onCallWaiter}
              disabled={callStatus === "calling" || callStatus === "sent"}
              className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-70"
              style={{
                backgroundColor: callStatus === "sent" ? "#22c55e" : theme.primary,
                boxShadow: callStatus === "sent"
                  ? "0 4px 16px rgba(34,197,94,0.3)"
                  : `0 4px 16px ${theme.primary}30`,
              }}
            >
              {callStatus === "sent"
                ? "✅ Waiter called!"
                : callStatus === "calling"
                ? "Calling..."
                : "🔔 Call Waiter"}
            </button>
          )}

          {/* Scroll to top */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            }}
          >
            <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
