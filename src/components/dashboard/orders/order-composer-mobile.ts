export function scrollFocusedElementIntoView(
  target: HTMLElement | null,
  activeElement: Element | null,
  behavior: ScrollBehavior = "auto",
) {
  if (!target || activeElement !== target) return false;

  target.scrollIntoView({ block: "center", behavior });
  return true;
}
