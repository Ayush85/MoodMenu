"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

interface WaiterCall {
  id: string;
  tableNumber: number;
  tableLabel: string | null;
  message: string | null;
  status: string;
  createdAt: string;
}

interface RawWaiterCall {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  table: { number: number; label: string | null };
}

export default function StaffPage() {
  const params = useParams();
  const id = params.id as string;
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([]);
  const [allCalls, setAllCalls] = useState<RawWaiterCall[]>([]);
  const [connected, setConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);

  // SSE for real-time pending calls
  useEffect(() => {
    const eventSource = new EventSource(`/api/restaurants/${id}/waiter-calls/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        setConnected(true);
      }

      if (data.type === "calls") {
        const newCalls = data.calls as WaiterCall[];

        // Play sound if new call arrived
        if (newCalls.length > prevCountRef.current && prevCountRef.current >= 0) {
          playNotificationSound();
        }
        prevCountRef.current = newCalls.length;

        setPendingCalls(newCalls);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => eventSource.close();
  }, [id]);

  // Load all calls history
  useEffect(() => {
    fetch(`/api/restaurants/${id}/waiter-calls`)
      .then((r) => r.json())
      .then((data) => setAllCalls(data));
  }, [id, pendingCalls]);

  function playNotificationSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        osc2.type = "sine";
        gain2.gain.value = 0.3;
        osc2.start();
        osc2.stop(ctx.currentTime + 0.3);
      }, 200);
    } catch {
      // Audio not available
    }
  }

  async function updateCallStatus(callId: string, status: string) {
    await fetch(`/api/restaurants/${id}/waiter-calls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, status }),
    });
  }

  function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Panel</h1>
          <p className="text-gray-500 mt-1">Real-time waiter call notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-sm text-gray-500">{connected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      {/* Pending Calls - Big Alert Cards */}
      {pendingCalls.length > 0 ? (
        <div className="space-y-4 mb-10">
          <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Active Calls ({pendingCalls.length})
          </h2>
          {pendingCalls.map((call) => (
            <div
              key={call.id}
              className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 flex items-center justify-between animate-pulse-slow"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-red-500 text-white rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-extrabold">{call.tableNumber}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">
                    {call.tableLabel || `Table ${call.tableNumber}`}
                  </h3>
                  {call.message && (
                    <p className="text-red-700 mt-1">&quot;{call.message}&quot;</p>
                  )}
                  <p className="text-sm text-red-400 mt-1">{timeAgo(call.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateCallStatus(call.id, "ACKNOWLEDGED")}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-3 rounded-xl font-semibold transition"
                >
                  On My Way
                </button>
                <button
                  onClick={() => updateCallStatus(call.id, "RESOLVED")}
                  className="bg-green-500 hover:bg-green-600 text-white px-5 py-3 rounded-xl font-semibold transition"
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-12 text-center mb-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-green-900">All Clear</h2>
          <p className="text-green-600 mt-1">No pending waiter calls right now</p>
        </div>
      )}

      {/* Call History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Recent History</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {allCalls.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              No waiter calls yet
            </div>
          ) : (
            allCalls.map((call) => (
              <div key={call.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                    call.status === "PENDING" ? "bg-red-500" :
                    call.status === "ACKNOWLEDGED" ? "bg-yellow-500" : "bg-green-500"
                  }`}>
                    {call.table?.number || "?"}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {call.table?.label || `Table ${call.table?.number}`}
                    </p>
                    {call.message && (
                      <p className="text-sm text-gray-500">{call.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    call.status === "PENDING" ? "bg-red-100 text-red-700" :
                    call.status === "ACKNOWLEDGED" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {call.status}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(call.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
}
