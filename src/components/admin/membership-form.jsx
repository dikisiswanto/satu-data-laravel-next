"use client";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
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
export function MembershipForm({ organizations }) {
  const router = useRouter();
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [error, setError] = useState("");
  const [role, setRole] = useState("editor");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!beginSubmission()) return;
    setError("");
    const raw = Object.fromEntries(new FormData(form).entries());
    const payload = {
      user_email: raw.user_email.trim().toLocaleLowerCase("id-ID"),
      organization_id: ["super_admin", "data_admin", "auditor"].includes(role)
        ? null
        : raw.organization_id,
      role,
      is_active: raw.is_active === "on",
    };
    try {
      const response = await fetch("/api/v1/portal/memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        setError(
          result.error === "forbidden"
            ? "Hanya super administrator yang dapat mengubah akses. Hubungi administrator portal jika perubahan ini diperlukan."
            : result.error === "conflict"
              ? "Pengguna ini sudah memiliki peran tersebut pada organisasi yang dipilih."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Akses belum dapat disimpan. Periksa email akun yang sudah ada.",
                ),
        );
        return;
      }
      router.refresh();
      form.reset();
      delete form.dataset.userModified;
      setRole("editor");
    } catch (error) {
      markUncertain();
      setError(apiTransportFailureMessage(error));
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
      <h2 className="font-semibold">Tambahkan akses pengguna</h2>
      <p className="text-sm leading-6 text-muted">
        Masukkan email akun aktif, lalu pilih peran dan organisasi.
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {error && uncertain ? (
        <MutationStatusCheck href="/portal/pengguna" />
      ) : null}
      <div>
        <label htmlFor="user_email" className="mb-2 block text-sm font-medium">
          Email akun yang sudah ada *
        </label>
        <input
          id="user_email"
          name="user_email"
          type="email"
          className="field"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="nama@instansi.go.id"
          aria-describedby="user_email-help"
          onInvalid={(event) =>
            event.currentTarget.setCustomValidity(
              getFieldValidationMessage("email"),
            )
          }
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
        <FieldGuidance
          id="user_email-help"
          text="Gunakan email yang sama dengan akun yang sudah aktif di portal."
        />
      </div>
      <div>
        <label htmlFor="role" className="mb-2 block text-sm font-medium">
          Peran *
        </label>
        <select
          id="role"
          name="role"
          className="field"
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
      {!["super_admin", "data_admin", "auditor"].includes(role) ? (
        <div>
          <label
            htmlFor="organization_id"
            className="mb-2 block text-sm font-medium"
          >
            Organisasi *
          </label>
          <select
            id="organization_id"
            name="organization_id"
            className="field"
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
          Peran ini berlaku lintas organisasi, sehingga memberikan akses ke
          cakupan yang lebih luas.
        </p>
      )}
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked
          className="size-4 rounded border-line text-primary focus:ring-focus"
        />
        Akses aktif
      </label>
      <FieldGuidance name="is_active" id="membership-is_active-help" />
      <PendingActionButton
        type="submit"
        pending={busy}
        pendingText="Menyimpan akses…"
        disabled={uncertain}
        className="rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
      >
        Simpan akses
      </PendingActionButton>
    </form>
  );
}
