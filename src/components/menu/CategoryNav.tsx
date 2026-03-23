"use client";

import { useEffect, useRef, useCallback } from "react";
import { MoodTheme } from "@/types";

interface CategoryData {
  id: string;
  name: string;
  items: { id: string }[];
}

interface Props {
  categories: CategoryData[];
  activeCategory: string | null;
  onCategoryChange: (id: string) => void;
  theme: MoodTheme;
}

export default function CategoryNav({ categories, activeCategory, onCategoryChange, theme }: Props) {
  const isDark = theme.mode === "dark";
  const navRef = useRef<HTMLDivElement>(null);

  const stableOnChange = useCallback((id: string) => {
    onCategoryChange(id);
  }, [onCategoryChange]);

  // Intersection observer to auto-highlight on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const catId = entry.target.id.replace("cat-", "");
            stableOnChange(catId);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    categories.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories, stableOnChange]);

  // Scroll active pill into view
  useEffect(() => {
    if (!activeCategory || !navRef.current) return;
    const pill = navRef.current.querySelector(`[data-cat="${activeCategory}"]`);
    if (pill) {
      pill.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeCategory]);

  if (categories.length <= 1) return null;

  function handleClick(catId: string) {
    onCategoryChange(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const offset = 60;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  return (
    <div
      className="sticky top-0 z-40 -mx-4 px-4 py-2"
      style={{
        backgroundColor: isDark ? `${theme.bg}ee` : `${theme.bg}ee`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
      }}
    >
      <div ref={navRef} className="flex gap-2 overflow-x-auto no-scrollbar">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              data-cat={cat.id}
              onClick={() => handleClick(cat.id)}
              className="shrink-0 flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200"
              style={{
                backgroundColor: isActive ? theme.primary : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                color: isActive ? "#fff" : "inherit",
                boxShadow: isActive ? `0 2px 10px ${theme.primary}30` : "none",
              }}
            >
              {cat.name}
              <span
                className="text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                style={{
                  backgroundColor: isActive ? "rgba(255,255,255,0.25)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                }}
              >
                {cat.items.length}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
