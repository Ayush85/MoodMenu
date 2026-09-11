"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";
import { Sun, Moon, LayoutGrid, List, ChevronUp, ChevronDown, Image as ImageIcon, Pencil } from "lucide-react";
import { FONT_OPTIONS, DEFAULT_THEME, DESIGN_TEMPLATES, DesignTemplate } from "@/types";
import { LandingPageSettings } from "../landing/page";

interface MenuItemRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  items: MenuItemRow[];
}

interface BrandTheme {
  mode?: "light" | "dark";
  primary?: string;
  accent?: string;
  bg?: string;
  text?: string;
  fontFamily?: string;
}

interface Restaurant {
  id: string;
  name: string;
  logo: string | null;
  brandTheme: BrandTheme | null;
  cardStyle: string;
  layoutTemplate: string;
  customDomain: string | null;
  domainVerifiedAt: string | null;
  categories: CategoryRow[];
}

export default function DesignPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<"light" | "dark">("light");
  const [primary, setPrimary] = useState(DEFAULT_THEME.primary);
  const [accent, setAccent] = useState(DEFAULT_THEME.accent);
  const [bg, setBg] = useState(DEFAULT_THEME.bg);
  const [text, setText] = useState(DEFAULT_THEME.text);
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [cardStyle, setCardStyle] = useState<"list" | "grid">("list");
  const [layoutTemplate, setLayoutTemplate] = useState<"classic" | "tabbed" | "magazine">("classic");

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const [domain, setDomain] = useState("");
  const [domainSaving, setDomainSaving] = useState(false);

  function fetchData() {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data: Restaurant) => {
        setRestaurant(data);
        const brand = data.brandTheme || {};
        setMode(brand.mode === "dark" ? "dark" : "light");
        setPrimary(brand.primary || DEFAULT_THEME.primary);
        setAccent(brand.accent || DEFAULT_THEME.accent);
        setBg(brand.bg || DEFAULT_THEME.bg);
        setText(brand.text || DEFAULT_THEME.text);
        setFontFamily(brand.fontFamily || FONT_OPTIONS[0].value);
        setCardStyle(data.cardStyle === "grid" ? "grid" : "list");
        setLayoutTemplate(data.layoutTemplate === "tabbed" || data.layoutTemplate === "magazine" ? data.layoutTemplate : "classic");
        setDomain(data.customDomain || "");
        setCategories(data.categories || []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchData(); }, [id]);

  function applyTemplate(tpl: DesignTemplate) {
    setMode(tpl.theme.mode);
    setPrimary(tpl.theme.primary);
    setAccent(tpl.theme.accent);
    setBg(tpl.theme.bg);
    setText(tpl.theme.text);
    setFontFamily(tpl.theme.fontFamily || FONT_OPTIONS[0].value);
    setCardStyle(tpl.cardStyle);
    setLayoutTemplate(tpl.layoutTemplate);
    toast(`Applied "${tpl.name}" — click Save Design to keep it`);
  }

  async function saveDesign() {
    setSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandTheme: { mode, primary, accent, bg, text, fontFamily },
          cardStyle,
          layoutTemplate,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Design saved");
    } catch {
      toast("Couldn't save design", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveDomain() {
    setDomainSaving(true);
    try {
      const res = await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customDomain: domain.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Couldn't save domain", "error");
        return;
      }
      setDomain(data.customDomain || "");
      setRestaurant((prev) => (prev ? { ...prev, customDomain: data.customDomain, domainVerifiedAt: data.domainVerifiedAt } : prev));
      toast(data.customDomain ? "Domain saved" : "Domain removed");
    } catch {
      toast("Couldn't save domain", "error");
    } finally {
      setDomainSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        await fetch(`/api/restaurants/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo: data.url }),
        });
        fetchData();
      }
    } catch {
      toast("Image upload failed", "error");
    }
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const previous = categories;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    fetch(`/api/restaurants/${id}/categories`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((c, i) => ({ id: c.id, order: i })) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => {
        setCategories(previous);
        toast("Couldn't save the new order — reverted", "error");
      });
  }

  function moveItem(catIndex: number, itemIndex: number, direction: -1 | 1) {
    const items = categories[catIndex].items;
    const target = itemIndex + direction;
    if (target < 0 || target >= items.length) return;
    const previous = categories;
    const nextItems = [...items];
    [nextItems[itemIndex], nextItems[target]] = [nextItems[target], nextItems[itemIndex]];
    const next = [...categories];
    next[catIndex] = { ...next[catIndex], items: nextItems };
    setCategories(next);
    fetch(`/api/restaurants/${id}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: nextItems.map((it, i) => ({ id: it.id, order: i })) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => {
        setCategories(previous);
        toast("Couldn't save the new order — reverted", "error");
      });
  }

  if (loading) {
    return (
      <div className="page-shell max-w-3xl">
        <div className="mb-6"><SkeletonLine width="160px" height="32px" /></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonBlock key={i} height="h-24" />)}
        </div>
      </div>
    );
  }

  if (!restaurant) return <div>Not found</div>;

  const fontOption = FONT_OPTIONS.find((f) => f.value === fontFamily) ?? FONT_OPTIONS[0];

  return (
    <div className="page-shell max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title">Design</h1>
        <p className="page-subtitle mt-1">Set your menu&apos;s brand look, layout, and item order</p>
      </div>

      {/* Logo */}
      <div className="surface-card p-5 mb-6 flex items-center gap-4">
        <label className="relative group cursor-pointer shrink-0">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt={restaurant.name} className="w-16 h-16 rounded-2xl object-cover ring-1 ring-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-orange-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <Pencil className="w-5 h-5 text-white" />
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadLogo(file);
            }}
          />
        </label>
        <div>
          <h3 className="font-bold text-gray-900">Logo</h3>
          <p className="text-xs text-gray-500 mt-0.5">Shown on your public menu and QR code page</p>
        </div>
      </div>

      {/* Look templates */}
      <div className="surface-card p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Look Templates</h3>
        <p className="text-xs text-gray-500 mb-4">Start from a preset, then fine-tune below</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DESIGN_TEMPLATES.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="text-left rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition p-3"
            >
              <div
                className="w-full h-10 rounded-lg mb-2"
                style={{ background: `linear-gradient(135deg, ${tpl.theme.primary}, ${tpl.theme.accent})` }}
              />
              <p className="text-xs font-bold text-gray-800">{tpl.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{tpl.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Brand colors */}
      <div className="surface-card p-5 mb-6 space-y-4">
        <h3 className="font-bold text-gray-900">Brand Colors</h3>
        <p className="text-xs text-gray-500 -mt-2">The default look for your menu when no mood rule is active</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("light"); setBg("#FFFFFF"); setText("#1F2937"); }}
            className={`text-xs px-4 py-2 rounded-lg border transition inline-flex items-center gap-1.5 ${mode === "light" ? "bg-white border-orange-400 text-orange-600 font-bold" : "bg-gray-50 border-gray-200"}`}
          >
            <Sun className="w-3.5 h-3.5" /> Light
          </button>
          <button
            type="button"
            onClick={() => { setMode("dark"); setBg("#1C1917"); setText("#FAFAF9"); }}
            className={`text-xs px-4 py-2 rounded-lg border transition inline-flex items-center gap-1.5 ${mode === "dark" ? "bg-gray-900 border-gray-700 text-white font-bold" : "bg-gray-50 border-gray-200"}`}
          >
            <Moon className="w-3.5 h-3.5" /> Dark
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Primary</label>
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Accent</label>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Background</label>
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Text</label>
            <input type="color" value={text} onChange={(e) => setText(e.target.value)} className="w-full h-9 rounded-lg cursor-pointer" />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: bg, color: text, border: "1px solid rgba(0,0,0,0.1)" }}>
          <div className="w-10 h-10 rounded-lg shrink-0" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
          <div style={{ fontFamily: fontOption.cssFamily }}>
            <p className="font-bold text-sm">{restaurant.name}</p>
            <p className="text-xs" style={{ color: primary }}>Rs. 200</p>
          </div>
        </div>
      </div>

      {/* Font */}
      <div className="surface-card p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-3">Font</h3>
        <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="control-input">
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Layout style */}
      <div className="surface-card p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-3">Menu Layout</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCardStyle("list")}
            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition inline-flex items-center justify-center gap-2 ${cardStyle === "list" ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setCardStyle("grid")}
            className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition inline-flex items-center justify-center gap-2 ${cardStyle === "grid" ? "bg-orange-500 border-orange-500 text-white" : "bg-gray-50 border-gray-200 text-gray-600"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Grid
          </button>
        </div>
      </div>

      {/* Page layout */}
      <div className="surface-card p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Page Layout</h3>
        <p className="text-xs text-gray-500 mb-4">How your menu page is structured for customers</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { value: "classic", label: "Classic", description: "One continuous scroll" },
              { value: "tabbed", label: "Tabbed", description: "One category at a time" },
              { value: "magazine", label: "Magazine", description: "Bold, editorial sections" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLayoutTemplate(opt.value)}
              className={`text-left rounded-xl border p-3 transition ${layoutTemplate === opt.value ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}
            >
              <div className="w-full h-16 rounded-lg bg-white border border-gray-200 p-1.5 mb-2 flex flex-col gap-1">
                <div className="h-3 rounded bg-gray-300" />
                {opt.value === "classic" && (
                  <>
                    <div className="flex gap-1"><div className="h-1.5 w-4 rounded-full bg-gray-300" /><div className="h-1.5 w-4 rounded-full bg-gray-200" /><div className="h-1.5 w-4 rounded-full bg-gray-200" /></div>
                    <div className="flex-1 rounded bg-gray-100" />
                    <div className="flex-1 rounded bg-gray-100" />
                  </>
                )}
                {opt.value === "tabbed" && (
                  <>
                    <div className="flex gap-1"><div className="h-2 w-5 rounded-full bg-gray-400" /><div className="h-2 w-4 rounded-full bg-gray-200" /><div className="h-2 w-4 rounded-full bg-gray-200" /></div>
                    <div className="flex-1 rounded bg-gray-100" />
                  </>
                )}
                {opt.value === "magazine" && (
                  <>
                    <div className="h-1 w-6 rounded-full bg-gray-300" />
                    <div className="h-2 rounded bg-gray-300 w-2/3" />
                    <div className="flex-1 rounded bg-gray-100" />
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-gray-800">{opt.label}</p>
              <p className="text-[10px] text-gray-400">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <button onClick={saveDesign} disabled={saving} className="btn-primary w-full mb-8 disabled:opacity-50">
        {saving ? "Saving…" : "Save Design"}
      </button>

      <section className="mt-10 pt-10 border-t border-gray-200">
        <div className="mb-6">
          <h2 className="text-xl font-extrabold text-gray-900">Landing Page</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create your restaurant&apos;s public homepage with AI, then edit the copy and contact details here.
          </p>
        </div>
        <LandingPageSettings embedded />
      </section>

      {/* Custom domain */}
      <div className="surface-card p-5 mb-6">
        <h3 className="font-bold text-gray-900 mb-1">Custom Domain</h3>
        <p className="text-xs text-gray-500 mb-4">
          Use your own domain instead of menuor.com — your menu (or landing page, if enabled) shows at the root, and <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">/admin</code> and{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">/staff</code> reach this dashboard and the staff view under it. Logins are tied to
          the domain you&apos;re on, so you&apos;ll need to sign in once on your new domain too — it won&apos;t reuse a menuor.com session.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourrestaurant.com"
            className="control-input flex-1"
          />
          <button onClick={saveDomain} disabled={domainSaving} className="btn-primary !w-auto px-6 disabled:opacity-50">
            {domainSaving ? "Saving…" : "Save"}
          </button>
        </div>

        {restaurant.customDomain && (
          <div className={`flex items-center gap-2 text-xs font-semibold mb-3 px-3 py-2 rounded-lg ${
            restaurant.domainVerifiedAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${restaurant.domainVerifiedAt ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            {restaurant.domainVerifiedAt
              ? "Live — HTTPS is active and public links now use this domain"
              : "Pending — waiting on DNS, then HTTPS is issued automatically. Public links stay on menuor.com until it goes live."}
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
          <p className="font-semibold text-gray-700">To connect your domain:</p>
          <p>1. At your domain registrar, add an <strong>A record</strong> pointing to <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200">168.144.77.104</code></p>
          <p>2. Save the domain here once DNS is set</p>
          <p>3. That&apos;s it — HTTPS is issued automatically once your domain resolves, usually within a few minutes. No need to contact us.</p>
        </div>
      </div>

      {/* Reorder categories & items */}
      <div className="surface-card p-5">
        <h3 className="font-bold text-gray-900 mb-1">Category &amp; Item Order</h3>
        <p className="text-xs text-gray-500 mb-4">This controls the order customers see on your menu</p>

        <div className="space-y-2">
          {categories.map((cat, catIndex) => (
            <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveCategory(catIndex, -1)}
                    disabled={catIndex === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-25"
                    aria-label={`Move ${cat.name} up`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCategory(catIndex, 1)}
                    disabled={catIndex === categories.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-25"
                    aria-label={`Move ${cat.name} down`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  className="flex-1 text-left font-semibold text-sm text-gray-900"
                  onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                >
                  {cat.name} <span className="text-xs text-gray-400 font-normal">({cat.items.length})</span>
                </button>
              </div>

              {expandedCat === cat.id && (
                <div className="px-3 pb-3 space-y-1.5">
                  {cat.items.map((item, itemIndex) => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => moveItem(catIndex, itemIndex, -1)}
                          disabled={itemIndex === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-25"
                          aria-label={`Move ${item.name} up`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(catIndex, itemIndex, 1)}
                          disabled={itemIndex === cat.items.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-25"
                          aria-label={`Move ${item.name} down`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm flex-1 text-gray-700">{item.name}</span>
                    </div>
                  ))}
                  {cat.items.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">No items in this category</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No categories yet — add some from the Menu tab first</p>
          )}
        </div>
      </div>
    </div>
  );
}
