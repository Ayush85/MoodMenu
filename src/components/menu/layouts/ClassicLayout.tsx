import { Star } from "lucide-react";
import CategoryNav from "../CategoryNav";
import MenuItemCard from "../MenuItemCard";
import { MenuLayoutProps } from "./types";

export default function ClassicLayout({
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

  if (hideContent) return null;

  return (
    <>
      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        theme={theme}
      />

      {todaysSpecials.length > 0 && (
        <section className="mb-5">
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

      {categories.map((cat) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="mb-4 scroll-mt-14">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-sm font-extrabold">{cat.name}</h2>
            <div className="flex-1 h-px" style={{
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            }} />
            <span className="text-xs font-medium opacity-30">{cat.items.length}</span>
          </div>

          <div className={itemsWrapperClass}>
            {cat.items.map((item) => (
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

            {cat.items.length === 0 && (
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
      ))}

      <footer className="text-center py-10 opacity-20">
        <div className="w-8 h-0.5 mx-auto mb-4 rounded-full" style={{ backgroundColor: theme.primary + "30" }} />
        <p className="text-xs">Powered by <span className="font-semibold">Menuor</span></p>
      </footer>
    </>
  );
}
