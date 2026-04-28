"use client";

import { useState } from "react";
import { MoodTheme } from "@/types";
import { formatPrice } from "@/lib/format";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface Props {
  items: CartItem[];
  slug: string;
  tableNumber: number;
  theme: MoodTheme;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onClear: () => void;
}

type OrderState = "idle" | "placing" | "success" | "error";

export default function CartDrawer({
  items,
  slug,
  tableNumber,
  theme,
  onClose,
  onUpdateQty,
  onClear,
}: Props) {
  const isDark = theme.mode === "dark";
  const [note, setNote] = useState("");
  const [orderState, setOrderState] = useState<OrderState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{
    id: string;
    total: number;
    items: { itemName: string; quantity: number; unitPrice: number }[];
  } | null>(null);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  async function placeOrder() {
    if (items.length === 0) return;
    setOrderState("placing");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/menu/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          note: note.trim() || undefined,
          items: items.map((i) => ({ itemId: i.id, quantity: i.quantity })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Could not place order. Please ask a waiter.");
        setOrderState("error");
        return;
      }

      setPlacedOrder(data);
      setOrderState("success");
      onClear();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setOrderState("error");
    }
  }

  function handleClose() {
    if (orderState === "success") {
      setOrderState("idle");
      setPlacedOrder(null);
      setNote("");
    }
    onClose();
  }

  const bg = isDark ? "#1a1a1f" : "#ffffff";
  const surfaceBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const mutedText = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl flex flex-col animate-slide-up"
        style={{ backgroundColor: bg, color: isDark ? "#fff" : "#000", maxHeight: "88vh" }}
      >
        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: borderColor }} />
        </div>

        {orderState === "success" && placedOrder ? (
          /* Success screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "#22c55e15" }}
            >
              <svg className="w-10 h-10" fill="none" stroke="#22c55e" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold mb-1">Order Placed!</h3>
            <p className="text-sm mb-4" style={{ color: mutedText }}>
              Your order is on its way. Sit tight!
            </p>
            <div
              className="w-full rounded-2xl p-4 mb-5 text-left space-y-1.5"
              style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
            >
              {placedOrder.items.map((line, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{line.quantity}x {line.itemName}</span>
                  <span style={{ color: theme.primary }}>{formatPrice(line.unitPrice * line.quantity)}</span>
                </div>
              ))}
              <div
                className="flex justify-between font-extrabold pt-2 mt-1"
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <span>Total</span>
                <span style={{ color: theme.primary }}>{formatPrice(placedOrder.total)}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl font-bold text-white text-sm"
              style={{ backgroundColor: theme.primary }}
            >
              Back to Menu
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="flex-shrink-0 flex items-center justify-between px-5 py-3"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              <div>
                <h2 className="text-base font-extrabold">Your Order</h2>
                <p className="text-xs" style={{ color: mutedText }}>Table {tableNumber}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: surfaceBg }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">🛒</p>
                  <p className="text-sm" style={{ color: mutedText }}>Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-2xl"
                    style={{ backgroundColor: surfaceBg, border: `1px solid ${borderColor}` }}
                  >
                    {/* Thumbnail */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-lg opacity-20"
                        style={{ backgroundColor: theme.primary + "20", color: theme.primary }}
                      >
                        {item.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: theme.primary }}>
                        {formatPrice(item.price)} each
                      </p>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base"
                        style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-extrabold text-sm">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQty(item.id, +1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base text-white"
                        style={{ backgroundColor: theme.primary }}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-[52px]">
                      <p className="text-sm font-extrabold" style={{ color: theme.primary }}>
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Note + checkout */}
            {items.length > 0 && (
              <div
                className="flex-shrink-0 px-5 pb-8 pt-3 space-y-3"
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note (allergies, preferences…)"
                  rows={2}
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-sm resize-none focus:outline-none"
                  style={{
                    backgroundColor: surfaceBg,
                    border: `1px solid ${borderColor}`,
                    color: "inherit",
                  }}
                />

                {orderState === "error" && (
                  <p className="text-xs text-red-500 text-center">{errorMsg}</p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: mutedText }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                    <p className="text-xl font-extrabold">{formatPrice(total)}</p>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={orderState === "placing"}
                    className="px-6 py-3 rounded-2xl font-extrabold text-sm text-white disabled:opacity-60 transition"
                    style={{ backgroundColor: theme.primary, boxShadow: `0 4px 16px ${theme.primary}40` }}
                  >
                    {orderState === "placing" ? "Placing…" : "Place Order"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
