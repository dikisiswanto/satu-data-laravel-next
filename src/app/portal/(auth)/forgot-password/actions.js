"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { backendFetch } from "@/lib/backend/server";
const schema = z.object({ email: z.string().trim().email().max(254) });
export async function forgotPasswordAction(formData) {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/portal/forgot-password?sent=1");
  try {
    await backendFetch("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    console.error("password_reset_request_failed", {
      status: error?.status || null,
      code: error?.code || "unknown",
    });
  }
  // Always show the same response to avoid revealing whether an account exists.
  redirect("/portal/forgot-password?sent=1");
}
