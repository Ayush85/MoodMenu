"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function QRCodePage() {
  const params = useParams();
  const id = params.id as string;
  const [qr, setQr] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/restaurants/${id}/qr`)
      .then((res) => res.json())
      .then((data) => {
        setQr(data.qr);
        setSlug(data.slug);
        setLoading(false);
      });
  }, [id]);

  function downloadQR() {
    if (!qr) return;
    const link = document.createElement("a");
    link.download = `moodmenu-${slug}.png`;
    link.href = qr;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto text-center">
      <Link
        href={`/dashboard/restaurant/${id}/menu`}
        className="text-gray-500 hover:text-gray-700 text-sm mb-6 inline-block"
      >
        Back to Menu
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Your QR Code</h1>
      <p className="text-gray-500 mb-8">
        Print this and place it on your tables or counter
      </p>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 inline-block">
        {qr && (
          <img src={qr} alt="QR Code" className="w-64 h-64 mx-auto" />
        )}
        <p className="text-sm text-gray-500 mt-4 font-mono">
          /menu/{slug}
        </p>
      </div>

      <div className="mt-8 flex gap-4 justify-center">
        <button
          onClick={downloadQR}
          className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Download PNG
        </button>
        <Link
          href={`/menu/${slug}`}
          target="_blank"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          Preview Menu
        </Link>
      </div>
    </div>
  );
}
