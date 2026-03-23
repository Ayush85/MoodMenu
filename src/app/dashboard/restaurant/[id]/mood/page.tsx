"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { MOOD_PRESETS } from "@/types";

interface MoodRule {
  id: string;
  name: string;
  condition: { weather?: string[]; timeRange?: [string, string] };
  theme: { mode: string; primary: string; accent: string; bg: string; text: string };
  featuredTags: string[];
  priority: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  isSpecial: boolean;
  isAvailable: boolean;
  category: { name: string };
}

interface Restaurant {
  id: string;
  name: string;
  moodRules: MoodRule[];
  categories: { id: string; name: string; items: MenuItem[] }[];
}

const WEATHER_OPTIONS = ["Clear", "Clouds", "Rain", "Drizzle", "Thunderstorm", "Snow", "Mist", "Fog", "Haze"];

export default function MoodRulesPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "specials">("rules");

  // Custom rule form
  const [formName, setFormName] = useState("");
  const [formWeather, setFormWeather] = useState<string[]>([]);
  const [formTimeStart, setFormTimeStart] = useState("");
  const [formTimeEnd, setFormTimeEnd] = useState("");
  const [formMode, setFormMode] = useState<"light" | "dark">("light");
  const [formPrimary, setFormPrimary] = useState("#F97316");
  const [formAccent, setFormAccent] = useState("#FDE68A");
  const [formBg, setFormBg] = useState("#FFFFFF");
  const [formText, setFormText] = useState("#1F2937");
  const [formTags, setFormTags] = useState("");
  const [formPriority, setFormPriority] = useState(0);

  function fetchData() {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRestaurant(data);
        setLoading(false);
      });
  }

  useEffect(() => { fetchData(); }, [id]);

  async function addPreset(key: string) {
    const preset = MOOD_PRESETS[key];
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

  function deleteRule(ruleId: string) {
    setConfirmAction({
      title: "Remove Mood Rule",
      message: "This rule will be permanently removed. Are you sure?",
      onConfirm: async () => {
        await fetch(`/api/restaurants/${id}/mood-rules`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleId }),
        });
        setConfirmAction(null);
        toast("Mood rule removed");
        fetchData();
      },
    });
  }

  async function addCustomRule() {
    if (!formName.trim()) { toast("Name is required", "error"); return; }
    if (formWeather.length === 0 && !formTimeStart) { toast("Select at least one weather condition or time range", "error"); return; }

    const condition: { weather: string[]; timeRange?: [string, string] } = { weather: formWeather };
    if (formTimeStart && formTimeEnd) {
      condition.timeRange = [formTimeStart, formTimeEnd];
    }

    await fetch(`/api/restaurants/${id}/mood-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        condition,
        theme: { mode: formMode, primary: formPrimary, accent: formAccent, bg: formBg, text: formText },
        featuredTags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
        priority: formPriority,
      }),
    });

    setShowCustomForm(false);
    resetForm();
    fetchData();
  }

  function resetForm() {
    setFormName(""); setFormWeather([]); setFormTimeStart(""); setFormTimeEnd("");
    setFormMode("light"); setFormPrimary("#F97316"); setFormAccent("#FDE68A");
    setFormBg("#FFFFFF"); setFormText("#1F2937"); setFormTags(""); setFormPriority(0);
  }

  function toggleWeather(w: string) {
    setFormWeather((prev) => prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]);
  }

  async function toggleSpecial(itemId: string, current: boolean) {
    await fetch(`/api/restaurants/${id}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSpecial: !current }),
    });
    fetchData();
  }

  const allItems = restaurant?.categories?.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: { name: c.name } }))
  ) || [];
  const specials = allItems.filter((i) => i.isSpecial);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="text-2xl">🎨</span> Mood & Specials
          </h1>
          <p className="page-subtitle mt-1">
            Configure menu adaptation and today&apos;s specials
          </p>
        </div>
        <Link href={`/dashboard/restaurant/${id}/menu`} className="btn-soft !text-sm">
          ← Back to Menu
        </Link>
      </div>

      {/* Tabs */}
      <div className="surface-card p-1.5 flex gap-1.5 mb-6">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "rules" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          🎨 Mood Rules ({restaurant.moodRules.length})
        </button>
        <button
          onClick={() => setActiveTab("specials")}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition ${activeTab === "specials" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"}`}
        >
          ⭐ Today&apos;s Specials ({specials.length})
        </button>
      </div>

      {/* ===== MOOD RULES TAB ===== */}
      {activeTab === "rules" && (
        <>
          {/* Active Rules */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Active Rules</h2>
              <button
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="btn-primary !text-xs !px-3 !py-1.5"
              >
                {showCustomForm ? "Cancel" : "+ Custom Rule"}
              </button>
            </div>

            {/* Custom Rule Form */}
            {showCustomForm && (
              <div className="surface-card p-5 space-y-4 border-2 border-orange-200">
                <h3 className="font-bold text-gray-900">Create Custom Mood Rule</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Rule Name</label>
                    <input value={formName} onChange={(e) => setFormName(e.target.value)} className="control-input" placeholder="e.g. Hot Summer Day" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Priority (higher = checked first)</label>
                    <input type="number" value={formPriority} onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)} className="control-input" />
                  </div>
                </div>

                {/* Weather conditions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Weather Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {WEATHER_OPTIONS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => toggleWeather(w)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${formWeather.includes(w) ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"}`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Time Start (optional)</label>
                    <input type="time" value={formTimeStart} onChange={(e) => setFormTimeStart(e.target.value)} className="control-input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Time End</label>
                    <input type="time" value={formTimeEnd} onChange={(e) => setFormTimeEnd(e.target.value)} className="control-input" />
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Theme</label>
                  <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => { setFormMode("light"); setFormBg("#FFFFFF"); setFormText("#1F2937"); }}
                      className={`text-xs px-4 py-2 rounded-lg border transition ${formMode === "light" ? "bg-white border-orange-400 text-orange-600 font-bold" : "bg-gray-50 border-gray-200"}`}>
                      ☀️ Light
                    </button>
                    <button type="button" onClick={() => { setFormMode("dark"); setFormBg("#1C1917"); setFormText("#FAFAF9"); }}
                      className={`text-xs px-4 py-2 rounded-lg border transition ${formMode === "dark" ? "bg-gray-900 border-gray-700 text-white font-bold" : "bg-gray-50 border-gray-200"}`}>
                      🌙 Dark
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Primary</label>
                      <input type="color" value={formPrimary} onChange={(e) => setFormPrimary(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Accent</label>
                      <input type="color" value={formAccent} onChange={(e) => setFormAccent(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Background</label>
                      <input type="color" value={formBg} onChange={(e) => setFormBg(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Text</label>
                      <input type="color" value={formText} onChange={(e) => setFormText(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
                    </div>
                  </div>
                  {/* Preview */}
                  <div className="mt-3 rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: formBg, color: formText, border: "1px solid rgba(0,0,0,0.1)" }}>
                    <div className="w-10 h-10 rounded-lg" style={{ background: `linear-gradient(135deg, ${formPrimary}, ${formAccent})` }} />
                    <div>
                      <p className="font-bold text-sm">{formName || "Preview"}</p>
                      <p className="text-xs" style={{ color: formPrimary }}>Rs. 200</p>
                    </div>
                  </div>
                </div>

                {/* Featured tags */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Featured Tags (comma separated)</label>
                  <input value={formTags} onChange={(e) => setFormTags(e.target.value)} className="control-input" placeholder="hot, comfort, soup" />
                  <p className="text-[10px] text-gray-400 mt-1">Items with these tags will be highlighted when this rule is active</p>
                </div>

                <button onClick={addCustomRule} className="btn-primary w-full">
                  Create Mood Rule
                </button>
              </div>
            )}

            {restaurant.moodRules.length === 0 ? (
              <div className="surface-card p-8 text-center">
                <span className="text-3xl">✨</span>
                <p className="text-gray-500 mt-2">No mood rules yet. Add a preset or create a custom one.</p>
              </div>
            ) : (
              restaurant.moodRules.map((rule) => (
                <div key={rule.id} className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: `linear-gradient(135deg, ${rule.theme.primary}, ${rule.theme.accent})` }} />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{rule.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.theme.mode === "dark" && <span className="text-[9px] font-semibold bg-gray-900 text-white px-1.5 py-0.5 rounded-full">Dark</span>}
                        {rule.condition.weather && rule.condition.weather.length > 0 && (
                          <span className="text-[9px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                            {rule.condition.weather.join(", ")}
                          </span>
                        )}
                        {rule.condition.timeRange && (
                          <span className="text-[9px] font-semibold bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">
                            {rule.condition.timeRange[0]}–{rule.condition.timeRange[1]}
                          </span>
                        )}
                        {rule.featuredTags.map((tag) => (
                          <span key={tag} className="text-[9px] font-semibold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-400 hover:text-red-500 transition self-start sm:self-auto">
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick Add Presets */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-3">Quick Add Presets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(MOOD_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => addPreset(key)}
                  className="surface-card p-4 text-left hover:!shadow-lg hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg group-hover:scale-110 transition-transform" style={{ background: `linear-gradient(135deg, ${preset.theme.primary}, ${preset.theme.accent})` }} />
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-violet-600 transition">{preset.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {preset.condition.weather.length > 0 && <span className="text-[9px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{preset.condition.weather.join(", ")}</span>}
                    {preset.condition.timeRange && <span className="text-[9px] font-semibold bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">{preset.condition.timeRange[0]}–{preset.condition.timeRange[1]}</span>}
                    {preset.featuredTags.map((tag) => <span key={tag} className="text-[9px] font-semibold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{tag}</span>)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== TODAY'S SPECIALS TAB ===== */}
      {activeTab === "specials" && (
        <div>
          <div className="mb-4">
            <h2 className="text-base font-bold text-gray-900">Manage Today&apos;s Specials</h2>
            <p className="text-xs text-gray-500 mt-1">Toggle items on/off. Specials appear at the top of the customer menu.</p>
          </div>

          {/* Current specials */}
          {specials.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                ⭐ Active Specials ({specials.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {specials.map((item) => (
                  <div key={item.id} className="surface-card p-3 flex items-center justify-between gap-3 border-2 border-amber-200">
                    <div className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />}
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.category.name} · Rs. {item.price}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSpecial(item.id, true)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold transition"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All items to add */}
          <h3 className="text-sm font-bold text-gray-700 mb-2">All Menu Items</h3>
          <div className="space-y-1.5">
            {allItems.filter((i) => i.isAvailable && !i.isSpecial).map((item) => (
              <div key={item.id} className="surface-card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {item.image && <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />}
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.category.name} · Rs. {item.price}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSpecial(item.id, false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700 font-semibold transition"
                >
                  + Special
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
