"use client";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { MutationStatusCheck } from "@/components/admin/mutation-status-check";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FieldGuidance,
  getFieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";

const FIELD_ERRORS = {
  code: "Kode organisasi wajib diisi (2–50 karakter).",
  slug: "Gunakan alamat URL berupa huruf kecil, angka, dan tanda hubung.",
  name: "Nama resmi organisasi wajib diisi (2–180 karakter).",
  short_name: "Nama singkat maksimal 80 karakter.",
  official_email: "Gunakan alamat email resmi yang valid.",
  official_url: "Gunakan URL resmi dengan protokol https:// atau http://.",
  description: "Deskripsi maksimal 2.000 karakter.",
};

function firstInvalidField(errors) {
  return Object.keys(FIELD_ERRORS).find((name) => errors[name]);
}

export function OrganizationForm({ initial = null }) {
  const router = useRouter();
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    uncertain,
    markUncertain,
  } = useSubmissionLock();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function clearFieldError(name) {
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    if (!uncertain) setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (uncertain || !beginSubmission()) return;
    setError("");
    setFieldErrors({});
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      ...raw,
      id: initial?.id || null,
      is_active: raw.is_active === "on",
    };
    try {
      const response = await fetch(
        initial?.id
          ? `/api/v1/portal/organizations/${initial.id}`
          : "/api/v1/portal/organizations",
        {
          method: initial?.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (response.status >= 500) markUncertain();
        if (
          result.error === "validation_failed" &&
          Array.isArray(result.issues)
        ) {
          const mapped = {};
          for (const issue of result.issues) {
            const field = Array.isArray(issue.path) ? issue.path[0] : null;
            if (typeof field === "string" && FIELD_ERRORS[field])
              mapped[field] = FIELD_ERRORS[field];
          }
          setFieldErrors(mapped);
          setError(
            Object.keys(mapped).length
              ? "Beberapa kolom perlu diperbaiki. Isian lainnya tetap tersedia pada formulir."
              : "Ada informasi yang perlu diperbaiki. Ikuti petunjuk di dekat kolom yang ditandai.",
          );
          const target = firstInvalidField(mapped);
          if (target)
            window.requestAnimationFrame(() => {
              const control = document.getElementById(target);
              control?.focus();
              control?.scrollIntoView({ block: "center", behavior: "smooth" });
            });
        } else {
          setError(
            result.error === "forbidden"
              ? "Hanya administrator data yang dapat mengelola organisasi."
              : result.error === "conflict"
                ? "Kode atau alamat URL sudah digunakan. Periksa kedua nilai, lalu ubah yang berbenturan."
                : apiErrorMessage(
                    result.error,
                    response.status,
                    "Organisasi belum dapat disimpan. Periksa isian.",
                  ),
          );
          if (result.error === "conflict") {
            window.requestAnimationFrame(() =>
              document.getElementById("code")?.focus(),
            );
          }
        }
        return;
      }
      router.push("/portal/organisasi?saved=1");
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
      aria-busy={busy}
      className="max-w-3xl space-y-5 portal-form-card p-5 sm:p-8"
    >
      {error ? (
        <div className="rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p role="alert">{error}</p>
          {uncertain ? <MutationStatusCheck href="/portal/organisasi" /> : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Kode organisasi"
          name="code"
          defaultValue={initial?.code || ""}
          required
          maxLength={50}
          placeholder="DISKOMINFO"
          error={fieldErrors.code}
          onChange={() => clearFieldError("code")}
        />
        <Field
          label="Bagian alamat halaman organisasi"
          name="slug"
          defaultValue={initial?.slug || ""}
          required
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="dinas-komunikasi-informatika"
          error={fieldErrors.slug}
          onChange={() => clearFieldError("slug")}
        />
        <div className="sm:col-span-2">
          <Field
            label="Nama resmi organisasi"
            name="name"
            defaultValue={initial?.name || ""}
            required
            maxLength={180}
            error={fieldErrors.name}
            onChange={() => clearFieldError("name")}
          />
        </div>
        <Field
          label="Nama singkat"
          name="short_name"
          defaultValue={initial?.short_name || ""}
          maxLength={80}
          error={fieldErrors.short_name}
          onChange={() => clearFieldError("short_name")}
        />
        <Field
          label="Email resmi"
          name="official_email"
          defaultValue={initial?.official_email || ""}
          type="email"
          maxLength={254}
          error={fieldErrors.official_email}
          onChange={() => clearFieldError("official_email")}
        />
        <div className="sm:col-span-2">
          <Field
            label="Situs resmi"
            name="official_url"
            defaultValue={initial?.official_url || ""}
            type="url"
            maxLength={2048}
            placeholder="https://..."
            error={fieldErrors.official_url}
            onChange={() => clearFieldError("official_url")}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            Deskripsi
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={initial?.description || ""}
            className={cn(
              "field min-h-24",
              fieldErrors.description &&
                "border-red-600 focus-visible:ring-red-600",
            )}
            maxLength={2000}
            aria-invalid={fieldErrors.description ? "true" : undefined}
            aria-describedby={[
              "description-help",
              fieldErrors.description ? "description-error" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                fieldErrors.description ||
                  getFieldValidationMessage("description"),
              )
            }
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              clearFieldError("description");
            }}
          />
          <FieldGuidance name="description" id="description-help" />
          {fieldErrors.description ? (
            <FieldError id="description-error">
              {fieldErrors.description}
            </FieldError>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial?.is_active !== false}
          className="size-4 rounded border-line text-primary focus:ring-focus"
        />
        Organisasi aktif
      </label>
      <FieldGuidance name="is_active" id="is_active-help" />
      <div className="border-t pt-5">
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Menyimpan organisasi…"
          disabled={uncertain}
          className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden="true" />
            {initial ? "Simpan perubahan" : "Simpan organisasi"}
          </span>
        </PendingActionButton>
      </div>
    </form>
  );
}
function Field({ label, name, error, onChange, ...props }) {
  const errorId = `${name}-error`;
  const helpId = `${name}-help`;
  const help = getFieldGuidance(name, label);
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  function handleInvalid(event) {
    event.currentTarget.setCustomValidity(
      error || getFieldValidationMessage(name, label),
    );
  }
  function handleChange(event) {
    event.currentTarget.setCustomValidity("");
    onChange?.(event);
  }
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
        {props.required ? " *" : ""}
      </label>
      <input
        className={cn(
          "field",
          error && "border-red-600 focus-visible:ring-red-600",
        )}
        id={name}
        name={name}
        {...props}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        onInvalid={handleInvalid}
        onChange={handleChange}
      />
      {help ? <FieldGuidance id={helpId} name={name} text={help} /> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="mt-1.5 text-xs leading-5 text-red-700">
      {children}
    </p>
  );
}
