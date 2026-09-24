"use client";

import { Check, Clock3, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { MoodTheme } from "@/types";
import { useState } from "react";

export interface CartLine {
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
}

export interface CustomerOrder {
  id: string;
  status: "NEW" | "PREPARING" | "SERVED" | "PAID" | "CANCELED";
  note: string | null;
  total: number;
  createdAt: string;
  updatedAt?: string;
  items: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

interface Props {
  open: boolean;
  theme: MoodTheme;
  cart: CartLine[];
  activeOrders: CustomerOrder[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
  onSetQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onDismissOrder: (orderId: string) => void;
}

const STATUS_STEPS = [
  { key: "NEW", label: "Order received", description: "Your order is with the restaurant." },
  { key: "PREPARING", label: "Preparing", description: "The kitchen is preparing your food." },
  { key: "SERVED", label: "Ready to enjoy", description: "Your order is ready to be served." },
] as const;

const STATUS_LABEL: Record<CustomerOrder["status"], string> = {
  NEW: "Order received",
  PREPARING: "Preparing",
  SERVED: "Ready to enjoy",
  PAID: "Completed",
  CANCELED: "Canceled",
};

function OrderStatusCard({ order, theme, onDismiss }: { order: CustomerOrder; theme: MoodTheme; onDismiss: () => void }) {
  const isDark = theme.mode === "dark";
  const canceled = order.status === "CANCELED";
  const isTerminal = order.status === "PAID" || order.status === "CANCELED";
  const currentIndex = STATUS_STEPS.findIndex((step) => step.key === order.status);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: `${theme.primary}0c`, border: `1px solid ${theme.primary}20` }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: theme.primary, color: "#fff" }}>
          {canceled ? <X className="h-5 w-5" /> : order.status === "SERVED" || order.status === "PAID" ? <Check className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-55">Order #{order.id.slice(-5).toUpperCase()}</p>
              <h3 className="mt-1 text-base font-extrabold">{STATUS_LABEL[order.status]}</h3>
            </div>
            {isTerminal && (
              <button type="button" onClick={onDismiss} aria-label="Dismiss order" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg opacity-50 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-65">
            {canceled ? "Please speak with a member of the team if you need help." : order.status === "PAID" ? "Thank you for dining with us." : STATUS_STEPS[Math.max(currentIndex, 0)]?.description}
          </p>
        </div>
      </div>

      {!canceled && !isTerminal && (
        <div className="mt-4 space-y-3">
          {STATUS_STEPS.map((step, index) => {
            const complete = currentIndex >= index;
            const current = order.status === step.key;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex w-5 shrink-0 flex-col items-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: complete ? theme.primary : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"), color: complete ? "#fff" : theme.text }}>
                    {complete ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full opacity-40" />}
                  </span>
                  {index < STATUS_STEPS.length - 1 && <span className="mt-1 h-4 w-px" style={{ backgroundColor: currentIndex > index ? theme.primary : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"), opacity: currentIndex > index ? 0.7 : 1 }} />}
                </div>
                <p className={`-mt-0.5 text-sm font-bold ${current ? "" : "opacity-70"}`}>{step.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs opacity-70" style={{ borderColor: `${theme.text}12` }}>
        <span>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
        <span className="text-sm font-extrabold opacity-100" style={{ color: theme.primary }}>{formatPrice(order.total)}</span>
      </div>
    </div>
  );
}

export default function OrderPanel({ open, theme, cart, activeOrders, isSubmitting, error, onClose, onSubmit, onSetQuantity, onRemove, onDismissOrder }: Props) {
  const isDark = theme.mode === "dark";
  const [note, setNote] = useState("");
  if (!open) return null;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const inProgressOrders = activeOrders.filter((order) => !["PAID", "CANCELED"].includes(order.status));
  const showingCart = cart.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:px-4">
      <button type="button" aria-label="Close order panel" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="order-panel-title" className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl" style={{ backgroundColor: isDark ? "#1a1a1f" : "#fff", color: theme.text }}>
        <header className="flex shrink-0 items-center justify-between border-b px-5 py-4" style={{ borderColor: `${theme.text}12` }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: theme.primary }}>{showingCart ? "Your order" : "Orders"}</p>
            <h2 id="order-panel-title" className="mt-0.5 text-xl font-extrabold">{showingCart ? "Build your order" : "Track your orders"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${theme.text}0c` }} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-6">
          {/* A second order can be placed while an earlier one is still being
              prepared. Surfacing it here — rather than hiding it while the
              cart is non-empty — is what keeps that earlier order from
              silently disappearing from the customer's view. */}
          {showingCart && inProgressOrders.length > 0 && (
            <div className="mb-4 rounded-xl px-3.5 py-3 text-xs" style={{ backgroundColor: `${theme.primary}0c`, color: theme.text }}>
              <p className="font-bold opacity-80">
                {inProgressOrders.length === 1 ? "1 order already in progress" : `${inProgressOrders.length} orders already in progress`}
              </p>
              <p className="mt-0.5 opacity-60">Placing this one won&apos;t affect it — you can track both.</p>
            </div>
          )}

          {showingCart ? (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.itemId} className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: `${theme.text}06` }}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.itemName}</p>
                      <p className="mt-0.5 text-xs opacity-55">{formatPrice(item.price)} each</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl p-1" style={{ backgroundColor: `${theme.text}0b` }}>
                      <button type="button" onClick={() => onSetQuantity(item.itemId, item.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg" aria-label={`Decrease ${item.itemName}`}><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <button type="button" onClick={() => onSetQuantity(item.itemId, item.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ backgroundColor: theme.primary }} aria-label={`Increase ${item.itemName}`}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <p className="w-20 text-right text-sm font-extrabold">{formatPrice(item.price * item.quantity)}</p>
                    <button type="button" onClick={() => onRemove(item.itemId)} className="flex h-7 w-7 items-center justify-center rounded-lg opacity-45 hover:opacity-100" aria-label={`Remove ${item.itemName}`}><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <label htmlFor="order-note" className="text-xs font-bold uppercase tracking-wider opacity-55">Kitchen note <span className="font-normal normal-case tracking-normal">(optional)</span></label>
                <textarea id="order-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={240} placeholder="Allergies, preferences, or special requests" className="mt-2 min-h-20 w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none" style={{ borderColor: `${theme.text}18`, color: theme.text }} />
              </div>

              {error && <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-500">{error}</p>}

              <div className="mt-5 flex items-end justify-between border-t pt-4" style={{ borderColor: `${theme.text}15` }}>
                <div><p className="text-xs opacity-55">{count} item{count !== 1 ? "s" : ""}</p><p className="mt-0.5 text-xl font-extrabold">Total</p></div>
                <p className="text-2xl font-extrabold" style={{ color: theme.primary }}>{formatPrice(total)}</p>
              </div>
              <button type="button" disabled={isSubmitting} onClick={() => onSubmit(note)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: theme.primary, boxShadow: `0 8px 20px ${theme.primary}30` }}>
                <ShoppingBag className="h-4 w-4" />
                {isSubmitting ? "Sending to kitchen…" : `Place order · ${formatPrice(total)}`}
              </button>
              <p className="mt-2 text-center text-[11px] opacity-45">You can track the kitchen status here after placing your order.</p>
            </>
          ) : activeOrders.length > 0 ? (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <OrderStatusCard key={order.id} order={order} theme={theme} onDismiss={() => onDismissOrder(order.id)} />
              ))}
              <p className="pt-1 text-center text-[11px] opacity-45">Add more items from the menu to place another order.</p>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${theme.primary}14`, color: theme.primary }}><ShoppingBag className="h-6 w-6" /></div>
              <h3 className="mt-4 text-base font-extrabold">Your order is empty</h3>
              <p className="mt-1 text-sm opacity-55">Add something delicious from the menu to get started.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
