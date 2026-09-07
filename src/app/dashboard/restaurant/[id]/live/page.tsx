"use client";

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
    [880, 1100, 1320].forEach((freq, i) => {
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
  } catch { /* audio unavailable */ }
}

function showBrowserNotification(call: WaiterCall) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(`${call.tableLabel || `Table ${call.tableNumber}`} needs help`, {
    body: call.message || "Customer requesting assistance",
    icon: "/logo.svg",
    tag: call.id,
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
  const [tick, setTick] = useState(0);

  const prevPendingIds = useRef<Set<string>>(new Set());

  const actorType = session?.user?.actorType;
  const staffRole = session?.user?.role;
  const canAccess = sessionStatus === "authenticated" && (actorType === "USER" || staffRole === "WAITER");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.replace("/login");
  }, [sessionStatus, router]);

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => setRestaurant({ id: data.id, name: data.name, logo: data.logo }))
      .catch(() => {});
  }, [id]);

  // tick for live time-ago updates
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 10000);
    return () => clearInterval(t);
  }, []);

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === "granted");
  }

  useEffect(() => {
    if ("Notification" in window) setNotifGranted(Notification.permission === "granted");
  }, []);

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
          if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      const newPendingIds = new Set(active.filter((c) => c.status === "PENDING").map((c) => c.id));
      const hasNew = [...newPendingIds].some((cid) => !prevPendingIds.current.has(cid));
      if (hasNew) {
        playChime();
        active.filter((c) => c.status === "PENDING" && !prevPendingIds.current.has(c.id)).forEach(showBrowserNotification);
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

  const pendingCalls = calls.filter((c) => c.status === "PENDING");
  const ackCalls = calls.filter((c) => c.status === "ACKNOWLEDGED");
  const resolvedCount = history.filter((c) => c.status === "RESOLVED").length;
  const focusCall = calls[0] || null;
  const queue = calls.slice(1);

  if (sessionStatus === "loading") {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Access Restricted</h2>
          <p className="text-white/40 text-sm">Only waiters and admins can access this.</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-orange-400 hover:text-orange-300 font-semibold">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    /* fixed inset-0 so it covers the sidebar & dashboard layout */
    <div className="fixed inset-0 z-50 bg-[#080810] text-white flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <header className="shrink-0 flex items-center justify-between px-4 h-14 bg-black/30 border-b border-white/6 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/12 flex items-center justify-center transition"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest leading-none">Live Board</p>
            <p className="text-sm font-bold text-white leading-snug mt-0.5">{restaurant?.name || "…"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-[11px] font-semibold text-white/40">{connected ? "Live" : "…"}</span>
          </div>
          <button
            onClick={requestNotifPermission}
            title={notifGranted ? "Notifications enabled" : "Enable notifications"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
              notifGranted ? "bg-amber-500/20 text-amber-400" : "bg-white/8 text-white/30 hover:bg-white/12"
            }`}
          >
            <svg className="w-4 h-4" fill={notifGranted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          {pendingCalls.length > 0 && (
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-red-500 animate-ping opacity-40" />
              <div className="relative w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-xs font-extrabold">
                {pendingCalls.length}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Stats strip ── */}
      <div className="shrink-0 flex border-b border-white/5 bg-black/20">
        {[
          { label: "Pending",  value: pendingCalls.length, color: "text-red-400",     dot: "bg-red-400" },
          { label: "On Way",   value: ackCalls.length,     color: "text-amber-400",   dot: "bg-amber-400" },
          { label: "Resolved", value: resolvedCount,        color: "text-emerald-400", dot: "bg-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-r border-white/5 last:border-0">
            <div className={`w-1.5 h-1.5 rounded-full ${s.dot} ${s.label === "Pending" && s.value > 0 ? "animate-pulse" : ""}`} />
            <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-5 space-y-3 pb-8">

          {/* Hero: active call or all-clear */}
          {focusCall ? (
            <div className="rounded-3xl overflow-hidden">
              {/* Status stripe */}
              <div className={`flex items-center gap-2 px-5 py-3 ${
                focusCall.status === "PENDING" ? "bg-red-500" : "bg-amber-500"
              }`}>
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">
                  {focusCall.status === "PENDING" ? "Needs Attention" : "On the Way"}
                </span>
                <span className="ml-auto text-[11px] text-white/70">{timeAgo(focusCall.createdAt)}</span>
              </div>

              {/* Body */}
              <div className="bg-gray-900 border border-white/6 border-t-0 rounded-b-3xl p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-wide mb-1">Table</p>
                    <h2 className="text-5xl font-black text-white leading-none truncate">
                      {focusCall.tableLabel || focusCall.tableNumber}
                    </h2>
                    {focusCall.message && (
                      <p className="mt-3 text-sm text-white/60 leading-relaxed italic">
                        &ldquo;{focusCall.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-3xl font-black ${
                    focusCall.status === "PENDING" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {focusCall.tableNumber}
                  </div>
                </div>

                {/* Action buttons */}
                <div className={`grid gap-2.5 ${focusCall.status === "PENDING" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {focusCall.status === "PENDING" && (
                    <button
                      onClick={() => updateStatus(focusCall.id, "ACKNOWLEDGED")}
                      disabled={updatingId === focusCall.id}
                      className="py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      On My Way
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(focusCall.id, "RESOLVED")}
                    disabled={updatingId === focusCall.id}
                    className="py-4 rounded-2xl font-bold text-sm transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {updatingId === focusCall.id ? "Saving…" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* All-clear state */
            <div className="rounded-3xl bg-gray-900 border border-white/6 p-8 flex flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping scale-150" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-0 rounded-full bg-emerald-500/8 scale-125" />
                <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg className="w-9 h-9 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">All Clear</h2>
              <p className="text-sm text-white/30">No active calls right now</p>
              {resolvedCount > 0 && (
                <p className="mt-3 text-xs text-emerald-400/60 font-semibold">
                  {resolvedCount} resolved today
                </p>
              )}
            </div>
          )}

          {/* Queue */}
          {queue.length > 0 && (
            <div className="rounded-2xl bg-gray-900 border border-white/6 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Queue</h3>
                <span className="text-xs text-white/30">{queue.length} waiting</span>
              </div>
              <div className="divide-y divide-white/4">
                {queue.map((call) => (
                  <div key={call.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      call.status === "PENDING" ? "bg-red-400 animate-pulse" : "bg-amber-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {call.tableLabel || `Table ${call.tableNumber}`}
                      </p>
                      {call.message && (
                        <p className="text-xs text-white/30 truncate mt-0.5">{call.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-white/25">{timeAgo(call.createdAt)}</span>
                      {call.status === "PENDING" && (
                        <button
                          onClick={() => updateStatus(call.id, "ACKNOWLEDGED")}
                          disabled={updatingId === call.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition font-semibold disabled:opacity-50"
                        >
                          ACK
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(call.id, "RESOLVED")}
                        disabled={updatingId === call.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-semibold disabled:opacity-50"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call history */}
          <div className="rounded-2xl bg-gray-900 border border-white/6 overflow-hidden">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/2 transition"
            >
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Call History</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/25">{history.length} total</span>
                <svg className={`w-4 h-4 text-white/30 transition-transform ${showHistory ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showHistory && (
              <div className="border-t border-white/5 max-h-64 overflow-y-auto divide-y divide-white/4">
                {history.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-white/20">No calls yet</p>
                ) : (
                  history.slice(0, 30).map((call) => (
                    <div key={call.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white/70 truncate">
                          {call.table?.label || `Table ${call.table?.number}`}
                        </p>
                        {call.message && <p className="text-xs text-white/25 truncate">{call.message}</p>}
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          call.status === "PENDING"      ? "bg-red-500/15 text-red-400" :
                          call.status === "ACKNOWLEDGED" ? "bg-amber-500/15 text-amber-400" :
                                                           "bg-emerald-500/15 text-emerald-400"
                        }`}>
                          {call.status === "ACKNOWLEDGED" ? "ACK" : call.status}
                        </div>
                        <p className="text-[10px] text-white/20">{timeAgo(call.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Tip */}
          <p className="text-center text-[11px] text-white/15 leading-relaxed px-4">
            Refreshes every 3 s · Tap the bell to enable push alerts
          </p>
        </div>
      </div>
    </div>
  );
}
