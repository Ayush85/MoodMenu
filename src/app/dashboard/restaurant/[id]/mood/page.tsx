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
      <div className="page-shell max-w-5xl">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="surface-card h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!restaurant) return <div>Not found</div>;

  return (
    <div className="page-shell max-w-5xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="text-2xl">🎨</span> Mood Rules
          </h1>
          <p className="page-subtitle mt-1">
            Configure how your menu adapts to weather & time
          </p>
        </div>
        <Link
          href={`/dashboard/restaurant/${id}/menu`}
          className="btn-soft !text-sm"
        >
          ← Back to Menu
        </Link>
      </div>

      {/* Active Rules */}
      <div className="space-y-4 mb-10">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Active Rules
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {restaurant.moodRules.length}
          </span>
        </h2>
        {restaurant.moodRules.length === 0 ? (
          <div className="surface-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✨</span>
            </div>
            <p className="text-gray-500">No mood rules yet. Add a preset below to get started.</p>
          </div>
        ) : (
          restaurant.moodRules.map((rule) => (
            <div
              key={rule.id}
              className="surface-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl shrink-0 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${rule.theme.primary}, ${rule.theme.accent})`,
                  }}
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {rule.theme.mode === "dark" && (
                      <span className="text-[10px] font-semibold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                        Dark Mode
                      </span>
                    )}
                    {rule.condition.weather && rule.condition.weather.length > 0 && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {rule.condition.weather.join(", ")}
                      </span>
                    )}
                    {rule.condition.timeRange && (
                      <span className="text-[10px] font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                        {rule.condition.timeRange[0]} – {rule.condition.timeRange[1]}
                      </span>
                    )}
                    {rule.featuredTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteRule(rule.id)}
                className="text-sm text-red-400 hover:text-red-500 transition opacity-60 group-hover:opacity-100 self-start sm:self-auto"
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
              className="surface-card p-5 text-left hover:!shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl shadow-sm group-hover:scale-110 transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${preset.theme.primary}, ${preset.theme.accent})`,
                  }}
                />
                <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition">
                  {preset.name}
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preset.condition.weather.length > 0 && (
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {preset.condition.weather.join(", ")}
                  </span>
                )}
                {preset.condition.timeRange && (
                  <span className="text-[10px] font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                    {preset.condition.timeRange[0]} – {preset.condition.timeRange[1]}
                  </span>
                )}
                {preset.featuredTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-semibold bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
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
