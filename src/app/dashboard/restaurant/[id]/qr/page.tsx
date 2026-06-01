"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

interface Table {
  id: string;
  number: number;
  label: string | null;
}

interface RestaurantData {
  slug: string;
  name: string;
  wifiSsid: string | null;
  wifiPassword: string | null;
}

export default function QRCodePage() {
  const params = useParams();
  const id = params.id as string;
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuQRs, setMenuQRs] = useState<Record<number, string>>({});
  const [wifiQR, setWifiQR] = useState("");
  const [generalMenuQR, setGeneralMenuQR] = useState("");
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/restaurants/${id}`).then((r) => r.json()),
      fetch(`/api/restaurants/${id}/tables`).then((r) => r.json()),
    ]).then(async ([restData, tablesData]) => {
      setRestaurant(restData);
      setTables(tablesData);

      const baseUrl = window.location.origin;

      const gQr = await QRCode.toDataURL(`${baseUrl}/menu/${restData.slug}`, {
        width: 400, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" },
      });
      setGeneralMenuQR(gQr);

      if (restData.wifiSsid) {
        const wQr = await QRCode.toDataURL(
          `WIFI:T:WPA;S:${restData.wifiSsid};P:${restData.wifiPassword || ""};;`,
          { width: 400, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" } }
        );
        setWifiQR(wQr);
      }

      const codes: Record<number, string> = {};
      for (const table of tablesData) {
        codes[table.number] = await QRCode.toDataURL(
          `${baseUrl}/menu/${restData.slug}?table=${table.number}`,
          { width: 300, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" } }
        );
      }
      setMenuQRs(codes);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="h-8 w-36 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="surface-card h-40 animate-pulse mb-4" />
        <div className="surface-card h-40 animate-pulse" />
      </div>
    );
  }

  // ========== PRINT VIEW ==========
  if (printMode) {
    return (
      <div>
        <div className="print:hidden flex items-center justify-between mb-6 px-4 pt-4">
          <button onClick={() => setPrintMode(false)} className="btn-soft text-sm!">
            ← Back
          </button>
          <button
            onClick={() => window.print()}
            className="btn-primary text-sm!"
          >
            Print All Cards
          </button>
        </div>

        <div className="grid grid-cols-2 gap-0 print:gap-0">
          {tables.map((table) => (
            <div
              key={table.id}
              className="border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center print:break-inside-avoid"
              style={{ minHeight: "380px" }}
            >
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">{restaurant?.name}</h2>
              <div className="bg-gray-900 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                Table {table.number}
              </div>

              <div className="flex gap-6 items-start">
                {wifiQR && (
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Step 1: Connect WiFi
                    </p>
                    <img src={wifiQR} alt="WiFi QR" className="w-28 h-28 mx-auto" />
                    <p className="text-[9px] text-gray-400 mt-1 font-mono">
                      {restaurant?.wifiSsid}
                    </p>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    {wifiQR ? "Step 2: Open Menu" : "Scan to Open Menu"}
                  </p>
                  {menuQRs[table.number] && (
                    <img src={menuQRs[table.number]} alt="Menu QR" className="w-28 h-28 mx-auto" />
                  )}
                  <p className="text-[9px] text-gray-400 mt-1">
                    Call waiter from your phone
                  </p>
                </div>
              </div>

              <p className="text-[8px] text-gray-300 mt-4">Powered by MoodMenu</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== NORMAL VIEW ==========
  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">QR Codes</h1>
        <p className="page-subtitle mt-1">Print table tent cards for your restaurant</p>
      </div>

      {/* Customer Flow Explainer */}
      <div className="surface-card p-5 sm:p-6 mb-6 bg-orange-50 border border-orange-100">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How it works for customers
        </h3>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          {restaurant?.wifiSsid && (
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Scan WiFi QR</p>
                <p className="text-xs text-gray-500">Auto-connects to {restaurant.wifiSsid}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {restaurant?.wifiSsid ? "2" : "1"}
            </span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Scan Menu QR</p>
              <p className="text-xs text-gray-500">Opens menu with table number</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {restaurant?.wifiSsid ? "3" : "2"}
            </span>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Browse & Call Waiter</p>
              <p className="text-xs text-gray-500">Tap button to call staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* WiFi QR */}
      {wifiQR && (
        <div className="surface-card p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm shrink-0">
            <img src={wifiQR} alt="WiFi QR" className="w-28 h-28" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">WiFi QR Code</h3>
            <p className="text-sm text-gray-500 mt-1">Customers scan this to auto-connect to your WiFi</p>
            <div className="mt-3 space-y-1">
              <p className="text-sm"><span className="text-gray-400">SSID:</span> <span className="font-mono font-bold text-gray-700">{restaurant?.wifiSsid}</span></p>
              <p className="text-sm"><span className="text-gray-400">Password:</span> <span className="font-mono font-bold text-gray-700">{restaurant?.wifiPassword}</span></p>
            </div>
          </div>
        </div>
      )}

      {!restaurant?.wifiSsid && (
        <div className="surface-card p-5 mb-6 bg-amber-50 border border-amber-200">
          <p className="text-gray-800 font-semibold mb-1">WiFi not configured</p>
          <p className="text-sm text-gray-500">
            Set up WiFi in{" "}
            <Link href={`/dashboard/restaurant/${id}/tables`} className="text-orange-500 hover:underline font-medium">
              Tables & WiFi
            </Link>{" "}
            to include a WiFi QR on table cards.
          </p>
        </div>
      )}

      {/* General Menu QR */}
      <div className="surface-card p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm shrink-0">
          <img src={generalMenuQR} alt="Menu QR" className="w-28 h-28" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">General Menu QR</h3>
          <p className="text-sm text-gray-500 mt-1">Opens menu without a table number (no waiter call)</p>
          <p className="text-xs font-mono text-gray-400 mt-2">/menu/{restaurant?.slug}</p>
        </div>
      </div>

      {/* Per-Table QR Cards */}
      {tables.length > 0 ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Table Cards
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{tables.length}</span>
            </h2>
            <button
              onClick={() => setPrintMode(true)}
              className="btn-primary text-sm! w-full sm:w-auto"
            >
              Print All Table Cards
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="surface-card p-5">
                <div className="text-center mb-3">
                  <span className="bg-gray-900 text-white text-sm font-bold px-3 py-1 rounded-full">
                    Table {table.number}
                  </span>
                </div>

                <div className="flex gap-3 justify-center">
                  {wifiQR && (
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">WiFi</p>
                      <img src={wifiQR} alt="WiFi" className="w-20 h-20" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Menu</p>
                    {menuQRs[table.number] && (
                      <img src={menuQRs[table.number]} alt="Menu" className="w-20 h-20" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="surface-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🪑</span>
          </div>
          <p className="text-gray-800 font-semibold mb-2">No tables configured</p>
          <p className="text-gray-500 text-sm mb-4">Add tables to generate per-table QR cards.</p>
          <Link
            href={`/dashboard/restaurant/${id}/tables`}
            className="btn-primary text-sm!"
          >
            Add Tables
          </Link>
        </div>
      )}
    </div>
  );
}
