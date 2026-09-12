"use client";

import { MoodTheme } from "@/types";
import { formatPrice } from "@/lib/format";

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string[];
}

const TAG_COLORS: Record<string, string> = {
  hot: "#ef4444", spicy: "#f97316", cold: "#3b82f6", iced: "#06b6d4",
  vegan: "#22c55e", popular: "#f59e0b", comfort: "#8b5cf6", fresh: "#10b981",
  crispy: "#d97706", tea: "#059669", coffee: "#92400e", refreshing: "#0891b2",
  soup: "#dc2626", warm: "#ea580c", special: "#7c3aed", breakfast: "#16a34a",
};

interface Props {
  item: MenuItemData;
  onClose: () => void;
  theme: MoodTheme;
}

export default function ItemDetailModal({ item, onClose, theme }: Props) {
  const isDark = theme.mode === "dark";
  const initial = item.name.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          backgroundColor: isDark ? "#1a1a1f" : "#ffffff",
          color: isDark ? "#fff" : "#000",
        }}
      >
        {/* Image */}
        {item.image ? (
          <div className="relative">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-56 object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)" }}
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="relative">
            <div
              className="w-full h-40 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}30)` }}
            >
              <span className="text-6xl font-black opacity-15" style={{ color: theme.primary }}>
                {initial}
              </span>
            </div>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                backdropFilter: "blur(8px)",
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 pb-8">
          {/* Name + Price */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-bold leading-snug">{item.name}</h2>
            <span
              className="text-lg font-extrabold shrink-0 px-3 py-1 rounded-xl"
              style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
            >
              {formatPrice(item.price)}
            </span>
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-sm opacity-55 leading-relaxed mb-4">
              {item.description}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {item.tags.map((tag) => {
                const color = TAG_COLORS[tag.toLowerCase()] || theme.primary;
                return (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: color + "15", color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    {tag}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
