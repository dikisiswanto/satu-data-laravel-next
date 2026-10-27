"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { invalidatePublicDatasetCache } from "@/lib/data/revalidate-public";
import { classifyBackendError } from "@/lib/backend/query-guard";
const idSchema = z.string().uuid();
export async function submitForReviewAction(formData) {
  const id = formData.get("dataset_id");
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { error } = await supabase.rpc("submit_dataset_for_review", {
    p_dataset_id: id,
  });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    const code =
      message.includes("version_not_ready") ||
      message.includes("validated_source_required")
        ? "version_not_ready"
        : classifyBackendError(error);
    console.error("dataset_submit_review_failed", error.code || "unknown");
    redirect(`/portal/dataset/${id}?action_error=${code}`);
  }
  redirect(`/portal/dataset/${id}?action_success=review`);
}
export async function startDatasetVersionAction(formData) {
  const id = formData.get("dataset_id");
  const changeSummary = String(formData.get("change_summary") || "").trim();
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  if (changeSummary.length < 5 || changeSummary.length > 500) {
    redirect(`/portal/dataset/${id}?action_error=version_summary_invalid`);
  }
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: version, error } = await supabase.rpc("start_dataset_version", {
    p_dataset_id: id,
    p_change_summary: changeSummary,
  });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    const code =
      error.code === "23505" || message.includes("version_in_progress")
        ? "version_in_progress"
        : message.includes("permission_denied") || error.code === "42501"
          ? "forbidden"
          : message.includes("version_requires_published_dataset")
            ? "version_requires_published_dataset"
            : "service_unavailable";
    console.error("dataset_version_start_failed", error.code || "unknown");
    redirect(`/portal/dataset/${id}?action_error=${code}`);
  }
  redirect(
    `/portal/dataset/${id}?action_success=version_created&version=${encodeURIComponent(String(version))}`,
  );
}

export async function publishAfterValidationAction(formData) {
  const id = formData.get("dataset_id");
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { error } = await supabase.rpc("publish_dataset_after_validation", {
    p_dataset_id: id,
  });
  if (error) {
    console.error("dataset_publish_failed", error.code || "unknown");
    redirect(
      `/portal/dataset/${id}?action_error=${classifyBackendError(error)}`,
    );
  }
  invalidatePublicDatasetCache();
  redirect(`/portal/dataset/${id}?action_success=publish`);
}
