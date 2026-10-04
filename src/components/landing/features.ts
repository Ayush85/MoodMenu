import { BellRing, ClipboardList, CloudSun, Globe, QrCode, Users } from "lucide-react";

export const features = [
  { icon: QrCode, title: "Digital menu", text: "Organize dishes into categories with photos and prices. Choose a layout, then share the menu with a QR code or a link." },
  { icon: ClipboardList, title: "Table ordering", text: "Guests order from a table-specific QR link. Staff follow each order from new to preparing, served, and paid on one order board." },
  { icon: BellRing, title: "Waiter calls", text: "Guests can call a waiter from the menu. Your team sees each request and acknowledges it from the dashboard." },
  { icon: Users, title: "Staff and analytics", text: "Create accounts for waiters, cooks, and chefs with their own access. Review sales analytics and record restaurant expenses." },
  { icon: Globe, title: "Restaurant website", text: "Publish a landing page and connect your own domain, so guests can find your restaurant and open the menu." },
  { icon: CloudSun, title: "Weather and time themes", text: "Set rules that change the menu theme and featured dishes by weather and time of day, such as warm drinks on a rainy evening." },
];
