"use client";

import { useEffect, useRef, useCallback } from "react";
import { MoodTheme } from "@/types";
import { getActiveCategoryId } from "./category-navigation";

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
  const scrollFrameRef = useRef<number | null>(null);
  const requestedCategoryRef = useRef<string | null>(null);

  const stableOnChange = useCallback((id: string) => {
    onCategoryChange(id);
  }, [onCategoryChange]);

  const updateActiveCategory = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    const sections = categories.flatMap((category) => {
      const section = document.getElementById(`cat-${category.id}`);
      return section ? [{ id: category.id, top: section.getBoundingClientRect().top }] : [];
    });
    const activationPoint = nav.parentElement?.getBoundingClientRect().bottom ?? 0;
    const categoryId = getActiveCategoryId(sections, activationPoint);
    if (categoryId) stableOnChange(categoryId);
  }, [categories, stableOnChange]);

  // Read section positions once per animation frame. Choosing the last
  // section above the sticky header gives the same answer in either scroll
  // direction and avoids IntersectionObserver entry-order races.
  const scheduleActiveCategoryUpdate = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateActiveCategory();
    });
  }, [updateActiveCategory]);

  useEffect(() => {
    scheduleActiveCategoryUpdate();
    window.addEventListener("scroll", scheduleActiveCategoryUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveCategoryUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleActiveCategoryUpdate);
      window.removeEventListener("resize", scheduleActiveCategoryUpdate);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [scheduleActiveCategoryUpdate]);

  const scrollPillIntoView = useCallback((categoryId: string, behavior: ScrollBehavior, center: boolean) => {
    const nav = navRef.current;
    if (!nav) return;

    const pill = Array.from(nav.children).find((child) => child.getAttribute("data-cat") === categoryId);
    if (!(pill instanceof HTMLElement)) return;

    const maxScrollLeft = Math.max(0, nav.scrollWidth - nav.clientWidth);
    const desiredScrollLeft = center
      ? pill.offsetLeft - (nav.clientWidth - pill.offsetWidth) / 2
      : pill.offsetLeft < nav.scrollLeft
        ? pill.offsetLeft - 8
        : pill.offsetLeft + pill.offsetWidth > nav.scrollLeft + nav.clientWidth
          ? pill.offsetLeft + pill.offsetWidth - nav.clientWidth + 8
          : nav.scrollLeft;
    const targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, desiredScrollLeft));

    if (Math.abs(nav.scrollLeft - targetScrollLeft) > 1) {
      nav.scrollTo({ left: targetScrollLeft, behavior });
    }
  }, []);

  // Passive scrolling only nudges an off-screen active pill into view. A
  // deliberate tap is centered smoothly, without repeatedly animating the
  // category strip during a vertical swipe.
  useEffect(() => {
    if (!activeCategory) return;
    const shouldCenter = requestedCategoryRef.current === activeCategory;
    if (shouldCenter) requestedCategoryRef.current = null;
    scrollPillIntoView(activeCategory, shouldCenter ? "smooth" : "auto", shouldCenter);
  }, [activeCategory, scrollPillIntoView]);

  if (categories.length <= 1) return null;

  function handleClick(catId: string) {
    if (catId === activeCategory) {
      scrollPillIntoView(catId, "smooth", true);
    } else {
      requestedCategoryRef.current = catId;
    }
    onCategoryChange(catId);
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const stickyHeight = navRef.current?.parentElement?.getBoundingClientRect().height ?? 56;
      const top = el.getBoundingClientRect().top + window.scrollY - stickyHeight - 8;
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
      <div ref={navRef} className="flex gap-2 overflow-x-auto overscroll-x-contain no-scrollbar">
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
