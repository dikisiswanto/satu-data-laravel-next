"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";

export function DatasetVersionAbandonAction({ datasetId, version }) {
  const { pending, begin, finish, isLocked, uncertain, markUncertain } =
    useSubmissionLock();
  const [error, setError] = useState("");
  const router = useRouter();
  const { confirm, dialog, resolveDialog } = useConfirmationDialog();

  async function abandonVersion() {
    if (isLocked()) return;
    const confirmed = await confirm({
      title: `Batalkan versi ${version}?`,
      description:
        "Versi publik yang sedang aktif tidak berubah. Versi ini tetap tercatat pada riwayat sebagai dibatalkan.",
      confirmLabel: "Batalkan versi",
      variant: "danger",
    });
    if (!confirmed || !begin()) return;

    setError("");
    try {
      const response = await fetch(
        `/api/v1/portal/datasets/${datasetId}/workflow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abandon_version" }),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        if (result.error === "conversion_already_pending") {
          setError(
            "Versi ini masih diperiksa atau diproses. Tunggu sampai selesai sebelum membatalkannya.",
          );
        } else if (
          result.error === "version_not_abandonable" ||
          result.error === "version_not_in_progress"
        ) {
          setError(
            "Versi ini sudah berubah dan tidak dapat dibatalkan sekarang. Muat ulang halaman untuk melihat status terbaru.",
          );
        } else {
          setError(
            apiErrorMessage(
              result.error,
              response.status,
              "Versi belum dapat dibatalkan. Periksa statusnya lalu coba lagi jika tindakan ini masih tersedia.",
            ),
          );
        }
        return;
      }
      router.push(
        `/portal/dataset/${datasetId}?action_success=version_abandoned`,
      );
      router.refresh();
    } catch (requestError) {
      markUncertain();
      setError(apiTransportFailureMessage(requestError));
    } finally {
      finish();
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <PendingActionButton
        onClick={abandonVersion}
        pending={pending}
        pendingText="Membatalkan versi…"
        disabled={uncertain}
        className="w-full rounded-control border border-line px-4 py-3 text-sm font-semibold text-muted hover:bg-slate-50"
      >
        Batalkan versi yang sedang disiapkan
      </PendingActionButton>
      {error ? (
        <div className="mt-2 text-xs text-red-700">
          <p role="alert">{error}</p>
          {uncertain ? (
            <MutationStatusCheck href={`/portal/dataset/${datasetId}`} />
          ) : null}
        </div>
      ) : null}
      <ConfirmationDialog dialog={dialog} onResolve={resolveDialog} />
    </div>
  );
}
