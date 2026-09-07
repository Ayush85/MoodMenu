import { Star } from "lucide-react";
import MenuItemCard from "../MenuItemCard";
import { MenuLayoutProps } from "./types";

export default function TabbedLayout({
  categories,
  todaysSpecials,
  theme,
  cardStyle,
  activeCategory,
  onCategoryChange,
  onTapItem,
  getCartQty,
  onQuickAdd,
  hideContent,
}: MenuLayoutProps) {
  const isDark = theme.mode === "dark";
  const itemsWrapperClass = cardStyle === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2";
  const currentCategoryId = activeCategory ?? categories[0]?.id ?? null;
  const currentCategory = categories.find((c) => c.id === currentCategoryId) ?? categories[0];

  if (hideContent || categories.length === 0) return null;

  return (
    <>
      <div
        className="sticky top-0 z-40 -mx-4 px-4 py-2"
        style={{
          backgroundColor: `${theme.bg}ee`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const active = cat.id === currentCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200"
                style={{
                  backgroundColor: active ? theme.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                  color: active ? "#fff" : "inherit",
                  boxShadow: active ? `0 2px 10px ${theme.primary}30` : "none",
                }}
              >
                {cat.name}
                <span className="ml-1.5 opacity-60 font-medium">{cat.items.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {todaysSpecials.length > 0 && (
        <section className="mb-5 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4" fill={theme.primary} style={{ color: theme.primary }} />
            <h2 className="text-sm font-extrabold" style={{ color: theme.primary }}>
              Today&apos;s Specials
            </h2>
          </div>
          <div className={itemsWrapperClass}>
            {todaysSpecials.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                theme={theme}
                layout={cardStyle}
                onTap={onTapItem}
                cartQty={getCartQty(item.id)}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        </section>
      )}

      {currentCategory && (
        <section className="mb-4 mt-3">
          <div className={itemsWrapperClass}>
            {currentCategory.items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                theme={theme}
                layout={cardStyle}
                onTap={onTapItem}
                cartQty={getCartQty(item.id)}
                onQuickAdd={onQuickAdd}
              />
            ))}

            {currentCategory.items.length === 0 && (
              <div
                className="flex flex-col items-center py-10 rounded-2xl opacity-30"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}
              >
                <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-sm">No items yet</p>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="text-center py-10 opacity-20">
        <div className="w-8 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: theme.primary + "30" }} />
        <p className="text-xs">Powered by <span className="font-semibold">Menuor</span></p>
      </footer>
    </>
  );
}
