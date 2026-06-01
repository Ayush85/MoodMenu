"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Table {
  id: string;
  number: number;
  label: string | null;
}

interface Restaurant {
  id: string;
  name: string;
  wifiSsid: string | null;
  wifiPassword: string | null;
  allowedIp: string | null;
}

export default function TablesPage() {
  const params = useParams();
  const id = params.id as string;
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableCount, setTableCount] = useState("5");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [allowedIp, setAllowedIp] = useState("");
  const [detectedIp, setDetectedIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [wifiSaved, setWifiSaved] = useState(false);
  const [resettingTable, setResettingTable] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<Record<string, boolean>>({});

  function fetchData() {
    Promise.all([
      fetch(`/api/restaurants/${id}/tables`).then((r) => r.json()),
      fetch(`/api/restaurants/${id}`).then((r) => r.json()),
      fetch("/api/my-ip").then((r) => r.json()).catch(() => ({ ip: "" })),
    ]).then(([tablesData, restData, ipData]) => {
      setTables(tablesData);
      setRestaurant(restData);
      setWifiSsid(restData.wifiSsid || "");
      setWifiPassword(restData.wifiPassword || "");
      setAllowedIp(restData.allowedIp || "");
      setDetectedIp(ipData.ip || "");
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchData();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function addTables() {
    await fetch(`/api/restaurants/${id}/tables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: parseInt(tableCount) }),
    });
    fetchData();
  }

  async function deleteTable(tableId: string) {
    await fetch(`/api/restaurants/${id}/tables`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    fetchData();
  }

  async function fetchSessions() {
    try {
      const res = await fetch(`/api/restaurants/${id}/sessions?status=ACTIVE`);
      if (!res.ok) return;
      const sessions: { tableId: string }[] = await res.json();
      const map: Record<string, boolean> = {};
      sessions.forEach((s) => { map[s.tableId] = true; });
      setActiveSessions(map);
    } catch { /* silent */ }
  }

  async function resetSession(tableId: string) {
    setResettingTable(tableId);
    try {
      // Find and close the active session for this table via the sessions API
      const res = await fetch(`/api/restaurants/${id}/sessions?status=ACTIVE`);
      if (res.ok) {
        const sessions: { id: string; tableId: string }[] = await res.json();
        const session = sessions.find((s) => s.tableId === tableId);
        if (session) {
          await fetch(`/api/restaurants/${id}/sessions/${session.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "close" }),
          });
        }
      }
      await fetchSessions();
    } finally {
      setResettingTable(null);
    }
  }

  async function saveWifi() {
    await fetch(`/api/restaurants/${id}/wifi`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wifiSsid, wifiPassword, allowedIp: allowedIp || null }),
    });
    setWifiSaved(true);
    setTimeout(() => setWifiSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="page-shell max-w-5xl">
        <div className="h-8 w-44 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="surface-card h-40 animate-pulse mb-6" />
        <div className="surface-card h-40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="page-shell max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Tables & WiFi</h1>
        <p className="page-subtitle mt-1">{restaurant?.name}</p>
      </div>

      {/* WiFi Configuration */}
      <div className="surface-card p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <span className="text-lg">📶</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">WiFi Settings</h2>
            <p className="text-xs text-gray-500">
              Customers see a &quot;Connect to WiFi&quot; button when they scan the QR code
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WiFi Name (SSID)</label>
            <input
              type="text"
              value={wifiSsid}
              onChange={(e) => setWifiSsid(e.target.value)}
              placeholder="RestaurantWiFi"
              className="control-input !py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WiFi Password</label>
            <input
              type="text"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="password123"
              className="control-input !py-3"
            />
          </div>
        </div>
        <button
          onClick={saveWifi}
          className={`btn-primary !text-sm ${wifiSaved ? "!bg-emerald-500" : ""}`}
        >
          {wifiSaved ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          ) : (
            "Save WiFi Settings"
          )}
        </button>
      </div>

      {/* WiFi IP Restriction */}
      <div className="surface-card p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <span className="text-lg">🔒</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Waiter Call Protection</h2>
            <p className="text-xs text-gray-500">
              Only allow waiter calls from customers on your restaurant WiFi
            </p>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Restaurant Public IP</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={allowedIp}
              onChange={(e) => setAllowedIp(e.target.value)}
              placeholder="e.g. 103.25.xx.xx"
              className="control-input flex-1 !py-3"
            />
            {detectedIp && (
              <button
                type="button"
                onClick={() => setAllowedIp(detectedIp)}
                className="btn-soft !text-xs whitespace-nowrap"
              >
                Use My IP: {detectedIp}
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            {allowedIp
              ? `Only customers connecting from IP ${allowedIp} can call a waiter. Leave empty to allow from anywhere.`
              : "No restriction set. Anyone with the menu link can call a waiter. Set the restaurant WiFi public IP to restrict."}
          </p>
        </div>
        <button
          onClick={saveWifi}
          className={`btn-primary !text-sm ${wifiSaved ? "!bg-emerald-500" : ""}`}
        >
          {wifiSaved ? "Saved!" : "Save IP Setting"}
        </button>
      </div>

      {/* Add Tables */}
      <div className="surface-card p-5 sm:p-6 mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Add Tables</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
            min="1"
            max="100"
            className="control-input w-full sm:w-24 !py-3 text-center"
          />
          <button
            onClick={addTables}
            className="btn-primary w-full sm:w-auto !text-sm"
          >
            Add {tableCount} Table{parseInt(tableCount) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            Tables
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tables.length}</span>
          </h2>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No tables yet. Add some above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {tables.map((table) => {
              const hasSession = !!activeSessions[table.id];
              return (
                <div
                  key={table.id}
                  className={`relative group rounded-xl p-3 text-center border transition-all duration-200 ${
                    hasSession
                      ? "bg-orange-50 border-orange-300 shadow-sm"
                      : "bg-gray-50 border-gray-200 hover:border-orange-300 hover:shadow-md"
                  }`}
                >
                  {/* Active session dot */}
                  {hasSession && (
                    <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  )}

                  <p className="text-xl font-extrabold text-gray-900">{table.number}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{table.label || "Table"}</p>

                  {/* Reset session button — only shown when session is active */}
                  {hasSession && (
                    <button
                      onClick={() => resetSession(table.id)}
                      disabled={resettingTable === table.id}
                      title="Reset session (mark bill paid)"
                      className="mt-1.5 w-full text-[9px] font-bold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg py-0.5 transition disabled:opacity-50"
                    >
                      {resettingTable === table.id ? "…" : "Reset"}
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
