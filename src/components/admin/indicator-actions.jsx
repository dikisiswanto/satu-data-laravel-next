"use client";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import { ReturnForChangesForm } from "@/components/admin/return-for-changes-form";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
export function IndicatorActions({
  id,
  status,
  canEdit = false,
  canSubmit = false,
  canReview = false,
  canArchive = false,
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
        title: "Terbitkan indikator?",
        description:
          "Indikator ini akan ditampilkan di portal publik setelah diterbitkan.",
        confirmLabel: "Terbitkan",
      }))
    )
      return;
    if (
      action === "archive" &&
      !(await confirm({
        title: "Arsipkan indikator?",
        description:
          "Indikator tidak lagi ditampilkan di portal publik. Riwayatnya tetap tersimpan.",
        confirmLabel: "Arsipkan indikator",
        variant: "danger",
      }))
    )
      return;
    if (!beginSubmission()) return;
    setPendingAction(action);
    setError("");
    try {
      const response = await fetch(`/api/v1/portal/indicators/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setError(
          result.error === "forbidden"
            ? "Akun Anda belum memiliki akses untuk melakukan tindakan ini."
            : apiErrorMessage(
                result.error,
                response.status,
                "Perubahan belum terkonfirmasi. Periksa status indikator sebelum mencoba lagi.",
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
      {status === "draft" ? (
        <>
          {canEdit ? (
            <Link
              href={`/portal/statistik/${id}/edit`}
              className="rounded-control border px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ubah
            </Link>
          ) : null}
          {canSubmit ? (
            <PendingActionButton
              onClick={() => act("submit_for_review")}
              pending={pendingAction === "submit_for_review"}
              pendingText="Mengajukan pemeriksaan…"
              disabled={busy || uncertain}
              className="rounded-control bg-primary px-3 py-2 text-sm font-semibold text-white"
            >
              Ajukan pemeriksaan
            </PendingActionButton>
          ) : null}
        </>
      ) : null}
      {status === "review" ? (
        <>
          {canEdit ? (
            <Link
              href={`/portal/statistik/${id}/edit`}
              className="rounded-control border px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Ubah
            </Link>
          ) : null}
          {canReview ? (
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
          {canReview ? (
            <PendingActionButton
              onClick={() => {
                setShowReturnForm((shown) => !shown);
                setError("");
              }}
              disabled={busy || uncertain}
              className="rounded-control border px-3 py-2 text-sm font-medium"
            >
              {showReturnForm ? "Tutup catatan" : "Kembalikan"}
            </PendingActionButton>
          ) : null}
        </>
      ) : null}
      {showReturnForm && status === "review" && canReview ? (
        <ReturnForChangesForm
          pending={pendingAction === "return_for_changes"}
          disabled={uncertain}
          pendingText="Mengembalikan indikator…"
          onSubmit={(reason) => act("return_for_changes", reason)}
          onCancel={() => {
            setShowReturnForm(false);
            setError("");
          }}
        />
      ) : null}
      {status !== "archived" && status !== "published" && canArchive ? (
        <PendingActionButton
          onClick={() => act("archive")}
          pending={pendingAction === "archive"}
          pendingText="Mengarsipkan…"
          disabled={busy || uncertain}
          className="rounded-control border px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50"
        >
          Arsipkan
        </PendingActionButton>
      ) : null}
      {error ? (
        <div className="basis-full text-xs text-red-700">
          <p role="alert">{error}</p>
          {uncertain ? <MutationStatusCheck href="/portal/statistik" /> : null}
        </div>
      ) : null}
      <ConfirmationDialog dialog={dialog} onResolve={resolveDialog} />
    </div>
  );
}
