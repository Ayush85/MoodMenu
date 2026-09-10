"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { SkeletonLine, SkeletonBlock } from "@/components/Skeleton";
import { Sparkles, Plus, X, ExternalLink } from "lucide-react";
import { LandingPageContent, DEFAULT_LANDING_CTA } from "@/types";

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  landingEnabled: boolean;
  landingPage: LandingPageContent | null;
}

export default function LandingPageSettings() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [ctaText, setCtaText] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((res) => res.json())
      .then((data: Restaurant) => {
        setRestaurant(data);
        setEnabled(data.landingEnabled);
        const content = data.landingPage;
        setTagline(content?.tagline || "");
        setAbout(content?.about || "");
        setHighlights(content?.highlights?.length ? content.highlights : []);
        setCtaText(content?.ctaText || "");
        setPhone(content?.phone || "");
        setAddress(content?.address || "");
        setHours(content?.hours || "");
        setInstagram(content?.instagram || "");
        setFacebook(content?.facebook || "");
        setLoading(false);
      });
  }, [id]);

  async function generateWithAI() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/generate-landing`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't generate copy", "error");
        return;
      }
      setTagline(data.tagline || "");
      setAbout(data.about || "");
      setHighlights(Array.isArray(data.highlights) ? data.highlights : []);
      setCtaText(data.ctaText || "");
      toast("Draft generated — review and click Save to keep it");
    } catch {
      toast("Couldn't generate copy", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const landingPage: LandingPageContent = {
        tagline: tagline.trim(),
        about: about.trim(),
        highlights: highlights.map((h) => h.trim()).filter(Boolean),
        ctaText: ctaText.trim() || DEFAULT_LANDING_CTA,
        phone: phone.trim() || null,
        address: address.trim() || null,
        hours: hours.trim() || null,
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
      };

      const res = await fetch(`/api/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingEnabled: enabled, landingPage }),
      });
      if (!res.ok) throw new Error();
      toast("Landing page saved");
    } catch {
      toast("Couldn't save landing page", "error");
    } finally {
      setSaving(false);
    }
  }

  function updateHighlight(index: number, value: string) {
    setHighlights((prev) => prev.map((h, i) => (i === index ? value : h)));
  }

  function removeHighlight(index: number) {
    setHighlights((prev) => prev.filter((_, i) => i !== index));
  }

  function addHighlight() {
    setHighlights((prev) => (prev.length >= 5 ? prev : [...prev, ""]));
  }

  if (loading) {
    return (
      <div className="page-shell max-w-3xl">
        <div className="mb-6"><SkeletonLine width="180px" height="32px" /></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SkeletonBlock key={i} height="h-24" />)}
        </div>
      </div>
    );
  }

  if (!restaurant) return <div>Not found</div>;

  return (
    <div className="page-shell max-w-3xl animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Landing Page</h1>
          <p className="page-subtitle mt-1">A marketing page shown at your domain&apos;s root, with the menu at /menu</p>
        </div>
        {enabled && (
          <Link
            href={`/landing/${restaurant.slug}`}
            target="_blank"
            className="btn-soft text-sm! !w-auto shrink-0 flex items-center gap-1.5"
          >
            Preview <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Enable toggle */}
      <div className="surface-card p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900">Enable landing page</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            When on, visitors to your domain&apos;s root see this page instead of the menu directly.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-orange-500 transition-colors" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {/* AI generate */}
      <div className="surface-card p-5 mb-6 bg-orange-50 border border-orange-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            Write it for me
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Generates a tagline, about text, and highlights from your restaurant name and menu — review before saving.
          </p>
        </div>
        <button onClick={generateWithAI} disabled={generating} className="btn-primary !w-auto px-5 text-sm! shrink-0 disabled:opacity-50">
          {generating ? "Generating…" : "Generate with AI"}
        </button>
      </div>

      {/* Content fields */}
      <div className="surface-card p-5 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short, catchy line about your restaurant"
            className="control-input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">About</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="A couple of sentences describing your restaurant"
            rows={4}
            className="control-input w-full resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Highlights</label>
          <div className="space-y-2">
            {highlights.map((highlight, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => updateHighlight(i, e.target.value)}
                  placeholder="e.g. Fresh, local ingredients"
                  className="control-input flex-1"
                />
                <button onClick={() => removeHighlight(i)} className="btn-soft !w-auto px-3">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {highlights.length < 5 && (
            <button onClick={addHighlight} className="mt-2 text-sm font-semibold text-orange-600 flex items-center gap-1 hover:text-orange-700">
              <Plus className="w-4 h-4" /> Add highlight
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Menu button text</label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder={DEFAULT_LANDING_CTA}
            className="control-input w-full"
          />
        </div>
      </div>

      {/* Contact info */}
      <div className="surface-card p-5 mb-6 space-y-4">
        <h3 className="font-bold text-gray-900">Contact &amp; Hours</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+977 98…" className="control-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" className="control-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Hours</label>
            <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. 10am – 10pm daily" className="control-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Instagram URL</label>
            <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/…" className="control-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Facebook URL</label>
            <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" className="control-input w-full" />
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full disabled:opacity-50">
        {saving ? "Saving…" : "Save Landing Page"}
      </button>
    </div>
  );
}
