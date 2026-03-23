"use client";

import { MoodTheme } from "@/types";

interface Props {
  ssid: string;
  password: string | null;
  isOpen: boolean;
  onToggle: () => void;
  theme: MoodTheme;
}

export default function WifiPanel({ ssid, password, isOpen, onToggle, theme }: Props) {
  const isDark = theme.mode === "dark";

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied`);
    } catch {
      alert(`Could not copy ${label.toLowerCase()}`);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full text-left rounded-2xl px-4 py-3 transition-all duration-200"
        style={{
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
          boxShadow: isDark ? "none" : "0 1px 6px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)" }}
            >
              <span className="text-base">📶</span>
            </div>
            <div>
              <p className="text-sm font-bold">Free WiFi</p>
              <p className="text-[11px] opacity-40">{ssid}</p>
            </div>
          </div>
          <svg
            className="w-4 h-4 opacity-40 transition-transform"
            style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div
          className="mt-2 rounded-2xl p-4 animate-fade-in"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
            boxShadow: isDark ? "none" : "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-40 mb-0.5">Network</p>
              <p className="text-sm font-mono font-bold">{ssid}</p>
            </div>
            <button
              onClick={() => copyToClipboard(ssid, "SSID")}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
            >
              Copy
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-40 mb-0.5">Password</p>
              <p className="text-sm font-mono font-bold">{password || "(Open network)"}</p>
            </div>
            {password && (
              <button
                onClick={() => copyToClipboard(password, "Password")}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
              >
                Copy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
