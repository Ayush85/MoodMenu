"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/Toast";

type Category = "INGREDIENTS" | "UTILITIES" | "STAFF" | "RENT" | "MAINTENANCE" | "MARKETING" | "EQUIPMENT" | "OTHER";

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: Category;
  note: string | null;
  date: string;
}

const CATEGORIES: { value: Category; label: string; color: string; bg: string; icon: string }[] = [
  { value: "INGREDIENTS", label: "Ingredients",  color: "text-green-700",  bg: "bg-green-50",  icon: "🥬" },
  { value: "UTILITIES",   label: "Utilities",    color: "text-blue-700",   bg: "bg-blue-50",   icon: "💡" },
  { value: "STAFF",       label: "Staff",        color: "text-violet-700", bg: "bg-violet-50", icon: "👥" },
  { value: "RENT",        label: "Rent",         color: "text-orange-700", bg: "bg-orange-50", icon: "🏠" },
  { value: "MAINTENANCE", label: "Maintenance",  color: "text-yellow-700", bg: "bg-yellow-50", icon: "🔧" },
  { value: "MARKETING",   label: "Marketing",    color: "text-pink-700",   bg: "bg-pink-50",   icon: "📢" },
  { value: "EQUIPMENT",   label: "Equipment",    color: "text-cyan-700",   bg: "bg-cyan-50",   icon: "🖥️" },
  { value: "OTHER",       label: "Other",        color: "text-gray-600",   bg: "bg-gray-100",  icon: "📦" },
];

function catMeta(c: Category) {
  return CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];
}

function fmt(n: number) {
  return `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export default function ExpensesPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Date range filter
  const [rangeMode, setRangeMode] = useState<"today" | "week" | "month" | "custom">("today");
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState<Category>("INGREDIENTS");
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(todayIso());

  function getRange(): { from: string; to: string } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (rangeMode === "today") return { from: today, to: today };
    if (rangeMode === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    if (rangeMode === "month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    return { from: customFrom, to: customTo };
  }

  async function fetchExpenses() {
    const { from, to } = getRange();
    const res = await fetch(`/api/restaurants/${id}/expenses?from=${from}&to=${to}`);
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, rangeMode, customFrom, customTo]);

  async function addExpense() {
    const amount = parseFloat(formAmount);
    if (!formTitle.trim() || isNaN(amount) || amount <= 0) {
      toast("Enter a valid title and amount");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/restaurants/${id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: formTitle.trim(), amount, category: formCategory, note: formNote.trim() || null, date: formDate }),
    });
    setSaving(false);
    if (res.ok) {
      toast("Expense added");
      setFormTitle(""); setFormAmount(""); setFormNote(""); setFormDate(todayIso()); setShowForm(false);
      fetchExpenses();
    } else {
      toast("Failed to add expense");
    }
  }

  async function deleteExpense(expenseId: string) {
    setDeletingId(expenseId);
    await fetch(`/api/restaurants/${id}/expenses/${expenseId}`, { method: "DELETE" });
    setDeletingId(null);
    fetchExpenses();
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    total: expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const maxCatAmount = Math.max(...byCategory.map((c) => c.total), 1);

  // Group expenses by date
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.date.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const rangeLabelMap = { today: "Today", week: "Last 7 days", month: "This month", custom: "Custom" };

  return (
    <div className="page-shell animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle mt-1">Track costs and see your daily profit</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary text-sm!"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Add Expense form */}
      {showForm && (
        <div className="surface-card p-5 mb-6 animate-fade-in">
          <h2 className="text-sm font-bold text-gray-900 mb-4">New Expense</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
              <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Vegetables from market"
                className="control-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (Rs.)</label>
              <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                type="number" min="1" placeholder="0"
                className="control-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as Category)}
                className="control-input">
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
              <input value={formDate} onChange={(e) => setFormDate(e.target.value)}
                type="date" className="control-input" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Note (optional)</label>
            <input value={formNote} onChange={(e) => setFormNote(e.target.value)}
              placeholder="Any additional details"
              className="control-input" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="btn-soft text-sm!">Cancel</button>
            <button onClick={addExpense} disabled={saving} className="btn-primary text-sm! disabled:opacity-50">
              {saving ? "Saving…" : "Save Expense"}
            </button>
          </div>
        </div>
      )}

      {/* Date range filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["today", "week", "month", "custom"] as const).map((r) => (
            <button key={r} onClick={() => setRangeMode(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${rangeMode === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {rangeLabelMap[r]}
            </button>
          ))}
        </div>
        {rangeMode === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="control-input !py-1.5 text-sm w-36" />
            <span className="text-gray-400 text-sm">→</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="control-input !py-1.5 text-sm w-36" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="surface-card h-32 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="surface-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-lg">💸</div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Expenses</p>
              </div>
              <p className="text-2xl font-extrabold text-red-600">{fmt(totalExpenses)}</p>
              <p className="text-xs text-gray-400 mt-1">{rangeLabelMap[rangeMode]} · {expenses.length} entries</p>
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg">📊</div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Top Category</p>
              </div>
              {byCategory.length > 0 ? (
                <>
                  <p className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    <span>{byCategory[0].icon}</span> {byCategory[0].label}
                  </p>
                  <p className="text-sm font-bold text-red-500 mt-0.5">{fmt(byCategory[0].total)}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">No expenses yet</p>
              )}
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg">📅</div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Daily Average</p>
              </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {fmt(groupedDates.length > 0 ? totalExpenses / groupedDates.length : 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">per day over {groupedDates.length} day{groupedDates.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Category breakdown */}
            <div className="surface-card p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">By Category</h2>
              {byCategory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No expenses in this period</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map((c) => (
                    <div key={c.value}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          <span>{c.icon}</span> {c.label}
                        </span>
                        <span className="text-xs font-bold text-red-600">{fmt(c.total)}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full">
                        <div className={`h-full rounded-full ${c.bg.replace("bg-", "bg-").replace("50", "400")} transition-all`}
                          style={{ width: `${(c.total / maxCatAmount) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense log grouped by date */}
            <div className="surface-card overflow-hidden lg:col-span-2">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Expense Log</h2>
                <span className="text-xs text-gray-400">{expenses.length} entries</span>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">📝</p>
                  <p className="text-sm text-gray-400">No expenses recorded for this period</p>
                  <button onClick={() => setShowForm(true)}
                    className="mt-3 text-xs font-semibold text-orange-500 hover:text-orange-600">
                    + Add your first expense
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                  {groupedDates.map((date) => (
                    <div key={date}>
                      <div className="px-5 py-2 bg-gray-50 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{fmtDate(date)}</span>
                        <span className="text-[11px] font-bold text-red-500">
                          {fmt(grouped[date].reduce((s, e) => s + e.amount, 0))}
                        </span>
                      </div>
                      {grouped[date].map((expense) => {
                        const meta = catMeta(expense.category);
                        return (
                          <div key={expense.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 group transition">
                            <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center text-sm shrink-0`}>
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{expense.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                                  {meta.label}
                                </span>
                                {expense.note && (
                                  <span className="text-[10px] text-gray-400 truncate">{expense.note}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-bold text-red-600 shrink-0">{fmt(expense.amount)}</p>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              disabled={deletingId === expense.id}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 shrink-0"
                            >
                              {deletingId === expense.id ? "…" : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
