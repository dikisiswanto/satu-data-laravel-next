"use client";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
export function DatasetArchiveAction({ id, status }) {
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    isLocked,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [error, setError] = useState("");
  const router = useRouter();
  const { confirm, dialog, resolveDialog } = useConfirmationDialog();
  async function archive() {
    if (isLocked()) return;
    if (
      !(await confirm({
        title: "Arsipkan dataset?",
        description:
          "Setelah diarsipkan, dataset tidak lagi tampil di katalog publik. Riwayat dan berkasnya tetap tersimpan di portal.",
        confirmLabel: "Arsipkan dataset",
        variant: "danger",
      }))
    )
      return;
    if (!beginSubmission()) return;
    setError("");
    try {
      const response = await fetch(
        `/api/v1/portal/datasets/${encodeURIComponent(id)}/workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action: "archive" }),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setError(
          result.error === "forbidden"
            ? "Akun Anda belum memiliki akses untuk mengarsipkan dataset ini. Hubungi administrator portal jika diperlukan."
            : apiErrorMessage(
                result.error,
                response.status,
                "Dataset belum dapat diarsipkan. Periksa statusnya, lalu coba lagi.",
              ),
        );
        return;
      }
      router.push("/portal/dataset?status=archived");
    } catch (error) {
      markUncertain();
      setError(apiTransportFailureMessage(error));
    } finally {
      finishSubmission();
    }
  }
  // Match the backend workflow contract: archived and in-review datasets
  // cannot be archived directly. Hide unsupported actions rather than expose
  // a button that can only return a validation error.
  if (!["draft", "published"].includes(status)) return null;
  return (
    <div className="mt-4 border-t pt-4">
      <PendingActionButton
        onClick={archive}
        pending={busy}
        pendingText="Mengarsipkan dataset…"
        disabled={uncertain}
        className="w-full rounded-control border border-line px-4 py-3 text-sm font-semibold text-muted hover:bg-slate-50"
      >
        Arsipkan dataset
      </PendingActionButton>
      {error ? (
        <div className="mt-2 text-xs text-red-700">
          <p role="alert">{error}</p>
          {uncertain ? (
            <MutationStatusCheck href={`/portal/dataset/${id}`} />
          ) : null}
        </div>
      ) : null}
      <ConfirmationDialog dialog={dialog} onResolve={resolveDialog} />
    </div>
  );
}
