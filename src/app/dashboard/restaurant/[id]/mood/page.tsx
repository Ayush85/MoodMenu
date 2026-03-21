"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MOOD_PRESETS } from "@/types";

interface MoodRule {
  id: string;
  name: string;
  condition: { weather?: string[]; timeRange?: [string, string] };
  theme: { mode: string; primary: string; accent: string; bg: string; text: string };
  featuredTags: string[];
  priority: number;
}

interface Restaurant {
  id: string;
  name: string;
  moodRules: MoodRule[];
}

export default function MoodRulesPage() {
  const params = useParams();
  const id = params.id as string;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  function fetchData() {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addPreset(key: string) {
    const preset = MOOD_PRESETS[key as keyof typeof MOOD_PRESETS];
    await fetch(`/api/restaurants/${id}/mood-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: preset.name,
        condition: preset.condition,
        theme: preset.theme,
        featuredTags: preset.featuredTags,
        priority: Object.keys(MOOD_PRESETS).indexOf(key),
      }),
    });
    fetchData();
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/restaurants/${id}/mood-rules`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!restaurant) return <div>Not found</div>;

  return (
    <div className="page-shell max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="page-title">Mood Rules</h1>
          <p className="page-subtitle mt-1">
            Configure how your menu adapts to weather & time
          </p>
        </div>
        <Link
          href={`/dashboard/restaurant/${id}/menu`}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Back to Menu
        </Link>
      </div>

      {/* Active Rules */}
      <div className="space-y-4 mb-10">
        <h2 className="text-lg font-bold text-gray-900">Active Rules</h2>
        {restaurant.moodRules.length === 0 ? (
          <div className="surface-card p-6 text-center text-gray-400">
            No mood rules yet. Add a preset below to get started.
          </div>
        ) : (
          restaurant.moodRules.map((rule) => (
            <div
              key={rule.id}
              className="surface-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg"
                  style={{ backgroundColor: rule.theme.primary }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {rule.condition.weather && rule.condition.weather.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Weather: {rule.condition.weather.join(", ")}
                      </span>
                    )}
                    {rule.condition.timeRange && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Time: {rule.condition.timeRange[0]} - {rule.condition.timeRange[1]}
                      </span>
                    )}
                    {rule.featuredTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteRule(rule.id)}
                className="text-red-400 hover:text-red-500 text-sm self-start sm:self-auto"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Presets */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Quick Add Presets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(MOOD_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => addPreset(key)}
              className="surface-card p-5 text-left hover:border-purple-300 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg"
                  style={{ backgroundColor: preset.theme.primary }}
                />
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition">
                  {preset.name}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1">
                {preset.condition.weather.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {preset.condition.weather.join(", ")}
                  </span>
                )}
                {preset.condition.timeRange && (
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                    {preset.condition.timeRange[0]} - {preset.condition.timeRange[1]}
                  </span>
                )}
                {preset.featuredTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
