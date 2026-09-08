import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|api/|uploads/).*)",
  ],
};

function getPlatformHostname(): string {
  try {
    return new URL(process.env.APP_BASE_URL || "https://menuor.com").hostname.toLowerCase();
  } catch {
    return "menuor.com";
  }
}

function isPlatformHost(hostname: string): boolean {
  const platformHost = getPlatformHostname();
  return (
    hostname === platformHost ||
    hostname === `www.${platformHost}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") || "";
  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (!hostname || isPlatformHost(hostname)) {
    return NextResponse.next();
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { customDomain: hostname },
    select: { id: true, slug: true },
  });

  if (!restaurant) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  if (pathname === "/") {
    url.pathname = `/menu/${restaurant.slug}`;
    return NextResponse.rewrite(url);
  }

  if (pathname === "/admin") {
    // /dashboard/restaurant/[id] has no index page of its own — send the
    // bare /admin somewhere real instead of a route that 404s.
    url.pathname = `/dashboard/restaurant/${restaurant.id}/menu`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/admin/")) {
    url.pathname = pathname.replace(/^\/admin/, `/dashboard/restaurant/${restaurant.id}`);
    return NextResponse.rewrite(url);
  }

  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    url.pathname = pathname.replace(/^\/staff/, `/dashboard/restaurant/${restaurant.id}/staff`);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
