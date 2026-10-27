"use client";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import {
  FieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";
import { useState } from "react";
export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [message, setMessage] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setConfirmError("Konfirmasi harus sama persis dengan kata sandi baru.");
      setMessage({
        error: true,
        text: "Kata sandi yang diketik belum sama. Periksa kedua kolom.",
      });
      document.getElementById("confirm-password")?.focus();
      return;
    }
    setConfirmError("");
    if (!beginSubmission()) return;
    try {
      const response = await fetch("/api/v1/portal/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, password }),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setMessage({
          error: true,
          text:
            result.error === "validation_failed" && result.errors?.current_password
              ? "Kata sandi saat ini tidak benar. Periksa kembali lalu coba lagi."
              : result.error === "validation_failed"
              ? "Kata sandi baru harus minimal 12 karakter, berisi huruf besar, huruf kecil, angka, dan berbeda dari kata sandi saat ini."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Kata sandi belum berubah. Masuk kembali jika sesi sudah berakhir, lalu coba lagi.",
                ),
        });
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setConfirmError("");
      setMessage({
        error: false,
        text: result.data.auditRecorded
          ? "Kata sandi berhasil diperbarui."
          : "Kata sandi sudah diperbarui, tetapi perubahan ini belum tercatat di riwayat. Hubungi administrator portal agar catatannya dapat diperiksa.",
      });
    } catch (error) {
      markUncertain();
      setMessage({ error: true, text: apiTransportFailureMessage(error) });
    } finally {
      finishSubmission();
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="mt-8 portal-form-section"
    >
      <h2 className="font-semibold">Ubah kata sandi</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        Gunakan kata sandi unik minimal 12 karakter, dengan huruf besar, huruf
        kecil, dan angka.
      </p>
      {message ? (
        <p
          role={message.error ? "alert" : "status"}
          className={`mt-4 rounded-control border p-3 text-sm ${message.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {message.text}
        </p>
      ) : null}
      {message?.error && uncertain ? (
        <MutationStatusCheck href="/portal/pengaturan" />
      ) : null}
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="current-password" className="mb-2 block text-sm font-medium">
            Kata sandi saat ini
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className="field"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            maxLength={72}
            required
          />
        </div>
        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-sm font-medium"
          >
            Kata sandi baru
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            className="field"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (confirmError && e.target.value === confirm)
                setConfirmError("");
            }}
            minLength={12}
            maxLength={72}
            required
            aria-describedby="new-password-help"
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                getFieldValidationMessage("new-password"),
              )
            }
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
          <FieldGuidance name="new-password" id="new-password-help" />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-sm font-medium"
          >
            Konfirmasi kata sandi
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            className={`field${confirmError ? " border-red-600 focus-visible:ring-red-600" : ""}`}
            value={confirm}
            aria-invalid={confirmError ? "true" : undefined}
            onChange={(e) => {
              setConfirm(e.target.value);
              setConfirmError(
                e.target.value && e.target.value !== password
                  ? "Konfirmasi harus sama persis dengan kata sandi baru."
                  : "",
              );
            }}
            minLength={12}
            maxLength={72}
            required
            aria-describedby={
              confirmError
                ? "confirm-password-help confirm-password-error"
                : "confirm-password-help"
            }
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                getFieldValidationMessage("confirm-password"),
              )
            }
            onInput={(event) => event.currentTarget.setCustomValidity("")}
          />
          <FieldGuidance name="confirm-password" id="confirm-password-help" />
          {confirmError ? (
            <p
              id="confirm-password-error"
              role="alert"
              className="mt-1.5 text-xs leading-5 text-red-700"
            >
              {confirmError}
            </p>
          ) : null}
        </div>
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Memperbarui kata sandi…"
          disabled={uncertain}
          className="rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          Perbarui kata sandi
        </PendingActionButton>
      </div>
    </form>
  );
}
