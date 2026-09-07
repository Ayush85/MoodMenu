import { MoodCondition, MoodTheme, MoodResult, WeatherData, DEFAULT_THEME } from "@/types";

interface MoodRuleInput {
  name: string;
  condition: MoodCondition;
  theme: MoodTheme;
  featuredTags: string[];
  priority: number;
}

// Restaurants are Nepal-based, but the server process may run in a different
// timezone (e.g. UTC in production) — always evaluate time rules in Nepal
// local time, not the server's local time, or "morning" rules can fire in
// the middle of the afternoon.
const RESTAURANT_TIMEZONE = "Asia/Kathmandu";

function getCurrentMinutesInRestaurantTimezone(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function isTimeInRange(timeRange: [string, string]): boolean {
  const currentMinutes = getCurrentMinutesInRestaurantTimezone();

  const [startH, startM] = timeRange[0].split(":").map(Number);
  const [endH, endM] = timeRange[1].split(":").map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start <= end) {
    return currentMinutes >= start && currentMinutes <= end;
  }
  // Overnight range (e.g., 21:00 - 05:00)
  return currentMinutes >= start || currentMinutes <= end;
}

export function evaluateMood(
  rules: MoodRuleInput[],
  weather: WeatherData | null,
  brandTheme?: Partial<MoodTheme> | null
): MoodResult {
  const baseTheme: MoodTheme = { ...DEFAULT_THEME, ...brandTheme };
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    const { condition } = rule;
    let weatherMatch = true;
    let timeMatch = true;

    // Check weather condition
    if (condition.weather && condition.weather.length > 0) {
      if (!weather) {
        weatherMatch = false;
      } else {
        weatherMatch = condition.weather.some(
          (w) => w.toLowerCase() === weather.main.toLowerCase()
        );
      }
    }

    // Check time condition
    if (condition.timeRange) {
      timeMatch = isTimeInRange(condition.timeRange);
    }

    // Both must match (if specified)
    const hasWeatherCondition = condition.weather && condition.weather.length > 0;
    const hasTimeCondition = !!condition.timeRange;

    if (hasWeatherCondition && hasTimeCondition) {
      if (weatherMatch && timeMatch) {
        return { theme: rule.theme, featuredTags: rule.featuredTags, ruleName: rule.name, weather };
      }
    } else if (hasWeatherCondition && weatherMatch) {
      return { theme: rule.theme, featuredTags: rule.featuredTags, ruleName: rule.name, weather };
    } else if (hasTimeCondition && timeMatch) {
      return { theme: rule.theme, featuredTags: rule.featuredTags, ruleName: rule.name, weather };
    }
  }

  return { theme: baseTheme, featuredTags: [], ruleName: "Default", weather };
}
