"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { portalApi } from "@/lib/backend/portal-api";
import {
  isMissingAuthSession,
  isTransientAuthFailure,
} from "@/lib/backend/auth-errors";
import { invalidatePublicDatasetCache } from "@/lib/data/revalidate-public";
import { classifyBackendError } from "@/lib/backend/query-guard";
const idSchema = z.string().uuid();

async function verifyActionSession(id) {
  const verification = await getRequestVerifiedUser();
  if (verification?.error) {
    if (
      Number(verification.error.status) === 401 ||
      isMissingAuthSession(verification.error)
    ) {
      redirect("/portal/login");
    }

    // A temporary auth/backend failure must not discard the user's portal
    // context by sending them to login. Keep them on the record page instead.
    const code = isTransientAuthFailure(verification.error)
      ? "authentication_unavailable"
      : "authorization_unavailable";
    redirect(`/portal/dataset/${id}?action_error=${code}`);
  }

  if (!verification?.data?.user) redirect("/portal/login");
}

export async function submitForReviewAction(formData) {
  const id = formData.get("dataset_id");
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  await verifyActionSession(id);
  try {
    await portalApi(`datasets/${id}/workflow`, {
      method: "POST",
      body: JSON.stringify({ action: "submit_for_review" }),
    });
  } catch (error) {
    if (Number(error.status) === 401 || isMissingAuthSession(error)) {
      redirect("/portal/login");
    }
    const message = String(error.message || "").toLowerCase();
    const code = message.includes("validation_required_before_review")
      ? "validation_required"
      : message.includes("source_not_processed") ||
          message.includes("version_not_ready") ||
          message.includes("validated_source_required")
        ? "version_not_ready"
        : classifyBackendError(error);
    console.error("dataset_submit_review_failed", error.code || "unknown");
    redirect(`/portal/dataset/${id}?action_error=${code}`);
  }
  redirect(`/portal/dataset/${id}?action_success=review`);
}
export async function returnDatasetForChangesAction(formData) {
  const id = formData.get("dataset_id");
  const reason = String(formData.get("reason") || "").trim();
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  if (reason.length < 5 || reason.length > 1000) {
    redirect(`/portal/dataset/${id}?action_error=review_reason_invalid`);
  }
  await verifyActionSession(id);
  try {
    await portalApi(`datasets/${id}/workflow`, {
      method: "POST",
      body: JSON.stringify({ action: "return_for_changes", reason }),
    });
  } catch (error) {
    if (Number(error.status) === 401 || isMissingAuthSession(error)) {
      redirect("/portal/login");
    }
    const message = String(error.message || "").toLowerCase();
    const code = message.includes("review_reason_invalid")
      ? "review_reason_invalid"
      : classifyBackendError(error);
    console.error("dataset_return_for_changes_failed", error.code || "unknown");
    redirect(`/portal/dataset/${id}?action_error=${code}`);
  }
  redirect(`/portal/dataset/${id}?action_success=review_returned`);
}

export async function startDatasetVersionAction(formData) {
  const id = formData.get("dataset_id");
  const changeSummary = String(formData.get("change_summary") || "").trim();
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  if (changeSummary.length < 5 || changeSummary.length > 500) {
    redirect(`/portal/dataset/${id}?action_error=version_summary_invalid`);
  }
  await verifyActionSession(id);
  let result;
  try {
    result = await portalApi(`datasets/${id}/workflow`, {
      method: "POST",
      body: JSON.stringify({
        action: "start_version",
        change_summary: changeSummary,
      }),
    });
  } catch (error) {
    if (Number(error.status) === 401 || isMissingAuthSession(error)) {
      redirect("/portal/login");
    }
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
    `/portal/dataset/${id}?action_success=version_created&version=${encodeURIComponent(String(result?.data?.draft_version ?? ""))}`,
  );
}

export async function publishAfterValidationAction(formData) {
  const id = formData.get("dataset_id");
  if (!idSchema.safeParse(id).success) redirect("/portal/dataset");
  await verifyActionSession(id);
  try {
    await portalApi(`datasets/${id}/workflow`, {
      method: "POST",
      body: JSON.stringify({ action: "publish" }),
    });
  } catch (error) {
    if (Number(error.status) === 401 || isMissingAuthSession(error)) {
      redirect("/portal/login");
    }
    console.error("dataset_publish_failed", error.code || "unknown");
    redirect(
      `/portal/dataset/${id}?action_error=${classifyBackendError(error)}`,
    );
  }
  invalidatePublicDatasetCache();
  redirect(`/portal/dataset/${id}?action_success=publish`);
}
