"use client";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useRouter } from "next/navigation";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import { ReturnForChangesForm } from "@/components/admin/return-for-changes-form";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
export function ReviewActions({
  id,
  status,
  canPublish = false,
  canReturn = false,
}) {
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    isLocked,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [showReturnForm, setShowReturnForm] = useState(false);
  const { confirm, dialog, resolveDialog } = useConfirmationDialog();
  const router = useRouter();
  async function act(action, reason = "") {
    if (isLocked()) return;
    if (
      action === "publish" &&
      !(await confirm({
        title: "Terbitkan dataset?",
        description:
          "Setelah diterbitkan, dataset ini akan dapat ditemukan dan diunduh oleh pengunjung portal publik. Tinjau metadata, sumber, lisensi, dan hasil konversinya sebelum melanjutkan.",
        confirmLabel: "Terbitkan dataset",
      }))
    )
      return;
    if (!beginSubmission()) return;
    setPendingAction(action);
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
          body: JSON.stringify({ action, reason }),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setError(
          result.error === "forbidden"
            ? "Akun Anda belum memiliki akses untuk melakukan tindakan ini. Hubungi administrator portal jika Anda memerlukan akses."
            : result.error === "validation_failed"
              ? "Dataset belum siap diterbitkan. Periksa kolom yang ditandai dan berkas sumber, lalu ajukan kembali setelah diperbaiki."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Tindakan belum selesai. Periksa status dataset dan catatan pemeriksaannya sebelum mencoba lagi.",
                ),
        );
        return;
      }
      router.refresh();
    } catch (error) {
      markUncertain();
      setError(apiTransportFailureMessage(error));
    } finally {
      finishSubmission();
      setPendingAction("");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={busy}>
      {status === "review" && canReturn ? (
        <PendingActionButton
          onClick={() => {
            setShowReturnForm((shown) => !shown);
            setError("");
          }}
          disabled={busy || uncertain}
          className="rounded-control border px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          {showReturnForm ? "Tutup catatan" : "Kembalikan untuk perbaikan"}
        </PendingActionButton>
      ) : null}
      {status === "review" && canPublish ? (
        <PendingActionButton
          onClick={() => act("publish")}
          pending={pendingAction === "publish"}
          pendingText="Memublikasikan…"
          disabled={busy || uncertain}
          className="rounded-control bg-primary px-3 py-2 text-sm font-semibold text-white"
        >
          Terbitkan
        </PendingActionButton>
      ) : null}
      {showReturnForm ? (
        <ReturnForChangesForm
          pending={pendingAction === "return_for_changes"}
          disabled={uncertain}
          pendingText="Mengembalikan untuk perbaikan…"
          onSubmit={(reason) => act("return_for_changes", reason)}
          onCancel={() => {
            setShowReturnForm(false);
            setError("");
          }}
        />
      ) : null}
      {error ? (
        <div className="basis-full text-xs text-red-700">
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
