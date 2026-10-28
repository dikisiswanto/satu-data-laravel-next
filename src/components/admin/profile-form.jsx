"use client";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import {
  FieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";
export function ProfileForm({ displayName }) {
  const [name, setName] = useState(displayName || "");
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [message, setMessage] = useState(null);
  const router = useRouter();
  async function submit(event) {
    event.preventDefault();
    if (!beginSubmission()) return;
    setMessage(null);
    try {
      const response = await fetch("/api/v1/portal/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ display_name: name }),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setMessage({
          error: true,
          text:
            result.error === "profile_not_provisioned"
              ? "Profil belum tersedia. Hubungi administrator."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Profil belum dapat disimpan.",
                ),
        });
        return;
      }
      setMessage({ error: false, text: "Nama tampilan sudah diperbarui." });
      router.refresh();
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
      className="mt-6 space-y-4 portal-form-section"
    >
      {message ? (
        <p
          role={message.error ? "alert" : "status"}
          className={`rounded-control border p-3 text-sm ${message.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {message.text}
        </p>
      ) : null}
      {message?.error && uncertain ? (
        <MutationStatusCheck href="/portal/pengaturan" />
      ) : null}
      <div>
        <label
          htmlFor="display_name"
          className="mb-2 block text-sm font-medium"
        >
          Nama tampilan
        </label>
        <input
          id="display_name"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
          aria-describedby="display_name-help"
          onInvalid={(event) =>
            event.currentTarget.setCustomValidity(
              getFieldValidationMessage("display_name"),
            )
          }
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
        <FieldGuidance name="display_name" id="display_name-help" />
      </div>
      <PendingActionButton
        type="submit"
        pending={busy}
        pendingText="Menyimpan perubahan…"
        disabled={uncertain || name.trim() === displayName}
        className="rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        <span className="inline-flex items-center gap-2">
          <Save size={16} aria-hidden="true" />
          Simpan perubahan
        </span>
      </PendingActionButton>
    </form>
  );
}
