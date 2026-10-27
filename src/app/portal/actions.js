"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendFetch } from "@/lib/backend/server";
export async function logoutAction() {
  try {
    await backendFetch("/api/v1/auth/logout", { method: "POST", body: "{}" });
  } catch (error) {
    if (error?.status && error.status !== 401)
      console.error("portal_logout_failed", error.code || "unknown");
  }
  const cookieStore = await cookies();
  cookieStore.delete("wajo_portal_token");
  redirect("/portal/login");
}
