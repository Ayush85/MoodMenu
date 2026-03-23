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
}

export default function FeaturedSection({ items, ruleName, theme }: Props) {
  const isDark = theme.mode === "dark";
  if (items.length === 0) return null;

  const displayItems = items.slice(0, 4);

  return (
    <section className="mb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-float">⛅</span>
          <h2 className="text-base font-bold" style={{ color: theme.primary }}>
            Weather Picks
          </h2>
        </div>
        <p className="text-xs opacity-40 mt-1">
          Curated for today&apos;s mood{ruleName !== "Default" ? ` — ${ruleName}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayItems.map((item, i) => {
          const initial = item.name.charAt(0).toUpperCase();
          return (
            <div
              key={item.id}
              className="relative rounded-2xl overflow-hidden group animate-fade-in-up"
              style={{
                animationDelay: `${i * 0.1}s`,
                boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              {/* Background */}
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div
                  className="w-full h-40 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}30, ${theme.accent}40)`,
                  }}
                >
                  <span className="text-5xl font-black opacity-20" style={{ color: theme.primary }}>
                    {initial}
                  </span>
                </div>
              )}

              {/* Overlay gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
                }}
              />

              {/* Price badge */}
              <div
                className="absolute top-2.5 right-2.5 text-xs font-bold px-2.5 py-1 rounded-lg"
                style={{
                  backgroundColor: theme.primary,
                  color: "#fff",
                  boxShadow: `0 2px 8px ${theme.primary}40`,
                }}
              >
                {formatPrice(item.price)}
              </div>

              {/* Text overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <h3 className="font-bold text-white text-sm leading-snug">{item.name}</h3>
                {item.description && (
                  <p className="text-white/60 text-xs mt-1 line-clamp-1">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
