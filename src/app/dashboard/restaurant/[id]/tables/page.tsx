"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
}

export default function TablesPage() {
  const params = useParams();
  const id = params.id as string;
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableCount, setTableCount] = useState("5");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [wifiSaved, setWifiSaved] = useState(false);

  function fetchData() {
    Promise.all([
      fetch(`/api/restaurants/${id}/tables`).then((r) => r.json()),
      fetch(`/api/restaurants/${id}`).then((r) => r.json()),
    ]).then(([tablesData, restData]) => {
      setTables(tablesData);
      setRestaurant(restData);
      setWifiSsid(restData.wifiSsid || "");
      setWifiPassword(restData.wifiPassword || "");
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchData();
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

  async function saveWifi() {
    await fetch(`/api/restaurants/${id}/wifi`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wifiSsid, wifiPassword }),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="text-2xl">🪑</span> Tables & WiFi
          </h1>
          <p className="page-subtitle mt-1">{restaurant?.name}</p>
        </div>
        <Link
          href={`/dashboard/restaurant/${id}/menu`}
          className="btn-soft !text-sm"
        >
          ← Back to Menu
        </Link>
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
            {tables.map((table) => (
              <div
                key={table.id}
                className="relative group bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 text-center border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
              >
                <p className="text-2xl font-extrabold text-gray-900">{table.number}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{table.label || "Table"}</p>
                <button
                  onClick={() => deleteTable(table.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-sm hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
