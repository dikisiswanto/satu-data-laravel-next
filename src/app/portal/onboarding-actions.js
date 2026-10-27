"use server";
import { revalidatePath } from "next/cache";
import { backendFetch } from "@/lib/backend/server";
export async function completeOnboardingAction() {
  try {
    await backendFetch("/api/v1/portal/onboarding", {
      method: "POST",
      body: "{}",
    });
  } catch (error) {
    return { error: error?.status === 401 ? "unauthenticated" : "save_failed" };
  }
  revalidatePath("/portal", "layout");
  return { success: true };
}
