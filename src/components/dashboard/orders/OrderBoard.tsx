"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import OrderComposer from "./OrderComposer";
import WaiterCallQueue from "./WaiterCallQueue";
import { getAllowedOrderStatuses, getNextSuggestedStatus } from "./permissions";
import type { ActorType, OrderStatus, OrderTicket, StaffRole } from "./types";

interface Props {
  restaurantId: string;
  actorType: ActorType | undefined;
  staffRole: StaffRole | undefined;
  canTakeOrders: boolean;
  canUseCalls: boolean;
}

const STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  NEW: { label: "New", badge: "bg-blue-100 text-blue-700" },
  PREPARING: { label: "Preparing", badge: "bg-amber-100 text-amber-700" },
  SERVED: { label: "Served", badge: "bg-emerald-100 text-emerald-700" },
  PAID: { label: "Paid", badge: "bg-violet-100 text-violet-700" },
  CANCELED: { label: "Canceled", badge: "bg-red-100 text-red-500" },
};

const ORDER_COLUMNS: Array<{ status: Exclude<OrderStatus, "CANCELED">; label: string; dot: string; header: string }> = [
  { status: "NEW", label: "New", dot: "bg-blue-400", header: "border-t-blue-400" },
  { status: "PREPARING", label: "Preparing", dot: "bg-amber-400", header: "border-t-amber-400" },
  { status: "SERVED", label: "Served", dot: "bg-emerald-400", header: "border-t-emerald-400" },
  { status: "PAID", label: "Paid", dot: "bg-violet-400", header: "border-t-violet-400" },
];

