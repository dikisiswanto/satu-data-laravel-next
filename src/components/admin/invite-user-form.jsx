"use client";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import {
  FieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";
const roles = [
  ["admin_opd", "Administrator OPD"],
  ["reviewer", "Pemeriksa data"],
  ["editor", "Editor data"],
  ["viewer", "Pembaca"],
  ["data_admin", "Administrator data"],
  ["auditor", "Auditor"],
  ["super_admin", "Super administrator"],
];
export function InviteUserForm({ organizations }) {
  const router = useRouter();
  const [role, setRole] = useState("editor");
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
    const form = event.currentTarget;
    if (!beginSubmission()) return;
    setMessage(null);
    const raw = Object.fromEntries(new FormData(form).entries());
    const payload = {
      email: raw.email,
      display_name: raw.display_name,
      role,
      organization_id: ["data_admin", "auditor", "super_admin"].includes(role)
        ? null
        : raw.organization_id,
    };
    try {
      const response = await fetch("/api/v1/portal/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500 || result.invitation_sent) markUncertain();
        setMessage({
          type: "error",
          text: result.invitation_sent
            ? `Undangan terkirim, tetapi akses belum berhasil diberikan. Hubungi administrator untuk menyelesaikannya.`
            : result.error === "forbidden"
              ? "Hanya super administrator yang dapat mengundang pengguna."
              : result.error === "user_invitation_not_configured"
                ? "Fitur undangan belum siap digunakan. Hubungi pengelola portal agar dapat diaktifkan."
                : result.error === "email_already_registered"
                  ? "Email ini sudah terdaftar. Atur akses pengguna melalui formulir di bawah."
                  : apiErrorMessage(
                      result.error,
                      response.status,
                      "Undangan belum berhasil dibuat.",
                    ),
        });
        return;
      }
      setMessage({
        type: "success",
        text: `Undangan dikirim ke ${result.data.email}.`,
      });
      form.reset();
      delete form.dataset.userModified;
      setRole("editor");
      router.refresh();
    } catch (error) {
      markUncertain();
      setMessage({ type: "error", text: apiTransportFailureMessage(error) });
    } finally {
      finishSubmission();
    }
  }
  return (
    <form
      onSubmit={submit}
      onInputCapture={(event) => {
        event.currentTarget.dataset.userModified = "true";
      }}
      onChangeCapture={(event) => {
        event.currentTarget.dataset.userModified = "true";
      }}
      aria-busy={busy}
      className="w-full space-y-4 portal-form-card p-5"
    >
      <h2 className="font-semibold">Undang pengguna</h2>
      {message ? (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-control border p-3 text-sm ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {message.text}
        </p>
      ) : null}
      {message?.type === "error" && uncertain ? (
        <MutationStatusCheck href="/portal/pengguna" />
      ) : null}
      <div>
        <label
          htmlFor="display_name"
          className="mb-2 block text-sm font-medium"
        >
          Nama pengguna *
        </label>
        <input
          className="field"
          id="display_name"
          name="display_name"
          required
          minLength={2}
          maxLength={120}
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
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Alamat email *
        </label>
        <input
          className="field"
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          aria-describedby="email-help"
          onInvalid={(event) =>
            event.currentTarget.setCustomValidity(
              getFieldValidationMessage("email"),
            )
          }
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
        <FieldGuidance name="email" id="email-help" />
      </div>
      <div>
        <label htmlFor="role" className="mb-2 block text-sm font-medium">
          Peran akses *
        </label>
        <select
          className="field"
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-describedby="role-help"
        >
          {roles.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldGuidance name="role" id="role-help" />
      </div>
      {!["data_admin", "auditor", "super_admin"].includes(role) ? (
        <div>
          <label
            htmlFor="organization_id"
            className="mb-2 block text-sm font-medium"
          >
            Organisasi penanggung jawab *
          </label>
          <select
            className="field"
            id="organization_id"
            name="organization_id"
            required
            defaultValue={organizations.length === 1 ? organizations[0].id : ""}
            aria-describedby="organization_id-help"
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                getFieldValidationMessage("organization_id"),
              )
            }
            onChange={(event) => event.currentTarget.setCustomValidity("")}
          >
            <option value="" disabled>
              Pilih organisasi
            </option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <FieldGuidance name="organization_id" id="organization_id-help" />
        </div>
      ) : (
        <p className="rounded-control bg-slate-50 p-3 text-sm text-muted">
          Peran global berlaku lintas organisasi. Berikan hanya jika diperlukan.
        </p>
      )}
      <PendingActionButton
        type="submit"
        pending={busy}
        pendingText="Mengirim undangan…"
        disabled={uncertain}
        className="rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        <span className="inline-flex items-center gap-2">
          <Send size={16} aria-hidden="true" />
          Kirim undangan
        </span>
      </PendingActionButton>
    </form>
  );
}
