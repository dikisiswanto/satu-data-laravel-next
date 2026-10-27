import { NextResponse } from "next/server";
import { getPublicSiteOrigin } from "@/lib/site-config";

/**
 * The previous Supabase PKCE callback is intentionally retired. The Laravel
 * backend authenticates by email/password and short-lived Sanctum tokens; an
 * old Supabase OAuth code must never be mistaken for a Laravel session.
 */
export async function GET(request) {
  const origin = getPublicSiteOrigin() || new URL(request.url).origin;
  return NextResponse.redirect(
    new URL("/portal/login?error=configuration", origin),
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
