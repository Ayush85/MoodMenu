export type ActorType = "USER" | "STAFF";
export type StaffRole = "WAITER" | "COOK" | "CHEF";
export type OrderStatus = "NEW" | "PREPARING" | "SERVED" | "PAID" | "CANCELED";

export interface RestaurantTableData {
  id: string;
  number: number;
  label: string | null;
}

export interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
}

export interface OrderLine {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderTicket {
  id: string;
  status: OrderStatus;
  note: string | null;
  total: number;
  createdAt: string;
  table: RestaurantTableData;
  items: OrderLine[];
}

export interface WaiterCall {
  id: string;
  tableNumber: number;
  tableLabel: string | null;
  message: string | null;
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: string;
}

export interface RawWaiterCall {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  table: RestaurantTableData;
}
