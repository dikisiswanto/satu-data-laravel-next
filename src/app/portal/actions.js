"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend/server";
import { deleteFrontendTokenCookies } from "@/lib/auth/session-cookie";
export async function logoutAction() {
  try {
    await backendFetch("/api/v1/auth/logout", { method: "POST", body: "{}" });
  } catch (error) {
    if (error?.status && error.status !== 401)
      console.error("portal_logout_failed", error.code || "unknown");
  }
  const cookieStore = await cookies();
  deleteFrontendTokenCookies(cookieStore);
  redirect("/portal/login");
}
