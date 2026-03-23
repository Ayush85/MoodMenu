import { NextRequest, NextResponse } from "next/server";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || "menuor.com";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();

  // Only handle subdomain routing
  // Skip if it's the root domain, www, localhost, or IP address
  if (
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}` ||
    host.startsWith("localhost") ||
    host.startsWith("192.168.") ||
    host.startsWith("127.0.0.1") ||
    !host.includes(".")
  ) {
    return NextResponse.next();
  }

  // Extract subdomain: "momo-house.menuor.com" → "momo-house"
  const subdomain = host.replace(`.${ROOT_DOMAIN}`, "").split(":")[0];

  // Skip if subdomain looks like something else (api, admin, etc.)
  if (!subdomain || subdomain === "www" || subdomain === "api") {
    return NextResponse.next();
  }

  // Only rewrite the root path and paths that don't start with _next, api, etc.
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/menu/")
  ) {
    return NextResponse.next();
  }

  // Rewrite: slug.menuor.com → menuor.com/menu/slug
  // Preserve query params (table, wifi, etc.)
  url.pathname = `/menu/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon|.*\\.).*)"],
};
