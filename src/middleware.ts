import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPlatformHost } from "@/lib/site-host";
import { hasVerifiedCustomDomain } from "@/lib/restaurant-site";

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|api/|uploads/).*)",
  ],
};

export async function middleware(request: NextRequest) {
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

    // Signals to src/app/dashboard/restaurant/[id]/layout.tsx that this
    // dashboard render is being served as this restaurant's own tenant PWA
    // (installed from its custom domain), so it should use the
    // restaurant's own logo/name in the manifest instead of the generic
    // Menuor one used when an owner browses /dashboard on the main app.
    const tenantHeaders = new Headers(request.headers);
    tenantHeaders.set("x-menuor-tenant-id", restaurant.id);
    return NextResponse.rewrite(url, { request: { headers: tenantHeaders } });
  }

  return NextResponse.next();
}
