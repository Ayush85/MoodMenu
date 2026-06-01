"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";

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

interface RestaurantTableData {
  id: string;
  number: number;
  label: string | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
}

interface OrderLine {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderTicket {
  id: string;
  status: "NEW" | "PREPARING" | "SERVED" | "PAID" | "CANCELED";
  note: string | null;
  total: number;
  createdAt: string;
  table: { number: number; label: string | null };
  items: OrderLine[];
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "WAITER" | "COOK" | "CHEF";
  isActive: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const params = useParams();
  const { data: session } = useSession();
  const { toast } = useToast();
  const id = params.id as string;
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([]);
  const [allCalls, setAllCalls] = useState<RawWaiterCall[]>([]);
  const [tables, setTables] = useState<RestaurantTableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"ALL" | OrderTicket["status"]>("ALL");
  const [orderTableFilter, setOrderTableFilter] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffMember["role"]>("WAITER");
  const [addingStaff, setAddingStaff] = useState(false);
  const actorType = session?.user?.actorType;
  const staffRole = session?.user?.role as "WAITER" | "COOK" | "CHEF" | undefined;
  const canManageStaff = actorType === "USER";
  const canUseCalls = actorType === "USER" || staffRole === "WAITER";
  const canTakeOrders = actorType === "USER" || staffRole === "WAITER";
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [visibleOrders, setVisibleOrders] = useState(6);
  const [visibleCalls, setVisibleCalls] = useState(6);
  const [simpleView, setSimpleView] = useState(true);
  const [orderPollKey, setOrderPollKey] = useState(0);

  // Sessions
  interface TableSessionData {
    id: string;
    status: string;
    totalAmount: number;
    startedAt: string;
    table: { number: number; label: string | null };
    orders: { id: string; status: string; total: number; items: { itemName: string; quantity: number }[] }[];
  }
  const [activeSessions, setActiveSessions] = useState<TableSessionData[]>([]);
  const [closingSession, setClosingSession] = useState<string | null>(null);

  async function fetchSessions() {
    try {
      const res = await fetch(`/api/restaurants/${id}/sessions?status=ACTIVE`);
      if (res.ok) setActiveSessions(await res.json());
    } catch { /* silent */ }
  }

