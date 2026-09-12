"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, Gift, Pause, Pencil, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/Toast";

type OfferType = "BUY_ONE_GET_ONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "HAPPY_HOUR" | "CUSTOM";
interface Offer { id: string; title: string; description: string | null; type: OfferType; value: number | null; currency: string; startsAt: string | null; endsAt: string | null; daysOfWeek: number[]; startTime: string | null; endTime: string | null; isActive: boolean; }
interface FormState { title: string; description: string; type: OfferType; value: string; startsAt: string; endsAt: string; daysOfWeek: number[]; startTime: string; endTime: string; isActive: boolean; }

const emptyForm: FormState = { title: "", description: "", type: "CUSTOM", value: "", startsAt: "", endsAt: "", daysOfWeek: [], startTime: "", endTime: "", isActive: true };
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const typeNames: Record<OfferType, string> = { BUY_ONE_GET_ONE: "Buy one, get one", PERCENTAGE: "Percentage discount", FIXED_AMOUNT: "Fixed amount off", HAPPY_HOUR: "Happy hour", CUSTOM: "Custom offer" };

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "No end date"; }

export default function OffersPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/restaurants/${id}/offers`);
    if (res.ok) setOffers(await res.json());
    setLoading(false);
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((prev) => ({ ...prev, [key]: value })); }
  function toggleDay(day: number) { update("daysOfWeek", form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((item) => item !== day) : [...form.daysOfWeek, day].sort()); }
  function edit(offer: Offer) {
    setEditingId(offer.id);
    setForm({ title: offer.title, description: offer.description || "", type: offer.type, value: offer.value == null ? "" : String(offer.value), startsAt: offer.startsAt?.slice(0, 10) || "", endsAt: offer.endsAt?.slice(0, 10) || "", daysOfWeek: offer.daysOfWeek, startTime: offer.startTime || "", endTime: offer.endTime || "", isActive: offer.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function reset() { setEditingId(null); setForm(emptyForm); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return toast("Add an offer title", "error");
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), description: form.description.trim(), value: form.value, startsAt: form.startsAt ? `${form.startsAt}T00:00:00.000Z` : null, endsAt: form.endsAt ? `${form.endsAt}T23:59:59.999Z` : null };
      const res = await fetch(`/api/restaurants/${id}/offers${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save offer");
      toast(editingId ? "Offer updated" : "Offer created");
      reset();
      await load();
    } catch (error) { toast(error instanceof Error ? error.message : "Could not save offer", "error"); }
    finally { setSaving(false); }
  }

  async function toggle(offer: Offer) {
    const res = await fetch(`/api/restaurants/${id}/offers/${offer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !offer.isActive }) });
    if (res.ok) setOffers((prev) => prev.map((item) => item.id === offer.id ? { ...item, isActive: !item.isActive } : item));
  }
  async function remove(offer: Offer) {
    if (!window.confirm(`Delete “${offer.title}”?`)) return;
    const res = await fetch(`/api/restaurants/${id}/offers/${offer.id}`, { method: "DELETE" });
    if (res.ok) setOffers((prev) => prev.filter((item) => item.id !== offer.id));
  }

  return (
    <div className="page-shell max-w-4xl animate-fade-in">
      <div className="mb-6"><h1 className="page-title">Offers</h1><p className="page-subtitle mt-1">Create promotions that appear automatically on your public menu while they are active.</p></div>
      <form onSubmit={save} className="surface-card mb-8 space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-gray-900">{editingId ? "Edit offer" : "Create an offer"}</h2><p className="mt-1 text-xs text-gray-500">Use a clear title customers can understand at a glance.</p></div><Gift className="h-5 w-5 text-orange-500" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="field-label">Offer title</label><input className="control-input w-full" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Buy 1 Momos, Get 1 Free" /></div>
          <div><label className="field-label">Offer type</label><select className="control-input w-full" value={form.type} onChange={(e) => update("type", e.target.value as OfferType)}>{Object.entries(typeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {(form.type === "PERCENTAGE" || form.type === "FIXED_AMOUNT") && <div><label className="field-label">Discount value</label><input className="control-input w-full" type="number" min="0" step="0.01" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder={form.type === "PERCENTAGE" ? "25" : "100"} /></div>}
          <div className="sm:col-span-2"><label className="field-label">Customer-facing details</label><textarea className="control-input w-full resize-none" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Enjoy this offer when dining in. Ask our team for details." /></div>
        </div>
        <div className="border-t border-gray-100 pt-4"><p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800"><CalendarDays className="h-4 w-4 text-orange-500" /> Schedule</p><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label">Starts on</label><input className="control-input w-full" type="date" value={form.startsAt} onChange={(e) => update("startsAt", e.target.value)} /></div><div><label className="field-label">Ends on</label><input className="control-input w-full" type="date" value={form.endsAt} onChange={(e) => update("endsAt", e.target.value)} /></div></div><div className="mt-4"><label className="field-label">Repeat on specific days <span className="font-normal normal-case text-gray-400">(leave empty for every day)</span></label><div className="mt-2 flex flex-wrap gap-2">{dayNames.map((day, index) => <button type="button" key={day} onClick={() => toggleDay(index)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.daysOfWeek.includes(index) ? "border-orange-500 bg-orange-500 text-white" : "border-gray-200 text-gray-500 hover:border-orange-300"}`}>{day}</button>)}</div></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="field-label"><Clock3 className="mr-1 inline h-3.5 w-3.5" /> Daily start time</label><input className="control-input w-full" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} /></div><div><label className="field-label">Daily end time</label><input className="control-input w-full" type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} /></div></div></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="h-4 w-4 accent-orange-500" /> Show this offer on the public menu when it is within schedule</label>
        <div className="flex flex-wrap gap-2"><button className="btn-primary !w-auto" disabled={saving}>{saving ? "Saving…" : editingId ? "Update offer" : <><Plus className="h-4 w-4" /> Create offer</>}</button>{editingId && <button type="button" onClick={reset} className="btn-soft !w-auto">Cancel</button>}</div>
      </form>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Your offers</h2><span className="text-xs text-gray-400">{offers.length} total</span></div>
      {loading ? <div className="surface-card p-6 text-sm text-gray-400">Loading offers…</div> : offers.length === 0 ? <div className="surface-card p-8 text-center text-sm text-gray-500">No offers yet. Create your first promotion above.</div> : <div className="space-y-3">{offers.map((offer) => <article key={offer.id} className={`surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${!offer.isActive ? "opacity-60" : ""}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-gray-900">{offer.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${offer.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{offer.isActive ? "Active" : "Paused"}</span></div><p className="mt-1 text-xs text-gray-500">{typeNames[offer.type]} · {formatDate(offer.endsAt)}{offer.startTime && offer.endTime ? ` · ${offer.startTime}–${offer.endTime}` : ""}</p>{offer.description && <p className="mt-1 text-sm text-gray-700">{offer.description}</p>}</div><div className="flex shrink-0 gap-2"><button onClick={() => toggle(offer)} className="btn-soft !w-auto px-3" title={offer.isActive ? "Pause offer" : "Activate offer"}>{offer.isActive ? <Pause className="h-4 w-4" /> : <Gift className="h-4 w-4" />}</button><button onClick={() => edit(offer)} className="btn-soft !w-auto px-3"><Pencil className="h-4 w-4" /></button><button onClick={() => remove(offer)} className="btn-soft !w-auto px-3 text-red-500"><Trash2 className="h-4 w-4" /></button></div></article>)}</div>}
    </div>
  );
}
