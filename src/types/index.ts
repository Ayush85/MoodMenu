export interface MoodCondition {
  weather: string[];
  timeRange?: [string, string];
}

export interface MoodTheme {
  mode: "light" | "dark";
  primary: string;
  accent: string;
  bg: string;
  text: string;
  fontFamily?: string;
}

export interface FontOption {
  label: string;
  value: string;
  cssFamily: string;
  stylesheetUrl: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    label: "Inter (default)",
    value: "inter",
    cssFamily: "'Inter', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap",
  },
  {
    label: "Poppins",
    value: "poppins",
    cssFamily: "'Poppins', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap",
  },
  {
    label: "Playfair Display",
    value: "playfair-display",
    cssFamily: "'Playfair Display', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;800&display=swap",
  },
  {
    label: "DM Sans",
    value: "dm-sans",
    cssFamily: "'DM Sans', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;800&display=swap",
  },
  {
    label: "Space Grotesk",
    value: "space-grotesk",
    cssFamily: "'Space Grotesk', sans-serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap",
  },
  {
    label: "Lora",
    value: "lora",
    cssFamily: "'Lora', serif",
    stylesheetUrl: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap",
  },
];

export function getFontOption(value?: string): FontOption | undefined {
  return FONT_OPTIONS.find((f) => f.value === value);
}

export interface DesignTemplate {
  key: string;
  name: string;
  description: string;
  theme: MoodTheme;
  cardStyle: "list" | "grid";
  layoutTemplate: "classic" | "tabbed" | "magazine";
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    key: "classic-orange",
    name: "Classic Orange",
    description: "Warm and friendly — the default look",
    theme: { mode: "light", primary: "#F97316", accent: "#FDE68A", bg: "#FFFFFF", text: "#1F2937", fontFamily: "inter" },
    cardStyle: "list",
    layoutTemplate: "classic",
  },
  {
    key: "elegant-dark",
    name: "Elegant Dark",
    description: "Moody and upscale for fine dining",
    theme: { mode: "dark", primary: "#D4AF37", accent: "#8B7355", bg: "#1A1A1A", text: "#F5F5F0", fontFamily: "playfair-display" },
    cardStyle: "list",
    layoutTemplate: "magazine",
  },
  {
    key: "fresh-cafe",
    name: "Fresh Cafe",
    description: "Light and airy for coffee shops",
    theme: { mode: "light", primary: "#10B981", accent: "#A7F3D0", bg: "#F0FDF4", text: "#064E3B", fontFamily: "dm-sans" },
    cardStyle: "grid",
    layoutTemplate: "tabbed",
  },
  {
    key: "bold-vibrant",
    name: "Bold & Vibrant",
    description: "Punchy colors for a fun, casual spot",
    theme: { mode: "light", primary: "#EC4899", accent: "#FBCFE8", bg: "#FFF1F5", text: "#831843", fontFamily: "poppins" },
    cardStyle: "grid",
    layoutTemplate: "tabbed",
  },
  {
    key: "midnight-violet",
    name: "Midnight Violet",
    description: "Dark and modern for bars & lounges",
    theme: { mode: "dark", primary: "#8B5CF6", accent: "#DDD6FE", bg: "#0F0B1E", text: "#F3F0FF", fontFamily: "space-grotesk" },
    cardStyle: "grid",
    layoutTemplate: "magazine",
  },
  {
    key: "minimal-mono",
    name: "Minimal Mono",
    description: "Clean and understated",
    theme: { mode: "light", primary: "#111827", accent: "#9CA3AF", bg: "#FFFFFF", text: "#111827", fontFamily: "inter" },
    cardStyle: "list",
    layoutTemplate: "classic",
  },
  {
    key: "rustic-warmth",
    name: "Rustic Warmth",
    description: "Cozy and earthy for a homestyle feel",
    theme: { mode: "light", primary: "#B45309", accent: "#FDE68A", bg: "#FFFBEB", text: "#451A03", fontFamily: "lora" },
    cardStyle: "list",
    layoutTemplate: "classic",
  },
  {
    key: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Cool and coastal",
    theme: { mode: "light", primary: "#0EA5E9", accent: "#BAE6FD", bg: "#F0F9FF", text: "#0C4A6E", fontFamily: "dm-sans" },
    cardStyle: "grid",
    layoutTemplate: "tabbed",
  },
];

export interface WeatherData {
  main: string;
  description: string;
  temp: number;
  icon: string;
  city: string;
}

export interface MoodResult {
  theme: MoodTheme;
  featuredTags: string[];
  ruleName: string;
  weather: WeatherData | null;
}

export const DEFAULT_THEME: MoodTheme = {
  mode: "light",
  primary: "#F97316",
  accent: "#FDE68A",
  bg: "#FFFFFF",
  text: "#1F2937",
};

interface MoodPreset {
  name: string;
  condition: MoodCondition;
  theme: MoodTheme;
  featuredTags: string[];
}

export const MOOD_PRESETS: Record<string, MoodPreset> = {
  rainyComfort: {
    name: "Rainy Day Comfort",
    condition: { weather: ["Rain", "Drizzle", "Thunderstorm"] },
    theme: { mode: "dark", primary: "#F97316", accent: "#FDE68A", bg: "#1C1917", text: "#FAFAF9" },
    featuredTags: ["hot", "comfort", "soup"],
  },
  sunnyEnergy: {
    name: "Sunny Energy",
    condition: { weather: ["Clear"] },
    theme: { mode: "light", primary: "#06B6D4", accent: "#A5F3FC", bg: "#ECFEFF", text: "#164E63" },
    featuredTags: ["cold", "refreshing", "iced"],
  },
  cloudyChill: {
    name: "Cloudy Chill",
    condition: { weather: ["Clouds", "Mist", "Fog", "Haze"] },
    theme: { mode: "light", primary: "#8B5CF6", accent: "#DDD6FE", bg: "#FAF5FF", text: "#4C1D95" },
    featuredTags: ["warm", "tea", "snack"],
  },
  lateNight: {
    name: "Late Night Vibes",
    condition: { weather: [], timeRange: ["21:00", "05:00"] as [string, string] },
    theme: { mode: "dark", primary: "#EC4899", accent: "#FBCFE8", bg: "#0F172A", text: "#F8FAFC" },
    featuredTags: ["special", "dessert", "popular"],
  },
  morningFresh: {
    name: "Morning Fresh",
    condition: { weather: [], timeRange: ["06:00", "10:00"] as [string, string] },
    theme: { mode: "light", primary: "#10B981", accent: "#A7F3D0", bg: "#ECFDF5", text: "#064E3B" },
    featuredTags: ["breakfast", "coffee", "fresh"],
  },
};
