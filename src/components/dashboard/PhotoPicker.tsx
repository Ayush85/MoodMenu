"use client";

import { useState } from "react";
import { Search, X, ImageIcon } from "lucide-react";

interface PhotoOption {
  url: string;
  alt: string;
}

interface Props {
  restaurantId: string;
  name: string;
  description: string;
  onSelect: (url: string) => void;
  triggerLabel?: string;
}

export default function PhotoPicker({ restaurantId, name, description, onSelect, triggerLabel = "Find Photo" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PhotoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(body: { name?: string; description?: string; query?: string }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/search-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (typeof data.suggestedQuery === "string") setQuery(data.suggestedQuery);
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  function openPicker() {
    if (!name.trim()) return;
    setOpen(true);
    setResults([]);
    setSearched(false);
    runSearch({ name, description });
  }

  function pick(url: string) {
    onSelect(url);
    setOpen(false);
  }

  return (
    <>
      <button type="button" onClick={openPicker} disabled={!name.trim()}
        className="flex items-center gap-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 whitespace-nowrap"
      >
        <ImageIcon className="w-4 h-4" />
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900">Find a photo</h4>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch({ query })}
                placeholder="Search term..."
                className="control-input flex-1 !text-sm"
              />
              <button type="button" onClick={() => runSearch({ query })} disabled={loading || !query.trim()}
                className="px-3 rounded-lg bg-purple-600 text-white disabled:opacity-50 shrink-0"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">Searching…</div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {results.map((r, i) => (
                  <button key={i} type="button" onClick={() => pick(r.url)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-purple-400 transition"
                    title={r.alt}
                  >
                    <img src={r.url} alt={r.alt} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : searched ? (
              <p className="text-sm text-gray-400 text-center py-10">No results — try a different search term</p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
