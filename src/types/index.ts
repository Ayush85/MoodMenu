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
}

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
