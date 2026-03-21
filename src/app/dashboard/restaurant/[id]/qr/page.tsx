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

      // General menu QR
      const gQr = await QRCode.toDataURL(`${baseUrl}/menu/${restData.slug}`, {
        width: 400, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" },
      });
      setGeneralMenuQR(gQr);

      // WiFi QR
      if (restData.wifiSsid) {
        const wQr = await QRCode.toDataURL(
          `WIFI:T:WPA;S:${restData.wifiSsid};P:${restData.wifiPassword || ""};;`,
          { width: 400, margin: 2, color: { dark: "#1F2937", light: "#FFFFFF" } }
        );
        setWifiQR(wQr);
      }

      // Per-table menu QRs
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // ========== PRINT VIEW ==========
  if (printMode) {
    return (
      <div>
        <div className="print:hidden flex items-center justify-between mb-6 px-4 pt-4">
          <button onClick={() => setPrintMode(false)} className="text-gray-500 hover:text-gray-700 text-sm">
            &larr; Back
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
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
              {/* Restaurant name */}
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">{restaurant?.name}</h2>
              <div className="bg-gray-900 text-white text-sm font-bold px-4 py-1 rounded-full mb-4">
                Table {table.number}
              </div>

              <div className="flex gap-6 items-start">
                {/* Step 1: WiFi */}
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

                {/* Step 2: Menu */}
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">QR Codes</h1>
          <p className="text-gray-500 mt-1">Print table tent cards for your restaurant</p>
        </div>
        <Link href={`/dashboard/restaurant/${id}/menu`} className="text-gray-500 hover:text-gray-700 text-sm">
          Back to Menu
        </Link>
      </div>

      {/* Customer Flow Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="font-bold text-blue-900 mb-3">How it works for customers</h3>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {restaurant?.wifiSsid && (
            <div className="flex items-start gap-3">
              <span className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
              <div>
                <p className="font-semibold text-blue-900 text-sm">Scan WiFi QR</p>
                <p className="text-xs text-blue-600">Phone auto-connects to {restaurant.wifiSsid}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3">
            <span className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
              {restaurant?.wifiSsid ? "2" : "1"}
            </span>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Scan Menu QR</p>
              <p className="text-xs text-blue-600">Opens menu with table number</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
              {restaurant?.wifiSsid ? "3" : "2"}
            </span>
            <div>
              <p className="font-semibold text-blue-900 text-sm">Browse & Call Waiter</p>
              <p className="text-xs text-blue-600">Tap button to call staff</p>
            </div>
          </div>
        </div>
      </div>

      {/* WiFi QR */}
      {wifiQR && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
          <img src={wifiQR} alt="WiFi QR" className="w-32 h-32" />
          <div>
            <h3 className="font-bold text-gray-900 text-lg">WiFi QR Code</h3>
            <p className="text-sm text-gray-500 mt-1">Customers scan this to auto-connect to your WiFi</p>
            <div className="mt-3 text-sm">
              <span className="text-gray-400">SSID:</span>{" "}
              <span className="font-mono font-bold text-gray-700">{restaurant?.wifiSsid}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Password:</span>{" "}
              <span className="font-mono font-bold text-gray-700">{restaurant?.wifiPassword}</span>
            </div>
          </div>
        </div>
      )}

      {!restaurant?.wifiSsid && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
          <p className="text-yellow-800 font-semibold mb-1">WiFi not configured</p>
          <p className="text-yellow-600 text-sm">
            Set up WiFi in{" "}
            <Link href={`/dashboard/restaurant/${id}/tables`} className="underline font-medium">
              Tables & WiFi
            </Link>{" "}
            to include a WiFi QR on table cards.
          </p>
        </div>
      )}

      {/* General Menu QR */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
        <img src={generalMenuQR} alt="Menu QR" className="w-32 h-32" />
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
            <h2 className="text-lg font-bold text-gray-900">Table Cards ({tables.length})</h2>
            <button
              onClick={() => setPrintMode(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition w-full sm:w-auto"
            >
              Print All Table Cards
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <p className="text-yellow-800 font-semibold mb-2">No tables configured</p>
          <p className="text-yellow-600 text-sm mb-4">Add tables to generate per-table QR cards.</p>
          <Link
            href={`/dashboard/restaurant/${id}/tables`}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition inline-block"
          >
            Add Tables
          </Link>
        </div>
      )}
    </div>
  );
}
