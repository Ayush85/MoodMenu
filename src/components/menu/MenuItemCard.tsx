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
  item: MenuItemData;
  theme: MoodTheme;
  onTap: (item: MenuItemData) => void;
}

export default function MenuItemCard({ item, theme, onTap }: Props) {
  const isDark = theme.mode === "dark";
  const initial = item.name.charAt(0).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(item)}
      onKeyDown={(e) => e.key === "Enter" && onTap(item)}
      className="w-full text-left rounded-xl overflow-hidden cursor-pointer"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
        boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
        border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Image */}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="w-full aspect-square object-cover bg-gray-100"
          draggable={false}
        />
      ) : (
        <div
          className="w-full aspect-square flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${theme.primary}12, ${theme.accent}20)` }}
        >
          <span className="text-2xl font-black opacity-15" style={{ color: theme.primary }}>
            {initial}
          </span>
        </div>
      )}

      {/* Info */}
      <div className="px-1.5 py-1.5">
        <h3 className="font-bold text-[11px] leading-tight truncate">{item.name}</h3>
        <span className="text-[11px] font-extrabold" style={{ color: theme.primary }}>
          {formatPrice(item.price)}
        </span>
      </div>
    </div>
  );
}
