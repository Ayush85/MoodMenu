"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import type { RawWaiterCall, WaiterCall } from "./types";

function timeAgoShort(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function playChime() {
  try {
    const context = new AudioContext();
    [880, 1100, 1320].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0, context.currentTime + index * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, context.currentTime + index * 0.18 + 0.05);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + index * 0.18 + 0.3);
      oscillator.start(context.currentTime + index * 0.18);
      oscillator.stop(context.currentTime + index * 0.18 + 0.35);
    });
  } catch {
    // Audio is optional and may be unavailable in a locked-down browser.
  }
}

function showBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "/logo.svg",
    tag,
    ...({ renotify: true } as object),
  } as NotificationOptions);
}

interface Props {
  restaurantId: string;
  canUseCalls: boolean;
}

export default function WaiterCallQueue({ restaurantId, canUseCalls }: Props) {
  const { toast } = useToast();
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([]);
  const [callHistory, setCallHistory] = useState<RawWaiterCall[]>([]);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [updatingCallId, setUpdatingCallId] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const previousPendingCallIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if ("Notification" in window) setNotifGranted(Notification.permission === "granted");
  }, []);

  const fetchCalls = useCallback(() => {
    if (!canUseCalls) return;

    fetch(`/api/restaurants/${restaurantId}/waiter-calls`)
      .then((response) => response.json())
      .then((data: RawWaiterCall[]) => {
        const raw = Array.isArray(data) ? data : [];
        setCallHistory(raw);

        const active = raw
          .filter((call) => call.status === "PENDING" || call.status === "ACKNOWLEDGED")
          .map((call) => ({
            id: call.id,
            tableNumber: call.table.number,
            tableLabel: call.table.label,
            message: call.message,
            status: call.status as WaiterCall["status"],
            createdAt: call.createdAt,
          }))
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

        const pendingIds = new Set(
          active.filter((call) => call.status === "PENDING").map((call) => call.id),
        );
        if (previousPendingCallIds.current) {
          const newlyArrived = active.filter(
            (call) => call.status === "PENDING" && !previousPendingCallIds.current!.has(call.id),
          );
          if (newlyArrived.length > 0) {
            playChime();
            newlyArrived.forEach((call) =>
              showBrowserNotification(
                `${call.tableLabel || `Table ${call.tableNumber}`} needs help`,
                call.message || "Customer requesting assistance",
                call.id,
              ),
            );
          }
        }

        previousPendingCallIds.current = pendingIds;
        setPendingCalls(active);
      })
      .catch(() => {});
  }, [canUseCalls, restaurantId]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === "granted");
  }

  async function updateCallStatus(callId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setUpdatingCallId(callId);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/waiter-calls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast((data as { error?: string }).error || "Could not update call", "error");
        return;
      }
      await fetchCalls();
    } finally {
      setUpdatingCallId(null);
    }
  }

  if (!canUseCalls) {
    return (
      <section className="surface-card p-5">
        <p className="text-sm font-semibold text-gray-700">Waiter calls are available to owners and waiters.</p>
        <p className="mt-1 text-xs text-gray-500">Orders remain visible here for kitchen staff.</p>
      </section>
    );
  }

  const focusCall = pendingCalls[0] || null;
  const callQueue = pendingCalls.slice(1);
  const resolvedCallCount = callHistory.filter((call) => call.status === "RESOLVED").length;

  return (
    <section className="space-y-3">
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Front-of-house calls</p>
          <p className="mt-1 text-sm text-gray-500">Respond to guests without leaving Orders.</p>
        </div>
        <button
          onClick={requestNotifPermission}
          title={notifGranted ? "Notifications enabled" : "Enable browser notifications for waiter calls"}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition sm:justify-start sm:py-1.5 ${
            notifGranted
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill={notifGranted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notifGranted ? "Alerts on" : "Enable alerts"}
        </button>
      </div>

      {focusCall ? (
        <div className="surface-card mx-auto max-w-lg overflow-hidden">
          <div className={`flex items-center gap-2 px-5 py-2.5 ${focusCall.status === "PENDING" ? "bg-red-500" : "bg-amber-500"}`}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">
              {focusCall.status === "PENDING" ? "Needs Attention" : "On the Way"}
            </span>
            <span className="ml-auto text-[11px] text-white/80">{timeAgoShort(focusCall.createdAt)}</span>
          </div>
          <div className="p-5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Table</p>
            <h2 className="mb-1 truncate text-4xl font-black leading-none text-gray-900">
              {focusCall.tableLabel || focusCall.tableNumber}
            </h2>
            {focusCall.message && <p className="mt-2 text-sm italic leading-relaxed text-gray-500">&ldquo;{focusCall.message}&rdquo;</p>}
            <div className={`mt-4 grid gap-2.5 ${focusCall.status === "PENDING" ? "grid-cols-2" : "grid-cols-1"}`}>
              {focusCall.status === "PENDING" && (
                <button
                  onClick={() => updateCallStatus(focusCall.id, "ACKNOWLEDGED")}
                  disabled={updatingCallId === focusCall.id}
                  className="btn-soft py-3.5"
                >
                  On My Way
                </button>
              )}
              <button
                onClick={() => updateCallStatus(focusCall.id, "RESOLVED")}
                disabled={updatingCallId === focusCall.id}
                className="btn-primary py-3.5"
              >
                {updatingCallId === focusCall.id ? "Saving…" : "Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="surface-card mx-auto max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-1 text-lg font-extrabold text-gray-900">All Clear</h2>
          <p className="text-sm text-gray-500">No active calls right now</p>
          {resolvedCallCount > 0 && <p className="mt-2 text-xs font-semibold text-emerald-600">{resolvedCallCount} resolved today</p>}
        </div>
      )}

      {callQueue.length > 0 && (
        <div className="surface-card mx-auto max-w-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Queue</h3>
            <span className="text-xs text-gray-400">{callQueue.length} waiting</span>
          </div>
          <div className="divide-y divide-gray-100">
            {callQueue.map((call) => (
              <div key={call.id} className="flex flex-col gap-2.5 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${call.status === "PENDING" ? "animate-pulse bg-red-400" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{call.tableLabel || `Table ${call.tableNumber}`}</p>
                    {call.message && <p className="mt-0.5 truncate text-xs text-gray-400">{call.message}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{timeAgoShort(call.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 pl-5">
                  {call.status === "PENDING" && (
                    <button
                      onClick={() => updateCallStatus(call.id, "ACKNOWLEDGED")}
                      disabled={updatingCallId === call.id}
                      className="min-h-9 flex-1 rounded-lg bg-amber-50 px-2.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      ACK
                    </button>
                  )}
                  <button
                    onClick={() => updateCallStatus(call.id, "RESOLVED")}
                    disabled={updatingCallId === call.id}
                    className="min-h-9 flex-1 rounded-lg bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="surface-card mx-auto max-w-lg overflow-hidden">
        <button
          onClick={() => setShowCallHistory((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3.5 transition hover:bg-gray-50"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Call History</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{callHistory.length} total</span>
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${showCallHistory ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {showCallHistory && (
          <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto border-t border-gray-100">
            {callHistory.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No calls yet</p>
            ) : (
              callHistory.slice(0, 30).map((call) => (
                <div key={call.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-700">{call.table?.label || `Table ${call.table?.number}`}</p>
                    {call.message && <p className="truncate text-xs text-gray-400">{call.message}</p>}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      call.status === "PENDING" ? "bg-red-100 text-red-600" :
                      call.status === "ACKNOWLEDGED" ? "bg-amber-100 text-amber-600" :
                      "bg-emerald-100 text-emerald-600"
                    }`}>
                      {call.status === "ACKNOWLEDGED" ? "ACK" : call.status}
                    </div>
                    <p className="text-[10px] text-gray-400">{timeAgoShort(call.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