function playOrderChime() {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 660;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, context.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch {
    // Audio is optional and may be unavailable in a locked-down browser.
  }
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function fmt(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

export default function OrderBoard({ restaurantId, actorType, staffRole, canTakeOrders, canUseCalls }: Props) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [orderTableFilter, setOrderTableFilter] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [orderPollKey, setOrderPollKey] = useState(0);
  const [now, setNow] = useState(0);
  const [activeColumn, setActiveColumn] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const previousNewOrderIds = useRef<Set<string> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  const fetchOrders = useCallback(() => {
    fetch(`/api/restaurants/${restaurantId}/orders`)
      .then((response) => response.json())
      .then((data) => {
        const list: OrderTicket[] = Array.isArray(data) ? data : [];
        const currentNewIds = new Set(list.filter((order) => order.status === "NEW").map((order) => order.id));
        if (previousNewOrderIds.current) {
          const hasNewOrder = [...currentNewIds].some((id) => !previousNewOrderIds.current!.has(id));
          if (hasNewOrder) playOrderChime();
        }
        previousNewOrderIds.current = currentNewIds;
        setOrders(list);
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders, orderPollKey]);

  useEffect(() => {
    if (!showComposer && !confirmAction) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmAction) setConfirmAction(null);
      else setShowComposer(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmAction, showComposer]);

  useEffect(() => {
    const refreshClock = () => setNow(Date.now());
    refreshClock();
    const interval = setInterval(refreshClock, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const token = orderTableFilter.trim().toLowerCase();
    if (!token) return orders;
    return orders.filter((order) => {
      const tableName = (order.table.label || `table ${order.table.number}`).toLowerCase();
      return tableName.includes(token);
    });
  }, [orderTableFilter, orders]);

  const paidRevenue = useMemo(
    () => orders.filter((order) => order.status === "PAID").reduce((sum, order) => sum + order.total, 0),
    [orders],
  );
  const activeOrderQueue = useMemo(
    () => orders.filter((order) => order.status === "NEW" || order.status === "PREPARING").length,
    [orders],
  );
  const readyToCloseCount = useMemo(
    () => orders.filter((order) => order.status === "SERVED").length,
    [orders],
  );

  function handleScrollerScroll() {
    // Scroll fires on every frame during a swipe — committing state on each
    // one causes visible jank on mid-range phones. Coalesce to one state
    // update per animation frame instead.
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveColumn((current) => (current === index ? current : index));
    });
  }

  function scrollToColumn(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    setActiveColumn(index);
  }

  function canUpdateStatus(status: OrderStatus) {
    return getAllowedOrderStatuses(actorType, staffRole).includes(status);
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast((data as { error?: string }).error || "Could not update order", "error");
        return;
      }

      const updated = (await response.json()) as OrderTicket;
      setOrders((previous) => previous.map((order) => (order.id === updated.id ? updated : order)));
    } catch {
      toast("Could not update order", "error");
    }
  }

  function handleOrderStatusClick(order: OrderTicket, status: OrderStatus) {
    if (!canUpdateStatus(status)) return;
    if (status === "CANCELED") {
      setConfirmAction({
        title: "Cancel this order?",
        message: `${order.table.label || `Table ${order.table.number}`} · Rs. ${fmt(order.total)}. This can't be undone.`,
        confirmLabel: "Cancel Order",
        variant: "danger",
        onConfirm: () => {
          void updateOrderStatus(order.id, status);
          setConfirmAction(null);
        },
      });
      return;
    }
    void updateOrderStatus(order.id, status);
  }

  function renderOrderCard(order: OrderTicket) {
    const actionStatuses = getAllowedOrderStatuses(actorType, staffRole).filter((status) => status !== order.status);
    const suggestedStatus = getNextSuggestedStatus(actorType, staffRole, order.status);
    const isStale = (order.status === "NEW" || order.status === "PREPARING") &&
      now - new Date(order.createdAt).getTime() > 10 * 60 * 1000;

    return (
      <div key={order.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-gray-900">{order.table.label || `Table ${order.table.number}`}</p>
            <p className={`mt-0.5 text-xs ${isStale ? "font-semibold text-red-500" : "text-gray-400"}`}>
              {isStale && "⚠ "}{timeAgo(order.createdAt)}
            </p>
          </div>
          <span className="shrink-0 text-base font-extrabold text-gray-900">Rs. {fmt(order.total)}</span>
        </div>

        <div className="space-y-2 rounded-lg bg-gray-50 px-3 py-2.5">
          {order.items.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-sm text-gray-700">
              <span className="min-w-0 truncate font-medium">
                <span className="mr-1.5 inline-flex min-w-5 justify-center rounded-md bg-gray-200 px-1 text-xs font-bold text-gray-600">{line.quantity}</span>
                {line.itemName}
              </span>
              <span className="ml-2 shrink-0 font-medium text-gray-500">Rs. {fmt(line.lineTotal)}</span>
            </div>
          ))}
          {order.note && <p className="mt-1.5 border-t border-gray-200 pt-1.5 text-xs italic text-gray-500">&ldquo;{order.note}&rdquo;</p>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {suggestedStatus && canUpdateStatus(suggestedStatus) && (
            <button onClick={() => handleOrderStatusClick(order, suggestedStatus)} className="flex min-h-10 items-center gap-1 rounded-lg bg-orange-500 px-3.5 text-xs font-bold text-white transition hover:bg-orange-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {STATUS_META[suggestedStatus].label}
            </button>
          )}
          {actionStatuses.filter((status) => status !== suggestedStatus).map((status) => (
            <button key={status} onClick={() => handleOrderStatusClick(order, status)} className={`min-h-10 rounded-lg border px-3 text-xs font-medium transition ${status === "CANCELED" ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}>
              {STATUS_META[status].label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2.5 sm:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 sm:text-[11px]">Active Queue</p>
          <p className="mt-1 text-xl font-extrabold leading-none text-amber-900 sm:text-2xl">{activeOrderQueue}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2.5 sm:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-[11px]">Ready to Close</p>
          <p className="mt-1 text-xl font-extrabold leading-none text-emerald-900 sm:text-2xl">{readyToCloseCount}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-2.5 sm:px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 sm:text-[11px]">Paid Revenue</p>
          <p className="mt-1 truncate text-xl font-extrabold leading-none text-violet-900 sm:text-2xl">Rs. {fmt(paidRevenue)}</p>
        </div>
      </div>

      <section className="surface-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
        <input value={orderTableFilter} onChange={(event) => setOrderTableFilter(event.target.value)} placeholder="Filter by table name or number" className="control-input flex-1" />
        <div className="flex items-center justify-between gap-3 sm:contents">
          <span className="text-xs text-gray-500">{filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}</span>
          {canTakeOrders && <button onClick={() => setShowComposer(true)} className="btn-primary shrink-0 py-3 sm:w-auto">+ Create new order</button>}
        </div>
      </section>

      {/* Status tab strip — mobile only. The column scroller below shows one
          full-width lane per swipe with no partial neighbor peeking in, so
          without this strip there'd be no way to tell how many lanes exist
          or which one is currently in view. */}
      <div className="flex gap-1.5 overflow-x-auto xl:hidden">
        {ORDER_COLUMNS.map((column, index) => {
          const count = filteredOrders.filter((order) => order.status === column.status).length;
          const isActive = activeColumn === index;
          return (
            <button
              key={column.status}
              onClick={() => scrollToColumn(index)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                isActive ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : column.dot}`} />
              {column.label}
              <span className={isActive ? "text-white/70" : "text-gray-400"}>{count}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScrollerScroll}
        className="flex snap-x snap-mandatory overscroll-x-contain scroll-smooth overflow-x-auto xl:grid xl:grid-cols-4 xl:gap-4 xl:overflow-visible"
      >
        {ORDER_COLUMNS.map((column) => {
          const columnOrders = filteredOrders
            .filter((order) => order.status === column.status)
            .sort((a, b) => column.status === "PAID"
              ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          // No gap between columns on mobile: each column is exactly one
          // scroller-width wide, which is what makes `scrollLeft / clientWidth`
          // in handleScrollerScroll land on an exact integer index instead of
          // drifting further off with every column swiped past.
          return (
            <div key={column.status} className={`surface-card w-full shrink-0 snap-start overflow-hidden border-t-4 ${column.header} xl:w-auto`}>
              <div className="hidden items-center gap-2 border-b border-gray-100 px-3.5 py-3 xl:flex">
                <span className={`h-2 w-2 rounded-full ${column.dot}`} />
                <h2 className="text-sm font-bold text-gray-900">{column.label}</h2>
                <span className="ml-auto text-xs font-bold text-gray-400">{columnOrders.length}</span>
              </div>
              <div className="max-h-[70vh] space-y-2.5 overflow-y-auto p-2.5">
                {columnOrders.length === 0 ? <p className="py-8 text-center text-xs text-gray-400">Nothing here</p> : columnOrders.map(renderOrderCard)}
              </div>
            </div>
          );
        })}
      </div>

      <WaiterCallQueue restaurantId={restaurantId} canUseCalls={canUseCalls} />
      <OrderComposer
        restaurantId={restaurantId}
        canTakeOrders={canTakeOrders}
        open={showComposer}
        onClose={() => setShowComposer(false)}
        onCreated={(createdOrder) => {
          setOrders((previous) => [createdOrder, ...previous]);
          setOrderPollKey((value) => value + 1);
        }}
      />

      {confirmAction && (
        <ConfirmModal
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel={confirmAction.confirmLabel}
          variant={confirmAction.variant}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
