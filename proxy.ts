import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "office_booking_session";

const protectedRoutes = [
  "/dashboard",
  "/book",
  "/my-bookings",
  "/approvals",
  "/approval-history",
  "/location-management",
  "/space-management",
  "/floor-map-management",
];

const publicRoutes = ["/login"];

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isSignedIn = Boolean(sessionCookie);

  if (isProtectedRoute(pathname) && !isSignedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute(pathname) && isSignedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/book/:path*",
    "/my-bookings/:path*",
    "/approvals/:path*",
    "/approval-history/:path*",
    "/location-management/:path*",
    "/space-management/:path*",
    "/floor-map-management/:path*",
    "/login",
  ],
};