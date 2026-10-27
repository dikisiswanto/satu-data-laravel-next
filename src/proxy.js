import { NextResponse } from "next/server";

const AUTH_PAGES = new Set([
  "/portal/login",
  "/portal/forgot-password",
  "/portal/reset-password",
]);

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (!pathname.startsWith("/portal/") && pathname !== "/portal")
    return NextResponse.next();
  if (AUTH_PAGES.has(pathname)) return NextResponse.next();
  const token = request.cookies.get("wajo_portal_token")?.value;
  if (token) return NextResponse.next();
  const loginUrl = new URL("/portal/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/portal/:path*", "/portal"] };
