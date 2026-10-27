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
export function MembershipStatusAction({ membership }) {
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
  async function toggle() {
    if (isLocked()) return;
    const next = !membership.is_active;
    if (
      !next &&
      !(await confirm({
        title: "Nonaktifkan akses pengguna?",
        description:
          "Pengguna tidak lagi bisa masuk melalui akses ini. Riwayat aktivitas sebelumnya tetap tersimpan.",
        confirmLabel: "Nonaktifkan akses",
        variant: "danger",
      }))
    )
      return;
    if (!beginSubmission()) return;
    setError("");
    try {
      const response = await fetch(`/api/v1/portal/memberships/${membership.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: membership.user_id,
          organization_id: membership.organization_id,
          role: membership.role,
          is_active: next,
        }),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setError(
          result.error === "forbidden"
            ? "Akun Anda belum memiliki akses untuk mengubah pengaturan ini."
            : apiErrorMessage(
                result.error,
                response.status,
                "Perubahan akses belum terkonfirmasi. Periksa daftar pengguna sebelum mencoba lagi.",
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
    }
  }
  return (
    <div className="flex flex-col items-end gap-2" aria-busy={busy}>
      <PendingActionButton
        onClick={toggle}
        pending={busy}
        pendingText="Memperbarui akses…"
        disabled={uncertain}
        className="rounded-control border px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        {membership.is_active ? "Nonaktifkan" : "Aktifkan"}
      </PendingActionButton>
      {error ? (
        <div className="text-xs text-red-700">
          <p role="alert">{error}</p>
          {uncertain ? <MutationStatusCheck href="/portal/pengguna" /> : null}
        </div>
      ) : null}
      <ConfirmationDialog dialog={dialog} onResolve={resolveDialog} />
    </div>
  );
}
