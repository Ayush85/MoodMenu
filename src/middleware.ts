import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { isPlatformHost } from "@/lib/site-host";
import { hasVerifiedCustomDomain } from "@/lib/restaurant-site";

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|llms.txt|api/|uploads/).*)",
  ],
};

// Routes that need a signed-in user. The layouts also call auth(), but a layout
// does not re-render on client-side navigation, so after logout (or session
// expiry) the old page keeps working until a full reload. Checking here covers
// every navigation, including RSC and prefetch requests.
function isPrivatePath(pathname: string): boolean {
  return ["/dashboard", "/admin", "/staff"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

// Optimistic check only: verifies the session JWT signature and expiry, with
// no database call. Role and isActive are still enforced by auth() in layouts
// and API routes.
async function hasValidSession(request: NextRequest): Promise<boolean> {
  const secure =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: secure,
  });
  return typeof token?.id === "string" && token.id.length > 0;
}

export async function middleware(request: NextRequest) {
  if (isPrivatePath(request.nextUrl.pathname) && !(await hasValidSession(request))) {
    // Relative Location: request.url can carry an internal host behind the proxy.
    return new NextResponse(null, {
      status: 307,
      headers: { Location: "/login", "Cache-Control": "no-store" },
    });
  }

  const hostHeader = request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (!hostname || isPlatformHost(hostname)) {
    return NextResponse.next();
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { customDomain: hostname },
    select: { id: true, slug: true, customDomain: true, domainVerifiedAt: true, landingEnabled: true },
  });

  if (!restaurant || !hasVerifiedCustomDomain(restaurant)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  if (pathname === "/") {
    url.pathname = restaurant.landingEnabled ? `/landing/${restaurant.slug}` : `/menu/${restaurant.slug}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/menu") {
    url.pathname = `/menu/${restaurant.slug}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/staff" || pathname.startsWith("/staff/")) {
    if (pathname === "/admin") {
      // /dashboard/restaurant/[id] has no index page of its own — send the
      // bare /admin somewhere real instead of a route that 404s.
      url.pathname = `/dashboard/restaurant/${restaurant.id}/menu`;
    } else if (pathname.startsWith("/admin/")) {
      url.pathname = pathname.replace(/^\/admin/, `/dashboard/restaurant/${restaurant.id}`);
    } else {
      url.pathname = pathname.replace(/^\/staff/, `/dashboard/restaurant/${restaurant.id}/staff`);
    }
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
