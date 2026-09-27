"use client";

import { useEffect, useRef } from "react";

const stack: HTMLElement[] = [];
let originalOverflow = "";
const controls = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Shared modal lifecycle, including stacked dialogs and focus restoration. */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!stack.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    stack.push(panel);
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(controls)).filter(el => el.getClientRects().length && !el.closest("[inert]"));
    panel.tabIndex = -1;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.focus();
    function keydown(event: KeyboardEvent) {
      if (stack.at(-1) !== panel) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); panel!.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last!.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) {
        event.preventDefault(); first.focus();
      }
    }
    function focusin(event: FocusEvent) {
      if (stack.at(-1) === panel && !panel!.contains(event.target as Node)) panel!.focus();
    }
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("focusin", focusin);
      const index = stack.indexOf(panel);
      const wasTop = index === stack.length - 1;
      if (index >= 0) stack.splice(index, 1);
      if (!stack.length) document.body.style.overflow = originalOverflow;
      if (wasTop) {
        const top = stack.at(-1);
        if (previous?.isConnected && (!top || top.contains(previous))) previous.focus();
        else top?.focus();
      }
    };
  }, [open]);
  return ref;
}
