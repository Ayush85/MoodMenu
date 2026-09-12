import { MoodTheme } from "@/types";

export interface MenuLayoutItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string[];
}

export interface MenuLayoutCategory {
  id: string;
  name: string;
  items: MenuLayoutItem[];
}

export interface MenuLayoutProps {
  categories: MenuLayoutCategory[];
  todaysSpecials: MenuLayoutItem[];
  theme: MoodTheme;
  cardStyle: "list" | "grid";
  activeCategory: string | null;
  onCategoryChange: (id: string) => void;
  onTapItem: (item: MenuLayoutItem) => void;
  /** True while the search overlay is showing results — layout content should hide. */
  hideContent: boolean;
}
