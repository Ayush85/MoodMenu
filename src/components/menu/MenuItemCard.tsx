import { Plus } from "lucide-react";
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
  cartQty?: number;
  onQuickAdd?: (item: MenuItemData) => void;
  layout?: "list" | "grid";
}

export default function MenuItemCard({ item, theme, onTap, cartQty = 0, onQuickAdd, layout = "list" }: Props) {
  const isDark = theme.mode === "dark";
  const initial = item.name.charAt(0).toUpperCase();

  const cardStyle = {
    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
    boxShadow: isDark ? "none" : "0 1px 4px rgba(0,0,0,0.05)",
    border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.04)",
    touchAction: "manipulation" as const,
    WebkitTapHighlightColor: "transparent" as const,
  };

  const image = item.image ? (
    <img
      src={item.image}
      alt={item.name}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover bg-gray-100"
      draggable={false}
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${theme.primary}12, ${theme.accent}20)` }}
    >
      <span className="text-2xl font-black opacity-15" style={{ color: theme.primary }}>
        {initial}
      </span>
    </div>
  );

  const cartBadge = cartQty > 0 && (
    <div
      className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-extrabold text-[10px] px-1"
      style={{ backgroundColor: theme.primary }}
    >
      {cartQty}
    </div>
  );

  const addButton = onQuickAdd && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onQuickAdd(item);
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: theme.primary, touchAction: "manipulation" }}
      aria-label={`Add ${item.name} to order`}
    >
      <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
    </button>
  );

  if (layout === "grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onTap(item)}
        onKeyDown={(e) => e.key === "Enter" && onTap(item)}
        className="w-full flex flex-col rounded-2xl p-2.5 cursor-pointer"
        style={cardStyle}
      >
        <div className="relative w-full aspect-square rounded-xl overflow-hidden">
          {image}
          {cartBadge}
        </div>
        <div className="pt-2 flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.name}</h3>
          {item.description && (
            <p className="text-xs opacity-50 line-clamp-1 mt-0.5">{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-extrabold" style={{ color: theme.primary }}>
            {formatPrice(item.price)}
          </span>
          {addButton}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(item)}
      onKeyDown={(e) => e.key === "Enter" && onTap(item)}
      className="w-full flex items-center gap-3 rounded-2xl p-2.5 cursor-pointer"
      style={cardStyle}
    >
      {/* Image */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
        {image}
        {cartBadge}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <h3 className="font-bold text-sm leading-snug line-clamp-2">{item.name}</h3>
        {item.description && (
          <p className="text-xs opacity-50 line-clamp-1 mt-0.5">{item.description}</p>
        )}
        <span className="block text-sm font-extrabold mt-1" style={{ color: theme.primary }}>
          {formatPrice(item.price)}
        </span>
      </div>

      {/* Add-to-cart button — 44px tap target, separated from row's own tap zone */}
      {addButton}
    </div>
  );
}
