/**
 * Single source of truth for the public product page copy that is also
 * emitted as structured data (JSON-LD) and in /llms.txt. Keeping one copy
 * guarantees the visible text, the schema, and the AI-facing summary never
 * drift apart, which search engines treat as a quality signal.
 */

export const PRODUCT_NAME = "Menuor";

export const PRODUCT_TAGLINE = "QR digital menu and restaurant management software for restaurants and cafés in Nepal";

/** A direct, self-contained definition: the passage AI answer engines are most likely to quote. */
export const PRODUCT_DEFINITION =
  "Menuor is restaurant management software built around a QR code digital menu. Restaurants and cafés in Nepal use it to publish menus, take table orders from guests' phones, handle waiter calls, manage staff roles, record expenses, and review sales analytics, without guests installing an app.";

export const FEATURE_LIST = [
  "QR code digital menu with categories, photos, and prices",
  "Table-specific QR codes for guest ordering",
  "Live order board: new, preparing, served, paid",
  "Waiter call requests from the guest menu",
  "Staff accounts for waiters, cooks, and chefs",
  "Sales analytics and expense tracking",
  "Restaurant landing page with custom domain support",
  "Weather and time-of-day menu themes",
];

export const FAQ_ITEMS: ReadonlyArray<readonly [question: string, answer: string]> = [
  ["What is Menuor?", PRODUCT_DEFINITION],
  ["Do guests need to download an app?", "No. Guests scan the table QR code with their phone camera and open the menu in their browser. They can browse dishes without creating an account."],
  ["Can I update my menu without printing a new QR code?", "Yes. Changes to dishes, prices, photos, and availability appear on your online menu. You can keep using the same QR code for menu updates."],
  ["How does table ordering work?", "Guests open a table-specific QR link, add dishes, and submit their order. Staff manage it in the dashboard and update its status through service. Restaurants can also configure network restrictions for ordering."],
  ["Is Menuor suitable for restaurants and cafés in Nepal?", "Yes. Menuor supports menu prices in Nepalese rupees, table QR codes, staff accounts, and restaurant locations. Guests access the menu through a web browser."],
  ["Can I use my own branding and domain?", "Yes. Customize your menu’s colors, fonts, and layout, create a restaurant landing page, and connect your domain after setup and verification."],
  ["Is Menuor a full restaurant management system or only a digital menu?", "It is both. The QR digital menu is what guests see. Behind it, Menuor gives your team an order board, staff roles, waiter call notifications, expense records, and sales analytics, so a small restaurant does not need separate tools for each job."],
  ["Which staff roles does Menuor support?", "Owners can create separate accounts for waiters, cooks, and chefs, and control what each role can access in the restaurant dashboard."],
];
