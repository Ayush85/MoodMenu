"use client";

import { MoodTheme } from "@/types";

interface Props {
  tableNumber: number;
  callMessage: string;
  callStatus: "idle" | "calling" | "sent" | "error";
  onMessageChange: (msg: string) => void;
  onCall: () => void;
  onClose: () => void;
  theme: MoodTheme;
}

export default function CallWaiterModal({ tableNumber, callMessage, callStatus, onMessageChange, onCall, onClose, theme }: Props) {
  const isDark = theme.mode === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up"
        style={{
          backgroundColor: isDark ? "#1a1a1f" : "#ffffff",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mb-6"
          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }}
        />
        <h3 className="text-xl font-bold mb-2">Call Waiter</h3>
        <p className="text-sm opacity-50 mb-5">
          Table {tableNumber} — a staff member will come to your table
        </p>

        <textarea
          value={callMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Any special request? (optional)"
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 rounded-xl border text-sm mb-4 resize-none outline-none transition"
          style={{
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            color: isDark ? "#fff" : "#000",
          }}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-semibold transition text-sm"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }}
          >
            Cancel
          </button>
          <button
            onClick={onCall}
            disabled={callStatus === "calling"}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition text-sm disabled:opacity-50"
            style={{ backgroundColor: theme.primary, boxShadow: `0 4px 16px ${theme.primary}30` }}
          >
            {callStatus === "calling" ? "Calling..." : "🔔 Call Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
