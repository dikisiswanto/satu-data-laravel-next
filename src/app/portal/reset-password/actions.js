"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { backendFetch } from "@/lib/backend/server";
const schema = z.object({ token: z.string().min(16).max(512), email: z.string().trim().email().max(254), password: z.string().min(12).max(128), confirm_password: z.string().min(12).max(128) }).refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Konfirmasi tidak cocok." });
export async function resetPasswordAction(formData) {
  const parsed = schema.safeParse({ token: formData.get("token"), email: formData.get("email"), password: formData.get("password"), confirm_password: formData.get("confirm_password") });
  if (!parsed.success) redirect("/portal/reset-password?error=validation");
  try {
    await backendFetch("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token: parsed.data.token, email: parsed.data.email, password: parsed.data.password, password_confirmation: parsed.data.confirm_password }) });
  } catch (error) {
    const status = error?.status;
    console.error("password_reset_failed", { status: status || null, code: error?.code || "unknown" });
    redirect(status >= 500 ? "/portal/reset-password?error=unavailable" : "/portal/reset-password?error=save");
  }
  redirect("/portal/login?reset=1");
}
