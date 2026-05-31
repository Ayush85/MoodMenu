"use client";

/**
 * Live Waiter Dashboard
 * ─────────────────────
 * A full-screen, mobile-optimised "heads-up" view for floor staff.
 * - Polls for pending/acknowledged waiter calls every 3 s
 * - Plays a chime + browser notification on every new call
 * - Shows the most-urgent call in a large "hero" card
 * - Scroll down for the full queue + recent call history
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface WaiterCall {
  id: string;
  tableNumber: number;
  tableLabel: string | null;
  message: string | null;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
}

interface RawCall {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  table: { number: number; label: string | null };
}

interface Restaurant {
  id: string;
  name: string;
  logo: string | null;
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const frequencies = [880, 1100, 1320];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.18 + 0.3);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.35);
    });
  } catch {
    // Audio not available
  }
}

function showBrowserNotification(call: WaiterCall) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(`🔔 ${call.tableLabel || `Table ${call.tableNumber}`}`, {
    body: call.message || "Customer needs assistance",
    icon: "/logo.png",
    tag: call.id,
    // renotify is valid in browsers but may be missing from older TS lib types
    ...({ renotify: true } as object),
  } as NotificationOptions);
}

export default function LiveWaiterPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const id = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [history, setHistory] = useState<RawCall[]>([]);
  const [connected, setConnected] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const prevPendingIds = useRef<Set<string>>(new Set());

  // ── Permission check ────────────────────────────────────────────────────
  const actorType = session?.user?.actorType;
  const staffRole = session?.user?.role;
  // While session is still loading, session data is null — allow render so
  // we don't flash the "Access Restricted" screen during hydration.
  const canAccess =
    !session ||                    // null while loading → hold off
    actorType === "USER" ||
    staffRole === "WAITER";

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [sessionStatus, router]);

  // ── Load restaurant basics ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => setRestaurant({ id: data.id, name: data.name, logo: data.logo }))
      .catch(() => {});
  }, [id]);

  // ── Request browser notification permission ─────────────────────────────
  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === "granted");
  }

  useEffect(() => {
    if ("Notification" in window) {
      setNotifGranted(Notification.permission === "granted");
    }
  }, []);

  // ── Poll for calls ──────────────────────────────────────────────────────
  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/restaurants/${id}/waiter-calls`);
      if (!res.ok) return;
      const raw: RawCall[] = await res.json();

      setHistory(raw);

      const active = raw
        .filter((c) => c.status === "PENDING" || c.status === "ACKNOWLEDGED")
        .map((c) => ({
          id: c.id,
          tableNumber: c.table.number,
          tableLabel: c.table.label,
          message: c.message,
          status: c.status as WaiterCall["status"],
          createdAt: c.createdAt,
        }))
        .sort((a, b) => {
          // PENDING before ACKNOWLEDGED, then oldest first
          if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      // Detect brand-new PENDING calls
      const newPendingIds = new Set(active.filter((c) => c.status === "PENDING").map((c) => c.id));
      const hasNewCalls = [...newPendingIds].some((callId) => !prevPendingIds.current.has(callId));

      if (hasNewCalls) {
        playChime();
        active
          .filter((c) => c.status === "PENDING" && !prevPendingIds.current.has(c.id))
          .forEach(showBrowserNotification);
      }

      prevPendingIds.current = newPendingIds;
      setCalls(active);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  // ── Update call status ──────────────────────────────────────────────────
  async function updateStatus(callId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setUpdatingId(callId);
    try {
      await fetch(`/api/restaurants/${id}/waiter-calls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, status }),
      });
      await fetchCalls();
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────
  const pendingCalls = calls.filter((c: WaiterCall) => c.status === "PENDING");
  const ackCalls = calls.filter((c: WaiterCall) => c.status === "ACKNOWLEDGED");
  const focusCall = calls[0] || null;
  const pendingCount = pendingCalls.length;

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm">Only waiters and admins can access the live call board.</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-orange-500 hover:text-orange-600 font-semibold">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 transition flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {restaurant?.logo ? (
            <img src={restaurant.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : null}
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider leading-none">Live Board</p>
            <p className="text-sm font-bold leading-tight">{restaurant?.name || "…"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection dot */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs text-white/40">{connected ? "Live" : "Connecting…"}</span>
          </div>

          {/* Notification bell */}
          <button
            onClick={requestNotifPermission}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              notifGranted ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40 hover:bg-white/15"
            }`}
            title={notifGranted ? "Browser notifications on" : "Enable browser notifications"}
          >
            <svg className="w-4 h-4" fill={notifGranted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Pending badge */}
          {pendingCount > 0 && (
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center font-extrabold text-sm animate-pulse">
                {pendingCount}
              </div>
              <div className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-30" />
            </div>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">

        {/* ─ Hero card: priority call ─ */}
        {focusCall ? (
          <div className={`rounded-3xl p-5 space-y-4 ${
            focusCall.status === "PENDING"
              ? "bg-red-500"
              : "bg-amber-500"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-white/70 mb-1">
                  {focusCall.status === "PENDING" ? "🔔 Needs Attention" : "🚶 On the Way"}
                </div>
                <h2 className="text-4xl font-black leading-none">
                  {focusCall.tableLabel || `Table ${focusCall.tableNumber}`}
                </h2>
                {focusCall.message && (
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">"{focusCall.message}"</p>
                )}
                <p className="mt-2 text-xs text-white/60">{timeAgo(focusCall.createdAt)}</p>
              </div>
              {/* Large table number badge */}
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-4xl font-black">{focusCall.tableNumber}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className={`grid gap-2 ${focusCall.status === "PENDING" ? "grid-cols-2" : "grid-cols-1"}`}>
              {focusCall.status === "PENDING" && (
                <button
                  onClick={() => updateStatus(focusCall.id, "ACKNOWLEDGED")}
                  disabled={updatingId === focusCall.id}
                  className="py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition disabled:opacity-50"
                >
                  {updatingId === focusCall.id ? "…" : "On My Way 🚶"}
                </button>
              )}
              <button
                onClick={() => updateStatus(focusCall.id, "RESOLVED")}
                disabled={updatingId === focusCall.id}
                className="py-3.5 rounded-2xl bg-white font-bold text-sm transition disabled:opacity-50"
                style={{ color: focusCall.status === "PENDING" ? "#ef4444" : "#f59e0b" }}
              >
                {updatingId === focusCall.id ? "…" : "✅ Mark Resolved"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-gray-900 border border-white/5 p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-white mb-1">All Clear</h2>
            <p className="text-sm text-white/40">No active calls right now</p>
          </div>
        )}

        {/* ─ Queue (remaining calls) ─ */}
        {calls.length > 1 && (
          <div className="bg-gray-900 border border-white/5 overflow-hidden rounded-2xl">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white/80">Queue</h3>
              <span className="text-xs text-white/40">{calls.length - 1} more</span>
            </div>
            <div className="divide-y divide-white/5">
              {calls.slice(1).map((call: WaiterCall) => (
                <div key={call.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      call.status === "PENDING" ? "bg-red-400 animate-pulse" : "bg-amber-400"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {call.tableLabel || `Table ${call.tableNumber}`}
                      </p>
                      {call.message && <p className="text-xs text-white/40 truncate">{call.message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-white/30">{timeAgo(call.createdAt)}</span>
                    {call.status === "PENDING" && (
                      <button
                        onClick={() => updateStatus(call.id, "ACKNOWLEDGED")}
                        disabled={updatingId === call.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition disabled:opacity-50"
                      >
                        ACK
                      </button>
                    )}
                    <button
                      onClick={() => updateStatus(call.id, "RESOLVED")}
                      disabled={updatingId === call.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ Stats bar ─ */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-gray-900 border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-red-400">{pendingCalls.length}</p>
            <p className="text-[10px] text-white/40 font-semibold uppercase mt-0.5">Pending</p>
          </div>
          <div className="rounded-2xl bg-gray-900 border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-amber-400">{ackCalls.length}</p>
            <p className="text-[10px] text-white/40 font-semibold uppercase mt-0.5">On the Way</p>
          </div>
          <div className="rounded-2xl bg-gray-900 border border-white/5 p-3 text-center">
            <p className="text-2xl font-black text-emerald-400">
              {history.filter((c) => c.status === "RESOLVED").length}
            </p>
            <p className="text-[10px] text-white/40 font-semibold uppercase mt-0.5">Resolved</p>
          </div>
        </div>

        {/* ─ Recent history (collapsible) ─ */}
        <div className="rounded-2xl bg-gray-900 border border-white/5 overflow-hidden">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-bold text-white/70 hover:text-white/90 transition"
          >
            <span>Call History</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">{history.length} total</span>
              <svg
                className={`w-4 h-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showHistory && (
            <div className="divide-y divide-white/5 border-t border-white/5 max-h-72 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-5 py-6 text-center text-sm text-white/30">No calls yet</div>
              ) : (
                history.slice(0, 30).map((call) => (
                  <div key={call.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {call.table?.label || `Table ${call.table?.number}`}
                      </p>
                      {call.message && <p className="text-xs text-white/30 truncate">{call.message}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        call.status === "PENDING"    ? "bg-red-500/20 text-red-400" :
                        call.status === "ACKNOWLEDGED" ? "bg-amber-500/20 text-amber-400" :
                        "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {call.status}
                      </span>
                      <p className="text-[10px] text-white/20 mt-0.5">{timeAgo(call.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─ Tip: keep screen on ─ */}
        <div className="rounded-2xl bg-white/3 border border-white/5 px-4 py-3 flex items-start gap-3">
          <svg className="w-4 h-4 text-white/30 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-white/25 leading-relaxed">
            Keep this page open on your phone. Calls refresh every 3 seconds.
            Tap the 🔔 icon to enable push alerts even when the screen is off.
          </p>
        </div>

        {/* Bottom padding for mobile nav */}
        <div className="h-4" />
      </main>
    </div>
  );
}
