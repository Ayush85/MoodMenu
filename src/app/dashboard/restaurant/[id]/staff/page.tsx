"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { KeyRound, Trash2, UserPlus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { validatePassword } from "@/lib/password-policy";

interface WaiterCall {
  id: string;
  tableNumber: number;
  tableLabel: string | null;
  message: string | null;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
}

function timeAgoShort(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// Two-tone chime for a new waiter call, single soft tone for a new order —
// distinguishable by ear without looking at the screen.
function playChime(tones: number[]) {
  try {
    const ctx = new AudioContext();
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.18 + 0.3);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.35);
    });
  } catch { /* audio unavailable */ }
}

function showBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/logo.svg", tag, ...({ renotify: true } as object) } as NotificationOptions);
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
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
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
  const [callHistory, setCallHistory] = useState<RawWaiterCall[]>([]);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [updatingCallId, setUpdatingCallId] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const prevPendingCallIds = useRef<Set<string> | null>(null);
  const prevNewOrderIds = useRef<Set<string> | null>(null);
  const [tables, setTables] = useState<RestaurantTableData[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [orders, setOrders] = useState<OrderTicket[]>([]);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNote, setOrderNote] = useState("");
  const [itemSearch, setItemSearch] = useState("");
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
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState<StaffMember | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const actorType = session?.user?.actorType;
  const staffRole = session?.user?.role as "WAITER" | "COOK" | "CHEF" | undefined;
  const canManageStaff = actorType === "USER";
  const canUseCalls = actorType === "USER" || staffRole === "WAITER";
  const canTakeOrders = actorType === "USER" || staffRole === "WAITER";
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [orderPollKey, setOrderPollKey] = useState(0);

  useEffect(() => {
    if (!canUseCalls && activeTab === "calls") {
      setActiveTab("orders");
    }
  }, [canUseCalls, activeTab]);

  // Load tables and menu items for order pad
  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const tableData = (data?.tables || []) as RestaurantTableData[];
        const categoryData = (data?.categories || []) as Array<{
          id: string;
          name: string;
          items: Array<{ id: string; name: string; price: number; isAvailable: boolean }>;
        }>;
        const itemData = categoryData.flatMap((category) =>
          (category.items || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            isAvailable: item.isAvailable,
            categoryId: category.id,
            categoryName: category.name,
          }))
        );

        setTables(tableData.sort((a, b) => a.number - b.number));
        setMenuItems(itemData);
      })
      .catch(() => {
        setTables([]);
        setMenuItems([]);
      });
  }, [id]);

  useEffect(() => {
    if ("Notification" in window) setNotifGranted(Notification.permission === "granted");
  }, []);

  async function requestNotifPermission() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === "granted");
  }

  // Orders: poll every 8s. A new NEW-status order gets a soft chime — useful
  // for kitchen staff who aren't staring at the screen. Background/closed-app
  // alerts are covered separately by push (see /api/restaurants/[id]/orders).
  const fetchOrders = useCallback(() => {
    fetch(`/api/restaurants/${id}/orders`)
      .then((r) => r.json())
      .then((data) => {
        const list: OrderTicket[] = Array.isArray(data) ? data : [];
        const currentNewIds = new Set(list.filter((o) => o.status === "NEW").map((o) => o.id));
        if (prevNewOrderIds.current) {
          const hasNew = [...currentNewIds].some((oid) => !prevNewOrderIds.current!.has(oid));
          if (hasNew) playChime([660]);
        }
        prevNewOrderIds.current = currentNewIds;
        setOrders(list);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders, orderPollKey]);

  // Calls: poll every 3s (faster than orders — a call is someone waiting on
  // the spot) and fold in a chime + browser notification for new PENDING
  // calls, matching what the old standalone Live board did.
  const fetchCalls = useCallback(() => {
    if (!canUseCalls) return;
    fetch(`/api/restaurants/${id}/waiter-calls`)
      .then((r) => r.json())
      .then((data: RawWaiterCall[]) => {
        const raw = Array.isArray(data) ? data : [];
        setCallHistory(raw);

        const active = raw
          .filter((c) => c.status === "PENDING" || c.status === "ACKNOWLEDGED")
          .map((c) => ({
            id: c.id,
            tableNumber: c.table.number,
            tableLabel: c.table.label,
            message: c.message,
            status: c.status as WaiterCall["status"],
            createdAt: c.createdAt,
          }))
          .sort((a, b) => {
            if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

        const newPendingIds = new Set(active.filter((c) => c.status === "PENDING").map((c) => c.id));
        // Skip the very first fetch after mount/reload — otherwise every
        // already-pending call (from before this page was even opened)
        // looks "new" against an empty starting set, and reloading the
        // page re-chimes for calls that were already sitting there.
        if (prevPendingCallIds.current) {
          const newlyArrived = active.filter((c) => c.status === "PENDING" && !prevPendingCallIds.current!.has(c.id));
          if (newlyArrived.length > 0) {
            playChime([880, 1100, 1320]);
            newlyArrived.forEach((c) =>
              showBrowserNotification(
                `${c.tableLabel || `Table ${c.tableNumber}`} needs help`,
                c.message || "Customer requesting assistance",
                c.id
              )
            );
          }
        }
        prevPendingCallIds.current = newPendingIds;
        setPendingCalls(active);
      })
      .catch(() => {});
  }, [id, canUseCalls]);

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  async function updateCallStatus(callId: string, status: "ACKNOWLEDGED" | "RESOLVED") {
    setUpdatingCallId(callId);
    try {
      const res = await fetch(`/api/restaurants/${id}/waiter-calls`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast((data as { error?: string }).error || "Could not update call", "error");
        return;
      }
      await fetchCalls();
    } finally {
      setUpdatingCallId(null);
    }
  }

  // Esc closes whichever modal is open — standard, expected affordance.
  useEffect(() => {
    if (!showComposer && !resetPasswordStaff && !confirmAction) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (confirmAction) setConfirmAction(null);
      else if (resetPasswordStaff) setResetPasswordStaff(null);
      else if (showComposer) setShowComposer(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showComposer, resetPasswordStaff, confirmAction]);

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

  function removeItem(itemId: string) {
    setSelectedItems((prev) => {
      const next = { ...prev };
      delete next[itemId];
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

  const availableMenuItems = useMemo(() => menuItems.filter((item) => item.isAvailable), [menuItems]);
  const unavailableCount = menuItems.length - availableMenuItems.length;

  const filteredMenuItems = useMemo(() => {
    const search = itemSearch.trim().toLowerCase();
    if (!search) return availableMenuItems;
    return availableMenuItems.filter((item) => item.name.toLowerCase().includes(search));
  }, [availableMenuItems, itemSearch]);

  // Grouped by category, preserving the menu's own category/item order
  // (the API already returns items ordered that way) so the picker reads
  // top-to-bottom the same way the printed/public menu does.
  const groupedMenuItems = useMemo(() => {
    const groups = new Map<string, { categoryId: string; categoryName: string; items: MenuItemOption[] }>();
    for (const item of filteredMenuItems) {
      const group = groups.get(item.categoryId);
      if (group) group.items.push(item);
      else groups.set(item.categoryId, { categoryId: item.categoryId, categoryName: item.categoryName, items: [item] });
    }
    return Array.from(groups.values());
  }, [filteredMenuItems]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderTableFilter.trim()) {
        const token = orderTableFilter.trim().toLowerCase();
        const tableName = (order.table.label || `table ${order.table.number}`).toLowerCase();
        if (!tableName.includes(token)) return false;
      }
      return true;
    });
  }, [orders, orderTableFilter]);

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

  const focusCall = pendingCalls[0] || null;
  const callQueue = pendingCalls.slice(1);
  const resolvedCallCount = callHistory.filter((c) => c.status === "RESOLVED").length;


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

  function handleOrderStatusClick(order: OrderTicket, status: OrderTicket["status"]) {
    if (status === "CANCELED") {
      setConfirmAction({
        title: "Cancel this order?",
        message: `${order.table.label || `Table ${order.table.number}`} · Rs. ${fmt(order.total)}. This can't be undone.`,
        confirmLabel: "Cancel Order",
        variant: "danger",
        onConfirm: () => {
          updateOrderStatus(order.id, status);
          setConfirmAction(null);
        },
      });
      return;
    }
    updateOrderStatus(order.id, status);
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast((data as { error?: string }).error || "Could not remove staff member", "error");
      return;
    }
    setStaff((prev) => prev.filter((s) => s.id !== staffId));
    toast("Staff member removed");
  }

  function confirmDeleteStaff(member: StaffMember) {
    setConfirmAction({
      title: "Remove staff member?",
      message: `${member.name} will lose access immediately. You'll need to re-add them to restore it.`,
      confirmLabel: "Remove",
      variant: "danger",
      onConfirm: () => {
        deleteStaffMember(member.id);
        setConfirmAction(null);
      },
    });
  }

  async function submitPasswordReset() {
    if (!resetPasswordStaff) return;
    const passwordError = validatePassword(resetPasswordValue);
    if (passwordError) {
      toast(passwordError, "error");
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch(`/api/restaurants/${id}/staff-members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: resetPasswordStaff.id, password: resetPasswordValue }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast((data as { error?: string }).error || "Could not reset password", "error");
        return;
      }

      toast(`Password updated for ${resetPasswordStaff.name}`);
      setResetPasswordStaff(null);
      setResetPasswordValue("");
    } finally {
      setResettingPassword(false);
    }
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

  // Kanban lanes — the order pipeline, in the order it actually flows.
  // CANCELED is deliberately excluded from the board: it's a terminal
  // dead-end, not something anyone acts on further, so keeping it out
  // reduces clutter on the view staff actually work from all shift.
  const ORDER_COLUMNS: { status: OrderTicket["status"]; label: string; dot: string; header: string }[] = [
    { status: "NEW", label: "New", dot: "bg-blue-400", header: "border-t-blue-400" },
    { status: "PREPARING", label: "Preparing", dot: "bg-amber-400", header: "border-t-amber-400" },
    { status: "SERVED", label: "Served", dot: "bg-emerald-400", header: "border-t-emerald-400" },
    { status: "PAID", label: "Paid", dot: "bg-violet-400", header: "border-t-violet-400" },
  ];

  function renderOrderCard(order: OrderTicket) {
    const actionStatuses = getOrderActionStatuses(order.status);
    const suggestedStatus = getNextSuggestedStatus(order);
    const isStale = (order.status === "NEW" || order.status === "PREPARING") &&
      Date.now() - new Date(order.createdAt).getTime() > 10 * 60 * 1000;

    return (
      <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-3.5 space-y-2.5 shadow-sm">
        {/* Card header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-tight">
              {order.table.label || `Table ${order.table.number}`}
            </p>
            <p className={`text-[11px] mt-0.5 ${isStale ? "text-red-500 font-semibold" : "text-gray-400"}`}>
              {isStale && "⚠ "}{timeAgo(order.createdAt)}
            </p>
          </div>
          <span className="text-sm font-extrabold text-gray-900 shrink-0">Rs. {fmt(order.total)}</span>
        </div>

        {/* Items — shown up front, not hidden behind a toggle */}
        <div className="bg-gray-50 rounded-lg px-2.5 py-2 space-y-1.5">
          {order.items.map((line) => (
            <div key={line.id} className="flex items-center justify-between text-xs text-gray-700">
              <span className="font-medium min-w-0 truncate">
                <span className="inline-flex min-w-4 justify-center rounded-md bg-gray-200 px-1 text-[10px] font-bold text-gray-600 mr-1.5">{line.quantity}</span>
                {line.itemName}
              </span>
              <span className="text-gray-500 font-medium shrink-0 ml-2">Rs. {fmt(line.lineTotal)}</span>
            </div>
          ))}
          {order.note && (
            <p className="text-[11px] text-gray-500 italic pt-1.5 border-t border-gray-200 mt-1.5">
              &ldquo;{order.note}&rdquo;
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {suggestedStatus && canUpdateStatus(suggestedStatus) && (
            <button
              onClick={() => handleOrderStatusClick(order, suggestedStatus)}
              className="flex min-h-9 items-center gap-1 rounded-lg bg-orange-500 px-3 text-[11px] font-bold text-white transition hover:bg-orange-600"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {STATUS_META[suggestedStatus].label}
            </button>
          )}
          {actionStatuses
            .filter((s) => s !== suggestedStatus)
            .map((status) => (
              <button
                key={status}
                onClick={() => handleOrderStatusClick(order, status)}
                className={`min-h-9 text-[11px] px-2.5 rounded-lg border font-medium transition ${
                  status === "CANCELED"
                    ? "border-red-200 text-red-500 bg-red-50 hover:bg-red-100"
                    : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
                }`}
              >
                {STATUS_META[status].label}
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="staff-panel page-shell space-y-4 sm:space-y-5">
      <header className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">Staff Panel</h1>
            <p className="page-subtitle mt-1">Action-first view for calls and orders</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-900 text-white font-semibold">
              {actorType === "USER" ? "Admin" : (staffRole || "Staff")}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={requestNotifPermission}
                title={notifGranted ? "Notifications enabled" : "Enable browser notifications for new calls and orders"}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  notifGranted
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill={notifGranted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifGranted ? "Alerts on" : "Enable alerts"}
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

      <div className="surface-card sticky top-[4.5rem] z-20 flex gap-1.5 p-1.5 sm:static">
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
      </div>

      {activeTab === "calls" && canUseCalls && (
        <section className="max-w-lg mx-auto space-y-3">
          {/* Focus: the call that needs attention right now */}
          {focusCall ? (
            <div className="surface-card overflow-hidden">
              <div className={`flex items-center gap-2 px-5 py-2.5 ${focusCall.status === "PENDING" ? "bg-red-500" : "bg-amber-500"}`}>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90">
                  {focusCall.status === "PENDING" ? "Needs Attention" : "On the Way"}
                </span>
                <span className="ml-auto text-[11px] text-white/80">{timeAgoShort(focusCall.createdAt)}</span>
              </div>
              <div className="p-5">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Table</p>
                <h2 className="text-4xl font-black text-gray-900 leading-none truncate mb-1">
                  {focusCall.tableLabel || focusCall.tableNumber}
                </h2>
                {focusCall.message && (
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed italic">&ldquo;{focusCall.message}&rdquo;</p>
                )}
                <div className={`mt-4 grid gap-2.5 ${focusCall.status === "PENDING" ? "grid-cols-2" : "grid-cols-1"}`}>
                  {focusCall.status === "PENDING" && (
                    <button
                      onClick={() => updateCallStatus(focusCall.id, "ACKNOWLEDGED")}
                      disabled={updatingCallId === focusCall.id}
                      className="btn-soft py-3.5"
                    >
                      On My Way
                    </button>
                  )}
                  <button
                    onClick={() => updateCallStatus(focusCall.id, "RESOLVED")}
                    disabled={updatingCallId === focusCall.id}
                    className="btn-primary py-3.5"
                  >
                    {updatingCallId === focusCall.id ? "Saving…" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">All Clear</h2>
              <p className="text-sm text-gray-500">No active calls right now</p>
              {resolvedCallCount > 0 && (
                <p className="mt-2 text-xs text-emerald-600 font-semibold">{resolvedCallCount} resolved today</p>
              )}
            </div>
          )}

          {/* Queue: everything else waiting */}
          {callQueue.length > 0 && (
            <div className="surface-card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Queue</h3>
                <span className="text-xs text-gray-400">{callQueue.length} waiting</span>
              </div>
              <div className="divide-y divide-gray-100">
                {callQueue.map((call) => (
                  <div key={call.id} className="px-4 py-3.5 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${call.status === "PENDING" ? "bg-red-400 animate-pulse" : "bg-amber-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{call.tableLabel || `Table ${call.tableNumber}`}</p>
                      {call.message && <p className="text-xs text-gray-400 truncate mt-0.5">{call.message}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-gray-400">{timeAgoShort(call.createdAt)}</span>
                      {call.status === "PENDING" && (
                        <button
                          onClick={() => updateCallStatus(call.id, "ACKNOWLEDGED")}
                          disabled={updatingCallId === call.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition font-semibold disabled:opacity-50"
                        >
                          ACK
                        </button>
                      )}
                      <button
                        onClick={() => updateCallStatus(call.id, "RESOLVED")}
                        disabled={updatingCallId === call.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition font-semibold disabled:opacity-50"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="surface-card overflow-hidden">
            <button
              onClick={() => setShowCallHistory((v) => !v)}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Call History</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{callHistory.length} total</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCallHistory ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {showCallHistory && (
              <div className="border-t border-gray-100 max-h-64 overflow-y-auto divide-y divide-gray-100">
                {callHistory.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">No calls yet</p>
                ) : (
                  callHistory.slice(0, 30).map((call) => (
                    <div key={call.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {call.table?.label || `Table ${call.table?.number}`}
                        </p>
                        {call.message && <p className="text-xs text-gray-400 truncate">{call.message}</p>}
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          call.status === "PENDING"      ? "bg-red-100 text-red-600" :
                          call.status === "ACKNOWLEDGED" ? "bg-amber-100 text-amber-600" :
                                                           "bg-emerald-100 text-emerald-600"
                        }`}>
                          {call.status === "ACKNOWLEDGED" ? "ACK" : call.status}
                        </div>
                        <p className="text-[10px] text-gray-400">{timeAgoShort(call.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "orders" && (
        <section className="space-y-4">
          <div className="surface-card p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={orderTableFilter}
              onChange={(e) => setOrderTableFilter(e.target.value)}
              placeholder="Filter by table name or number"
              className="control-input flex-1"
            />
            {canTakeOrders && (
              <button onClick={() => setShowComposer(true)} className="btn-primary shrink-0 py-3 sm:w-auto">
                + Create new order
              </button>
            )}
          </div>

          {/* Kanban board — the order pipeline as it actually flows, one
              lane per status, instead of a single list behind a filter. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ORDER_COLUMNS.map((col) => {
              const columnOrders = filteredOrders
                .filter((o) => o.status === col.status)
                .sort((a, b) =>
                  col.status === "PAID"
                    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );

              return (
                <div key={col.status} className={`surface-card overflow-hidden border-t-4 ${col.header}`}>
                  <div className="px-3.5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <h2 className="text-sm font-bold text-gray-900">{col.label}</h2>
                    <span className="ml-auto text-xs font-bold text-gray-400">{columnOrders.length}</span>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto p-2.5 space-y-2.5">
                    {columnOrders.length === 0 ? (
                      <p className="py-8 text-center text-xs text-gray-400">Nothing here</p>
                    ) : (
                      columnOrders.map(renderOrderCard)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {canTakeOrders && showComposer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <button
            aria-label="Close order composer"
            onClick={() => setShowComposer(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-order-title"
            className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-500">Staff order</p>
                <h2 id="new-order-title" className="mt-1 text-xl font-extrabold text-gray-900">Create new order</h2>
                <p className="mt-0.5 text-xs text-gray-500">Add items for a table and send them to the kitchen.</p>
              </div>
              <button
                onClick={() => setShowComposer(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <span className="text-xl">×</span>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                {/* Table picker — a tappable grid reads faster than scrolling a dropdown */}
                <div>
                  <label className="field-label">Table</label>
                  <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {tables.map((table) => {
                      const active = table.id === selectedTableId;
                      return (
                        <button
                          key={table.id}
                          onClick={() => setSelectedTableId(active ? "" : table.id)}
                          className={`flex min-h-14 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-center transition ${
                            active
                              ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-sm font-extrabold leading-tight">{table.number}</span>
                          {table.label && (
                            <span className={`truncate w-full text-[10px] leading-tight ${active ? "text-white/80" : "text-gray-400"}`}>
                              {table.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {tables.length === 0 && (
                      <p className="col-span-full py-3 text-center text-xs text-gray-400">No tables configured yet</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="field-label">Add menu items</label>
                  <input
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Search by item name"
                    className="control-input mt-1 w-full"
                    autoFocus
                  />
                </div>

                <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-gray-200 p-2">
                  {groupedMenuItems.map((group) => (
                    <div key={group.categoryId}>
                      <p className="sticky top-0 z-10 -mx-2 bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 backdrop-blur">
                        {group.categoryName}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const qty = selectedItems[item.id] || 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex min-h-14 items-center justify-between gap-3 rounded-xl px-3 py-2 transition ${
                                qty > 0 ? "bg-orange-50 ring-1 ring-orange-200" : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">Rs. {fmt(item.price)}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => decrementItem(item.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-lg text-gray-700"
                                >
                                  −
                                </button>
                                <span className="w-5 text-center text-sm font-extrabold">{qty}</span>
                                <button
                                  onClick={() => incrementItem(item.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-lg text-white"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {filteredMenuItems.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No matching menu items</p>}
                </div>
                {unavailableCount > 0 && (
                  <p className="text-[11px] text-gray-400">{unavailableCount} unavailable item{unavailableCount !== 1 ? "s" : ""} hidden</p>
                )}

                <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Order summary</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {selectedTable ? selectedTable.label || `Table ${selectedTable.number}` : "Select a table"}
                      </p>
                    </div>
                    <p className="text-lg font-extrabold text-gray-900">Rs. {fmt(orderTotal)}</p>
                  </div>
                  <div className="mt-3 space-y-2 border-t border-orange-100 pt-3">
                    {orderDraft.length === 0 ? (
                      <p className="text-xs text-gray-400">Your order is empty</p>
                    ) : (
                      orderDraft.map((row) => (
                        <div key={row.itemId} className="flex items-center justify-between gap-3 text-sm">
                          <span>{row.quantity} × {row.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Rs. {fmt(row.lineTotal)}</span>
                            <button
                              onClick={() => removeItem(row.itemId)}
                              aria-label={`Remove ${row.itemName}`}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="field-label">Kitchen note <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                  <textarea
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={2}
                    className="control-input mt-1 w-full resize-none"
                    placeholder="Less spicy, no onions…"
                  />
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 flex-col gap-2.5 border-t border-gray-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
              {orderDraft.length > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{orderDraft.reduce((sum, r) => sum + r.quantity, 0)} item{orderDraft.reduce((sum, r) => sum + r.quantity, 0) !== 1 ? "s" : ""}</span>
                  <span className="font-bold text-gray-900">Rs. {fmt(orderTotal)}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={clearDraft} className="btn-soft flex-1">Clear</button>
                <button
                  onClick={submitOrder}
                  disabled={savingOrder || !selectedTableId || orderDraft.length === 0}
                  className="btn-primary flex-[1.5]"
                >
                  {savingOrder ? "Sending…" : "Send to kitchen"}
                </button>
              </div>
            </footer>
          </section>
        </div>
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
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 mb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Add a staff member</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div>
                    <label className="field-label">Name</label>
                    <input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Full name" className="control-input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="field-label">Email</label>
                    <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="staff@restaurant.com" className="control-input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="field-label">Phone <span className="font-normal normal-case text-gray-400">(optional)</span></label>
                    <input value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="98XXXXXXXX" className="control-input mt-1 w-full" />
                  </div>
                  <div>
                    <label className="field-label">Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showNewStaffPassword ? "text" : "password"}
                        value={newStaffPassword}
                        onChange={(e) => setNewStaffPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="control-input w-full pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewStaffPassword((v) => !v)}
                        aria-label={showNewStaffPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Role</label>
                    <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as StaffMember["role"])} className="control-input mt-1 w-full">
                      <option value="WAITER">Waiter</option>
                      <option value="COOK">Cook</option>
                      <option value="CHEF">Chef</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addStaffMember}
                      disabled={addingStaff || !newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()}
                      className="btn-primary w-full flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      {addingStaff ? "Adding…" : "Add Staff"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {staff.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No staff members added yet.</p>
                ) : (
                  staff.map((member) => (
                    <div key={member.id} className="rounded-2xl border border-gray-200 px-3.5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                            member.isActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                member.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {member.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                          {member.phone && <p className="text-xs text-gray-400">{member.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={member.role}
                          onChange={(e) => updateStaffMember(member.id, { role: e.target.value as StaffMember["role"] })}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                        >
                          <option value="WAITER">Waiter</option>
                          <option value="COOK">Cook</option>
                          <option value="CHEF">Chef</option>
                        </select>
                        <button
                          onClick={() => updateStaffMember(member.id, { isActive: !member.isActive })}
                          className={`min-h-9 text-xs px-3 rounded-lg font-semibold transition ${member.isActive ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => { setResetPasswordStaff(member); setResetPasswordValue(""); }}
                          aria-label={`Reset password for ${member.name}`}
                          title="Reset password"
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteStaff(member)}
                          aria-label={`Remove ${member.name}`}
                          title="Remove staff member"
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Reset Password Modal */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-90 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setResetPasswordStaff(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reset password</h3>
            <p className="text-sm text-gray-500 mb-4">Set a new password for {resetPasswordStaff.name}.</p>
            <label className="field-label">New password</label>
            <input
              type="text"
              autoFocus
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPasswordReset()}
              placeholder="Min. 8 characters, upper/lower/number/symbol"
              className="control-input mt-1 w-full"
            />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setResetPasswordStaff(null)} className="btn-soft flex-1">Cancel</button>
              <button onClick={submitPasswordReset} disabled={resettingPassword || !resetPasswordValue} className="btn-primary flex-1">
                {resettingPassword ? "Saving…" : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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
