"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { backendBaseUrl } from "@/lib/backend/server";
import { setFrontendToken } from "@/lib/auth/session-cookie";
import { safeReturnPath } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});
export async function loginAction(formData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/portal/login?error=invalid");
  const nextPath = safeReturnPath(formData.get("next"), "/portal");
  let response;
  try {
    response = await fetch(`${backendBaseUrl()}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch (error) {
    console.error("portal_login_backend_unavailable", {
      code: error?.code || "network_error",
    });
    redirect("/portal/login?error=unavailable");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.data?.token) {
    console.error("portal_login_failed", {
      status: response.status,
      code: payload?.error || "unknown",
    });
    redirect(
      response.status >= 500 || response.status === 429
        ? "/portal/login?error=unavailable"
        : "/portal/login?error=invalid",
    );
  }
  const cookieStore = await cookies();
  const tokenExpiresAt = payload?.data?.expires_at
    ? Date.parse(payload.data.expires_at)
    : NaN;
  const maxAge = Number.isFinite(tokenExpiresAt)
    ? Math.max(1, Math.floor((tokenExpiresAt - Date.now()) / 1000))
    : 14 * 24 * 60 * 60;
  if (maxAge <= 1) redirect("/portal/login?error=unavailable");
  setFrontendToken(cookieStore, payload.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  redirect(nextPath);
}