  async function closeSession(sessionId: string) {
    setClosingSession(sessionId);
    try {
      await fetch(`/api/restaurants/${id}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      await fetchSessions();
    } finally {
      setClosingSession(null);
    }
  }

  useEffect(() => {
    if (!canUseCalls && activeTab === "calls") {
      setActiveTab("orders");
    }
  }, [canUseCalls, activeTab]);

  // Poll for pending waiter calls every 4 seconds (works on Vercel + Docker)
  useEffect(() => {
    if (!canUseCalls) return;

    let prevCount = 0;

    async function pollCalls() {
      try {
        const res = await fetch(`/api/restaurants/${id}/waiter-calls`);
        if (!res.ok) return;
        const calls: RawWaiterCall[] = await res.json();
        const active = calls
          .filter((c) => c.status === "PENDING" || c.status === "ACKNOWLEDGED")
          .map((c) => ({
            id: c.id,
            tableNumber: c.table.number,
            tableLabel: c.table.label,
            message: c.message,
            status: c.status,
            createdAt: c.createdAt,
          }));

        const pendingOnly = active.filter((c) => c.status === "PENDING");
        if (pendingOnly.length > prevCount && prevCount >= 0) {
          playNotificationSound();
          if (pendingOnly[0]) showBrowserNotification(pendingOnly[0]);
        }
        prevCount = pendingOnly.length;
        setPendingCalls(active);
      } catch {
        // Silently retry on next interval
      }
    }

    pollCalls();
    const interval = setInterval(pollCalls, 4000);
    return () => clearInterval(interval);
  }, [id, canUseCalls]);

  // Load all calls history
  useEffect(() => {
    if (!canUseCalls) {
      setAllCalls([]);
      return;
    }

    fetch(`/api/restaurants/${id}/waiter-calls`)
      .then((r) => r.json())
      .then((data) => setAllCalls(Array.isArray(data) ? data : []))
      .catch(() => setAllCalls([]));
  }, [id, pendingCalls, canUseCalls]);

  // Load tables and menu items for order pad
  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const tableData = (data?.tables || []) as RestaurantTableData[];
        const itemData = ((data?.categories || []) as Array<{ items: MenuItemOption[] }>)
          .flatMap((c) => c.items || [])
          .map((item) => ({ id: item.id, name: item.name, price: item.price }));

        setTables(tableData.sort((a, b) => a.number - b.number));
        setMenuItems(itemData);
      })
      .catch(() => {
        setTables([]);
        setMenuItems([]);
      });
  }, [id]);

  // Poll orders + sessions every 8 seconds
  useEffect(() => {
    function fetchOrders() {
      fetch(`/api/restaurants/${id}/orders`)
        .then((r) => r.json())
        .then((data) => setOrders(Array.isArray(data) ? data : []))
        .catch(() => {});
    }

    fetchSessions();
    fetchOrders();
    const interval = setInterval(() => { fetchOrders(); fetchSessions(); }, 8000);
    return () => clearInterval(interval);
  }, [id, orderPollKey]);

  useEffect(() => {
    if (!canManageStaff) {
      setStaff([]);
      return;
    }

    fetch(`/api/restaurants/${id}/staff-members`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]));
  }, [id, canManageStaff]);

  function showBrowserNotification(call?: WaiterCall) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted" && call) {
      const title = `Waiter Call: Table ${call.tableNumber}`;
      const body = call.message || "Customer requested assistance";
      new Notification(title, { body });
    }
  }

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

  function incrementItem(itemId: string) {
    setSelectedItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  function decrementItem(itemId: string) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      next[itemId] = Math.max((next[itemId] || 0) - 1, 0);
      if (next[itemId] === 0) delete next[itemId];
      return next;
    });
  }

  const orderDraft = useMemo(() => {
    return menuItems
      .filter((item) => (selectedItems[item.id] || 0) > 0)
      .map((item) => {
        const quantity = selectedItems[item.id];
        return {
          itemId: item.id,
          itemName: item.name,
          quantity,
          unitPrice: item.price,
          lineTotal: quantity * item.price,
        };
      });
  }, [menuItems, selectedItems]);

  const orderTotal = orderDraft.reduce((sum, row) => sum + row.lineTotal, 0);

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const filteredMenuItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) return menuItems;
    return menuItems.filter((item) => item.name.toLowerCase().includes(search));
  }, [menuItems, itemSearch]);

  const orderCounts = useMemo(() => {
    return {
      NEW: orders.filter((o) => o.status === "NEW").length,
      PREPARING: orders.filter((o) => o.status === "PREPARING").length,
      SERVED: orders.filter((o) => o.status === "SERVED").length,
      PAID: orders.filter((o) => o.status === "PAID").length,
      CANCELED: orders.filter((o) => o.status === "CANCELED").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderStatusFilter !== "ALL" && order.status !== orderStatusFilter) return false;
      if (orderTableFilter.trim()) {
        const token = orderTableFilter.trim().toLowerCase();
        const tableName = (order.table.label || `table ${order.table.number}`).toLowerCase();
        if (!tableName.includes(token)) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderTableFilter]);

  const visibleFilteredOrders = filteredOrders.slice(0, visibleOrders);
  const visibleAllCalls = allCalls.slice(0, visibleCalls);

  const paidRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID")
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  const activeOrderQueue = useMemo(() => {
    return orders.filter((o) => o.status === "NEW" || o.status === "PREPARING").length;
  }, [orders]);

  const readyToCloseCount = useMemo(() => {
    return orders.filter((o) => o.status === "SERVED").length;
  }, [orders]);

  useEffect(() => {
    setVisibleOrders(6);
  }, [orderStatusFilter, orderTableFilter, orders]);

  useEffect(() => {
    setVisibleCalls(6);
  }, [allCalls]);

  async function submitOrder() {
    if (!selectedTableId) { toast("Please select a table", "error"); return; }
    if (orderDraft.length === 0) { toast("Add at least one item", "error"); return; }
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          note: orderNote,
          items: orderDraft.map((row) => ({
            itemName: row.itemName,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Could not create order", "error");
        return;
      }

      const createdOrder = await res.json();
      setOrders((prev) => [createdOrder, ...prev]);
      setSelectedItems({});
      setOrderNote("");
      setShowComposer(false);
      toast("Order created");
      // Nudge the poll so kitchen staff see it immediately
      setOrderPollKey((k) => k + 1);
    } finally {
      setSavingOrder(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderTicket["status"]) {
    const res = await fetch(`/api/restaurants/${id}/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast((data as { error?: string }).error || "Could not update order", "error");
      return;
    }

    const updated = (await res.json()) as OrderTicket;
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  }

  function canUpdateStatus(status: OrderTicket["status"]) {
    if (actorType === "USER") return true;
    if (staffRole === "WAITER") {
      return status === "SERVED" || status === "PAID" || status === "CANCELED";
    }
    if (staffRole === "COOK" || staffRole === "CHEF") {
      return status === "PREPARING" || status === "SERVED" || status === "CANCELED";
    }
    return false;
  }

  function getOrderActionStatuses(currentStatus: OrderTicket["status"]): OrderTicket["status"][] {
    let allowed: OrderTicket["status"][];
    if (actorType === "USER") {
      allowed = ["NEW", "PREPARING", "SERVED", "PAID", "CANCELED"];
    } else if (staffRole === "WAITER") {
      allowed = ["SERVED", "PAID", "CANCELED"];
    } else if (staffRole === "COOK" || staffRole === "CHEF") {
      allowed = ["PREPARING", "SERVED", "CANCELED"];
    } else {
      allowed = [];
    }
    // Never include the status the order is already in
    return allowed.filter((s) => s !== currentStatus);
  }

  function getNextSuggestedStatus(order: OrderTicket): OrderTicket["status"] | null {
    if (actorType === "USER") {
      if (order.status === "NEW") return "PREPARING";
      if (order.status === "PREPARING") return "SERVED";
      if (order.status === "SERVED") return "PAID";
      return null;
    }

    if (staffRole === "WAITER") {
      if (order.status === "NEW" || order.status === "PREPARING") return "SERVED";
      if (order.status === "SERVED") return "PAID";
      return null;
    }

    if (staffRole === "COOK" || staffRole === "CHEF") {
      if (order.status === "NEW") return "PREPARING";
      if (order.status === "PREPARING") return "SERVED";
      return null;
    }

    return null;
  }

  function clearDraft() {
    setSelectedItems({});
    setOrderNote("");
  }

  async function addStaffMember() {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) return;
    setAddingStaff(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/staff-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStaffName,
          email: newStaffEmail,
          password: newStaffPassword,
          phone: newStaffPhone,
          role: newStaffRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Could not add staff member", "error");
        return;
      }

      const created = (await res.json()) as StaffMember;
      setStaff((prev) => [created, ...prev]);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffPhone("");
      setNewStaffRole("WAITER");
    } finally {
      setAddingStaff(false);
    }
  }

