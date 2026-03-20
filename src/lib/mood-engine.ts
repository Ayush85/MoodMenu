import { MoodCondition, MoodTheme, MoodResult, WeatherData, DEFAULT_THEME } from "@/types";

interface MoodRuleInput {
  name: string;
  condition: MoodCondition;
  theme: MoodTheme;
  featuredTags: string[];
  priority: number;
}

function isTimeInRange(timeRange: [string, string]): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

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
  weather: WeatherData | null
): MoodResult {
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

  return { theme: DEFAULT_THEME, featuredTags: [], ruleName: "Default", weather };
}
