export interface CategorySectionPosition {
  id: string;
  top: number;
}

/**
 * Returns the last category whose section has reached the activation point.
 * The first category remains active until the first section reaches it.
 */
export function getActiveCategoryId(
  sections: readonly CategorySectionPosition[],
  activationPoint: number,
): string | null {
  if (sections.length === 0) return null;

  let activeCategoryId = sections[0].id;
  for (const section of sections) {
    if (section.top > activationPoint) break;
    activeCategoryId = section.id;
  }

  return activeCategoryId;
}