  async function updateStaffMember(staffId: string, payload: Partial<StaffMember>) {
    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, ...payload }),
    });

    if (!res.ok) return;
    const updated = (await res.json()) as StaffMember;
    setStaff((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function deleteStaffMember(staffId: string) {
    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    });

    if (!res.ok) return;
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
  }

  async function resetStaffPassword(staffId: string) {
    const password = window.prompt("Enter new password for this staff member");
    if (!password) return;
    if (password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }

    const res = await fetch(`/api/restaurants/${id}/staff-members`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, password }),
    });

    if (!res.ok) {
      toast("Could not reset password", "error");
      return;
    }

    toast("Staff password updated");
  }

  const activeWaiterCount = staff.filter((s) => s.isActive && s.role === "WAITER").length;
  const activeKitchenCount = staff.filter((s) => s.isActive && (s.role === "COOK" || s.role === "CHEF")).length;

  function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  const focusCall = pendingCalls[0] || null;

  const STATUS_META: Record<OrderTicket["status"], { badge: string; label: string }> = {
    NEW:       { badge: "bg-blue-100 text-blue-700",    label: "New" },
    PREPARING: { badge: "bg-amber-100 text-amber-700",  label: "Preparing" },
    SERVED:    { badge: "bg-emerald-100 text-emerald-700", label: "Served" },
    PAID:      { badge: "bg-violet-100 text-violet-700", label: "Paid" },
    CANCELED:  { badge: "bg-red-100 text-red-500",      label: "Canceled" },
  };

  function fmt(n: number) {
    return Math.round(n).toLocaleString("en-IN");
  }

  return (
    <div className="page-shell space-y-4 sm:space-y-5">
      <header className="surface-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Staff Panel</h1>
            <p className="page-subtitle mt-1">Action-first view for calls and orders</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-900 text-white font-semibold">
              {actorType === "USER" ? "Admin" : (staffRole || "Staff")}
            </span>
            <div className="flex items-center gap-2">
              {canUseCalls && (
                <Link
                  href={`/dashboard/restaurant/${id}/live`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition relative overflow-hidden"
                >
                  {pendingCalls.length > 0 && (
                    <span className="absolute inset-0 bg-red-400 animate-ping opacity-30 rounded-xl" />
                  )}
                  <svg className="w-3.5 h-3.5 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="relative">Live Board</span>
                  {pendingCalls.length > 0 && (
                    <span className="relative bg-white text-red-600 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                      {pendingCalls.length}
                    </span>
                  )}
                </Link>
              )}
              <button
                onClick={() => setSimpleView((v) => !v)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition"
              >
                {simpleView ? "Detailed" : "Simple"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600">Pending Calls</p>
            <p className="text-2xl font-extrabold text-red-900 leading-none mt-1">{pendingCalls.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Active Queue</p>
            <p className="text-2xl font-extrabold text-amber-900 leading-none mt-1">{activeOrderQueue}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Ready to Close</p>
            <p className="text-2xl font-extrabold text-emerald-900 leading-none mt-1">{readyToCloseCount}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">Paid Revenue</p>
            <p className="text-2xl font-extrabold text-violet-900 leading-none mt-1">Rs. {fmt(paidRevenue)}</p>
          </div>
        </div>
      </header>

      <div className="surface-card p-1.5 flex gap-1.5">
        {canUseCalls && (
          <button
            onClick={() => setActiveTab("calls")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "calls"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Calls
            {pendingCalls.length > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "calls" ? "bg-white/25 text-white" : "bg-red-100 text-red-600"}`}>
                {pendingCalls.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
            activeTab === "orders"
              ? "bg-orange-500 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Orders
        </button>
        {canUseCalls && (
          <Link
            href={`/dashboard/restaurant/${id}/live`}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 transition whitespace-nowrap"
          >
            <span className={`w-2 h-2 rounded-full ${pendingCalls.length > 0 ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`} />
            Live
          </Link>
        )}
      </div>

      {activeTab === "calls" && canUseCalls && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-4">
            <div className="surface-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900">Priority Call</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                  {pendingCalls.length} waiting
                </span>
              </div>

              {focusCall ? (
                <div className={`rounded-2xl border-2 p-4 ${
                  focusCall.status === "ACKNOWLEDGED"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center font-extrabold text-2xl shrink-0 ${
                      focusCall.status === "ACKNOWLEDGED" ? "bg-amber-500" : "bg-red-500"
                    }`}>
                      {focusCall.tableNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-lg font-bold ${focusCall.status === "ACKNOWLEDGED" ? "text-amber-900" : "text-red-900"}`}>
                          {focusCall.tableLabel || `Table ${focusCall.tableNumber}`}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          focusCall.status === "ACKNOWLEDGED"
                            ? "bg-amber-200 text-amber-800"
                            : "bg-red-200 text-red-800"
                        }`}>
                          {focusCall.status === "ACKNOWLEDGED" ? "ON THE WAY" : "WAITING"}
                        </span>
                      </div>
                      {focusCall.message && <p className={`mt-1 text-sm ${focusCall.status === "ACKNOWLEDGED" ? "text-amber-700" : "text-red-700"}`}>"{focusCall.message}"</p>}
                      <p className={`text-xs mt-2 ${focusCall.status === "ACKNOWLEDGED" ? "text-amber-500" : "text-red-500"}`}>{timeAgo(focusCall.createdAt)}</p>
                    </div>
                  </div>
                  <div className={`grid gap-2 mt-4 ${focusCall.status === "PENDING" ? "grid-cols-2" : "grid-cols-1"}`}>
                    {focusCall.status === "PENDING" && (
                      <button
                        onClick={() => updateCallStatus(focusCall.id, "ACKNOWLEDGED")}
                        className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 transition"
                      >
                        On My Way
                      </button>
                    )}
                    <button
                      onClick={() => updateCallStatus(focusCall.id, "RESOLVED")}
                      className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 transition"
                    >
                      {focusCall.status === "ACKNOWLEDGED" ? "Mark Resolved" : "Resolve Now"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="text-2xl mb-2">All clear</p>
                  <p className="text-sm text-emerald-700 font-medium">No active waiter calls</p>
                </div>
              )}
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Call Queue</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingCalls.length === 0 ? (
                  <div className="px-4 sm:px-5 py-5 text-sm text-gray-400">No queue right now</div>
                ) : (
                  pendingCalls.slice(0, 8).map((call) => (
                    <div key={call.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          call.status === "ACKNOWLEDGED" ? "bg-amber-400" : "bg-red-400 animate-pulse"
                        }`} />
                        <div>
                          <p className="font-semibold text-gray-900 truncate">{call.tableLabel || `Table ${call.tableNumber}`}</p>
                          <p className="text-[11px] text-gray-400">{timeAgo(call.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {call.status === "PENDING" && (
                          <button
                            onClick={() => updateCallStatus(call.id, "ACKNOWLEDGED")}
                            className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => updateCallStatus(call.id, "RESOLVED")}
                          className="text-xs px-2.5 py-1 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 surface-card overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Recent Call History</h3>
              {!simpleView && <span className="text-xs text-gray-400">{allCalls.length} total</span>}
            </div>
            <div className="divide-y divide-gray-100">
              {allCalls.length === 0 ? (
                <div className="px-4 sm:px-5 py-8 text-center text-sm text-gray-400">No waiter calls yet</div>
              ) : (
                visibleAllCalls.map((call) => (
                  <div key={call.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{call.table?.label || `Table ${call.table?.number}`}</p>
                      {!simpleView && call.message && <p className="text-xs text-gray-500 truncate">{call.message}</p>}
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                        call.status === "PENDING" ? "bg-red-100 text-red-700" :
                        call.status === "ACKNOWLEDGED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {call.status}
                      </span>
                      {!simpleView && <p className="text-[11px] text-gray-400 mt-1">{timeAgo(call.createdAt)}</p>}
                    </div>
                  </div>
                ))
              )}
              {allCalls.length > visibleCalls && (
                <div className="p-3 border-t border-gray-100">
                  <button onClick={() => setVisibleCalls((v) => v + 6)} className="btn-soft w-full">
                    Show More Calls
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-8 space-y-4 order-2 xl:order-1">
            <div className="surface-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["ALL", "NEW", "PREPARING", "SERVED", "PAID", "CANCELED"] as const).map((status) => {
                  const count = status === "ALL" ? orders.length : orderCounts[status];
                  return (
                    <button
                      key={status}
                      onClick={() => setOrderStatusFilter(status)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${orderStatusFilter === status ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                    >
                      {status}
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${orderStatusFilter === status ? "bg-white/25" : "bg-gray-100"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <input
                value={orderTableFilter}
                onChange={(e) => setOrderTableFilter(e.target.value)}
                placeholder="Filter by table name or number"
                className="control-input"
              />
            </div>

            <div className="surface-card overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Active Order Board</h2>
                <span className="text-xs text-gray-500">{filteredOrders.length} results</span>
              </div>
              <div className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <div className="px-4 sm:px-5 py-8 text-center text-sm text-gray-400">No orders found</div>
                ) : (
                  visibleFilteredOrders.map((order) => {
                    const actionStatuses = getOrderActionStatuses(order.status);
                    const suggestedStatus = getNextSuggestedStatus(order);
                    const meta = STATUS_META[order.status];

                    return (
                      <div key={order.id} className="px-4 sm:px-5 py-4 space-y-3">
                        {/* Card header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-base leading-tight">
                              {order.table.label || `Table ${order.table.number}`}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${meta.badge}`}>
                              {meta.label}
                            </span>
                            <span className="text-sm font-extrabold text-gray-900">
                              Rs. {fmt(order.total)}
                            </span>
                          </div>
                        </div>

                        {/* Items */}
                        {!simpleView && (
                          <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
                            {order.items.map((line) => (
                              <div key={line.id} className="flex items-center justify-between text-sm text-gray-700">
                                <span className="font-medium">{line.quantity} × {line.itemName}</span>
                                <span className="text-gray-500 font-medium">Rs. {fmt(line.lineTotal)}</span>
                              </div>
                            ))}
                            {order.note && (
                              <p className="text-xs text-gray-500 italic pt-1 border-t border-gray-200 mt-1">
                                "{order.note}"
                              </p>
                            )}
                          </div>
                        )}

                        {simpleView && (
                          <p className="text-xs text-gray-500">
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            {order.note && <span className="italic ml-1">· Note attached</span>}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {suggestedStatus && canUpdateStatus(suggestedStatus) && (
                            <button
                              onClick={() => updateOrderStatus(order.id, suggestedStatus)}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                              {suggestedStatus}
                            </button>
                          )}
                          {actionStatuses
                            .filter((s) => s !== suggestedStatus)
                            .map((status) => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                                  status === "CANCELED"
                                    ? "border-red-200 text-red-500 bg-red-50 hover:bg-red-100"
                                    : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                        </div>
                      </div>
                    );
                  })
                )}

                {filteredOrders.length > visibleOrders && (
                  <div className="p-3 border-t border-gray-100">
                    <button onClick={() => setVisibleOrders((v) => v + 6)} className="btn-soft w-full">
                      Show More Orders
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="xl:col-span-4 order-1 xl:order-2 space-y-3">
            <div className="surface-card p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-gray-500">NEW</p>
                  <p className="text-lg font-extrabold text-gray-900">{orderCounts.NEW}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-amber-600">PREP</p>
                  <p className="text-lg font-extrabold text-amber-900">{orderCounts.PREPARING}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-emerald-600">SERVED</p>
                  <p className="text-lg font-extrabold text-emerald-900">{orderCounts.SERVED}</p>
                </div>
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-cyan-600">PAID</p>
                  <p className="text-lg font-extrabold text-cyan-900">{orderCounts.PAID}</p>
                </div>
              </div>
            </div>

            {canTakeOrders && (
              <>
                {!showComposer && (
                  <button onClick={() => setShowComposer(true)} className="btn-primary w-full xl:hidden">
                    Open Order Composer
                  </button>
                )}

                <div className={`${showComposer ? "block" : "hidden"} xl:block surface-card p-4`}> 
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-bold text-gray-900">New Order</h3>
                    <button onClick={() => setShowComposer(false)} className="btn-soft px-2.5! py-1! text-xs! xl:hidden">Hide</button>
                  </div>

                  <div className="space-y-3">
                    <select value={selectedTableId} onChange={(e) => setSelectedTableId(e.target.value)} className="control-input">
                      <option value="">Select table</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>{table.label || `Table ${table.number}`}</option>
                      ))}
                    </select>

                    <input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search menu item"
                      className="control-input"
                    />

                    <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-2">
                      {filteredMenuItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-gray-200 px-2.5 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-[11px] text-gray-500">Rs. {fmt(item.price)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => decrementItem(item.id)} className="w-6 h-6 rounded-md border border-gray-300 text-gray-700">-</button>
                            <span className="w-5 text-center text-sm font-semibold">{selectedItems[item.id] || 0}</span>
                            <button onClick={() => incrementItem(item.id)} className="w-6 h-6 rounded-md bg-gray-900 text-white">+</button>
                          </div>
                        </div>
                      ))}
                      {filteredMenuItems.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-3">No matching items</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-600">Draft for {selectedTable ? (selectedTable.label || `Table ${selectedTable.number}`) : "No table"}</p>
                      <div className="max-h-28 overflow-y-auto mt-2 space-y-1.5">
                        {orderDraft.length === 0 ? (
                          <p className="text-xs text-gray-400">No items selected</p>
                        ) : (
                          orderDraft.map((row) => (
                            <div key={row.itemId} className="flex items-center justify-between text-sm">
                              <span>{row.quantity} × {row.itemName}</span>
                              <span className="font-semibold">Rs. {fmt(row.lineTotal)}</span>
                            </div>
                          ))
                        )}
                      </div>
                      <textarea
                        value={orderNote}
                        onChange={(e) => setOrderNote(e.target.value)}
                        rows={2}
                        className="control-input px-3! py-2! text-sm mt-3"
                        placeholder="Special note"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-lg font-extrabold text-gray-900">Rs. {fmt(orderTotal)}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={clearDraft} className="btn-soft flex-1">Clear</button>
                        <button onClick={submitOrder} disabled={savingOrder || !selectedTableId || orderDraft.length === 0} className="btn-primary flex-1">
                          {savingOrder ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </section>
      )}

      {canManageStaff && (
        <section className="surface-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-gray-900">Team Management</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Waiters {activeWaiterCount}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Kitchen {activeKitchenCount}</span>
            </div>
            <button onClick={() => setShowStaffSection((v) => !v)} className="btn-soft px-3! py-1.5! text-xs!">
              {showStaffSection ? "Collapse" : "Expand"}
            </button>
          </div>

          {showStaffSection && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2.5 mb-4">
                <input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Staff name" className="control-input" />
                <input value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="Email" className="control-input" />
                <input type="password" value={newStaffPassword} onChange={(e) => setNewStaffPassword(e.target.value)} placeholder="Password" className="control-input" />
                <input value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="Phone" className="control-input" />
                <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as StaffMember["role"])} className="control-input">
                  <option value="WAITER">Waiter</option>
                  <option value="COOK">Cook</option>
                  <option value="CHEF">Chef</option>
                </select>
                <button
                  onClick={addStaffMember}
                  disabled={addingStaff || !newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()}
                  className="btn-primary"
                >
                  {addingStaff ? "Adding..." : "Add Staff"}
                </button>
              </div>

              <div className="space-y-2">
                {staff.length === 0 ? (
                  <p className="text-sm text-gray-400">No staff members added yet.</p>
                ) : (
                  staff.map((member) => (
                    <div key={member.id} className="border border-gray-200 rounded-xl px-3 py-3 flex flex-col gap-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.phone || "No phone"}</p>
                        </div>
                        <span className="text-xs text-gray-500 font-mono break-all">{member.email}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => updateStaffMember(member.id, { role: e.target.value as StaffMember["role"] })}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="WAITER">Waiter</option>
                          <option value="COOK">Cook</option>
                          <option value="CHEF">Chef</option>
                        </select>
                        <button
                          onClick={() => updateStaffMember(member.id, { isActive: !member.isActive })}
                          className={`text-xs px-3 py-1 rounded-full ${member.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </button>
                        <button onClick={() => deleteStaffMember(member.id)} className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700">
                          Remove
                        </button>
                        <button onClick={() => resetStaffPassword(member.id)} className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                          Reset Password
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
