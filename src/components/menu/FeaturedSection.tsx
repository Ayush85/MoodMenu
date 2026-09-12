import { Sparkles } from "lucide-react";
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

interface Props {
  items: MenuItemData[];
  ruleName: string;
  theme: MoodTheme;
  onTap: (item: MenuItemData) => void;
}

export default function FeaturedSection({ items, ruleName, theme, onTap }: Props) {
  const isDark = theme.mode === "dark";
  if (items.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: theme.primary }} />
          <h2 className="text-sm font-extrabold" style={{ color: theme.primary }}>
            {ruleName === "Default" ? "Popular right now" : "Recommended right now"}
          </h2>
        </div>
        <p className="text-xs opacity-40 mt-0.5">
          {ruleName === "Default" ? "A few favourites to get you started" : `Picked for today&apos;s mood — ${ruleName}`}
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1 snap-x snap-mandatory">
        {items.map((item, i) => {
          const initial = item.name.charAt(0).toUpperCase();
          return (
            <button
              key={item.id}
              onClick={() => onTap(item)}
              className="relative w-40 shrink-0 rounded-2xl overflow-hidden text-left snap-start animate-fade-in-up"
              style={{
                animationDelay: `${i * 0.08}s`,
                boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.08)",
                touchAction: "manipulation",
              }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div
                  className="w-full h-32 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${theme.primary}30, ${theme.accent}40)` }}
                >
                  <span className="text-4xl font-black opacity-20" style={{ color: theme.primary }}>
                    {initial}
                  </span>
                </div>
              )}

              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)" }}
              />

              <div
                className="absolute top-2 right-2 text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ backgroundColor: theme.primary, color: "#fff" }}
              >
                {formatPrice(item.price)}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <h3 className="font-bold text-white text-xs leading-snug line-clamp-2">{item.name}</h3>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
