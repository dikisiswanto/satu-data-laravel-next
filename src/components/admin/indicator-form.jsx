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
import { DatePicker } from "@/components/admin/date-picker";
import { cn } from "@/lib/utils";
import {
  FieldGuidance,
  getFieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";

const FIELD_ERRORS = {
  code: "Isi kode indikator dengan 3–50 karakter.",
  slug: "Gunakan huruf kecil, angka, dan tanda hubung tanpa spasi. Contoh: jumlah-penduduk.",
  title: "Isi nama indikator dengan 3–180 karakter.",
  definition: "Jelaskan indikator dengan 10–5.000 karakter.",
  unit: "Isi satuan dengan maksimal 100 karakter.",
  organization_id:
    "Pilih organisasi pengampu yang aktif dan sesuai dengan data ini.",
  source_name: "Isi nama sumber data dengan 2–240 karakter.",
  period_label:
    "Tuliskan periode dengan maksimal 120 karakter, misalnya 2025 atau Triwulan I 2026.",
  value_numeric:
    "Masukkan angka tanpa pemisah ribuan. Gunakan titik untuk desimal.",
  value_text: "Isi nilai angka atau nilai teks, jangan keduanya sekaligus.",
  reference_period_start: "Pilih tanggal mulai periode yang benar.",
  reference_period_end:
    "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
};

function firstInvalidField(errors) {
  return Object.keys(FIELD_ERRORS).find((name) => errors[name]);
}
export function IndicatorForm({ organizations, initial = null }) {
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
    const localErrors = {};
    if (
      raw.reference_period_start &&
      raw.reference_period_end &&
      raw.reference_period_end < raw.reference_period_start
    ) {
      localErrors.reference_period_end = FIELD_ERRORS.reference_period_end;
    }
    if (raw.value_numeric.trim() && raw.value_text.trim()) {
      localErrors.value_text = FIELD_ERRORS.value_text;
    }
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      const target = firstInvalidField(localErrors);
      if (target) document.getElementById(target)?.focus();
      finishSubmission();
      return;
    }
    const payload = {
      ...raw,
      id: initial?.id || null,
      value_numeric: raw.value_numeric.trim()
        ? Number(raw.value_numeric)
        : null,
      value_text: raw.value_text.trim(),
      reference_period_start: raw.reference_period_start || null,
      reference_period_end: raw.reference_period_end || null,
    };
    try {
      const response = await fetch("/api/v1/portal/indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
              ? "Beberapa kolom perlu diperbaiki. Isian lainnya tetap ada di formulir."
              : "Ada informasi yang perlu diperbaiki. Ikuti pesan di dekat kolom yang ditandai.",
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
              ? "Akun Anda belum memiliki akses untuk menyimpan indikator ini."
              : result.error === "conflict"
                ? "Kode atau alamat halaman ini sudah dipakai. Gunakan kode atau alamat lain."
                : apiErrorMessage(
                    result.error,
                    response.status,
                    "Indikator belum tersimpan. Periksa kolom yang ditandai dan akses akun Anda.",
                  ),
          );
        }
        return;
      }
      router.push("/portal/statistik?saved=1");
    } catch (error) {
      markUncertain();
      setError(
        apiTransportFailureMessage(
          error,
          "Koneksi terputus sebelum penyimpanan terkonfirmasi. Periksa daftar indikator sebelum mencoba lagi agar tidak membuat data ganda.",
        ),
      );
    } finally {
      finishSubmission();
    }
  }
  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="max-w-4xl space-y-6 portal-form-card p-5 sm:p-8"
    >
      {error ? (
        <div className="rounded-control border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p role="alert">{error}</p>
          {uncertain ? <MutationStatusCheck href="/portal/statistik" /> : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Kode indikator"
          name="code"
          defaultValue={initial?.code || ""}
          required
          maxLength={50}
          placeholder="IND-001"
          error={fieldErrors.code}
          onChange={() => clearFieldError("code")}
        />
        <Field
          label="Bagian alamat halaman indikator"
          name="slug"
          defaultValue={initial?.slug || ""}
          required
          maxLength={120}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="jumlah-penduduk"
          error={fieldErrors.slug}
          onChange={() => clearFieldError("slug")}
        />
        <div className="sm:col-span-2">
          <Field
            label="Nama indikator"
            name="title"
            defaultValue={initial?.title || ""}
            required
            maxLength={180}
            error={fieldErrors.title}
            onChange={() => clearFieldError("title")}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="definition"
          >
            Definisi indikator *
          </label>
          <textarea
            className={cn(
              "field min-h-28",
              fieldErrors.definition &&
                "border-red-600 focus-visible:ring-red-600",
            )}
            id="definition"
            name="definition"
            defaultValue={initial?.definition || ""}
            minLength={10}
            maxLength={5000}
            required
            aria-invalid={fieldErrors.definition ? "true" : undefined}
            aria-describedby={[
              "definition-help",
              fieldErrors.definition ? "definition-error" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                fieldErrors.definition ||
                  getFieldValidationMessage("definition"),
              )
            }
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              clearFieldError("definition");
            }}
          />
          <FieldGuidance name="definition" id="definition-help" />
          {fieldErrors.definition ? (
            <FieldError id="definition-error">
              {fieldErrors.definition}
            </FieldError>
          ) : null}
        </div>
        <Field
          label="Satuan"
          name="unit"
          defaultValue={initial?.unit || ""}
          required
          maxLength={100}
          placeholder="Orang, persen, ton"
          error={fieldErrors.unit}
          onChange={() => clearFieldError("unit")}
        />
        <Field
          label="Sumber data"
          name="source_name"
          defaultValue={initial?.source_name || ""}
          required
          maxLength={240}
          error={fieldErrors.source_name}
          onChange={() => clearFieldError("source_name")}
        />
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="organization_id"
          >
            Organisasi pengampu *
          </label>
          <select
            className={cn(
              "field",
              fieldErrors.organization_id &&
                "border-red-600 focus-visible:ring-red-600",
            )}
            id="organization_id"
            name="organization_id"
            required
            defaultValue={initial?.organization_id || ""}
            aria-invalid={fieldErrors.organization_id ? "true" : undefined}
            aria-describedby={[
              "organization_id-help",
              fieldErrors.organization_id ? "organization_id-error" : null,
            ]
              .filter(Boolean)
              .join(" ")}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                fieldErrors.organization_id ||
                  getFieldValidationMessage("organization_id"),
              )
            }
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              clearFieldError("organization_id");
            }}
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
          {fieldErrors.organization_id ? (
            <FieldError id="organization_id-error">
              {fieldErrors.organization_id}
            </FieldError>
          ) : null}
        </div>
        <Field
          label="Label periode"
          name="period_label"
          defaultValue={initial?.period_label || ""}
          maxLength={120}
          placeholder="2025 atau Triwulan I 2026"
          error={fieldErrors.period_label}
          onChange={() => clearFieldError("period_label")}
        />
        <Field
          label="Nilai numerik"
          name="value_numeric"
          defaultValue={initial?.value_numeric ?? ""}
          type="number"
          step="any"
          error={fieldErrors.value_numeric}
          onChange={() => clearFieldError("value_numeric")}
        />
        <Field
          label="Nilai teks (alternatif)"
          name="value_text"
          defaultValue={initial?.value_text || ""}
          maxLength={500}
          error={fieldErrors.value_text}
          onChange={() => clearFieldError("value_text")}
        />
        <Field
          label="Awal periode"
          name="reference_period_start"
          defaultValue={initial?.reference_period_start || ""}
          type="date"
          error={fieldErrors.reference_period_start}
          onChange={() => {
            clearFieldError("reference_period_start");
            clearFieldError("reference_period_end");
          }}
        />
        <Field
          label="Akhir periode"
          name="reference_period_end"
          defaultValue={initial?.reference_period_end || ""}
          type="date"
          error={fieldErrors.reference_period_end}
          onChange={() => {
            clearFieldError("reference_period_start");
            clearFieldError("reference_period_end");
          }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Menyimpan draf…"
          disabled={!organizations.length || uncertain}
          className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden="true" />
            Simpan sebagai draf
          </span>
        </PendingActionButton>
        <p className="text-xs leading-5 text-muted">
          Draf belum tampil di portal publik.
        </p>
      </div>
    </form>
  );
}
function Field({ label, name, type = "text", error, onChange, ...props }) {
  const errorId = `${name}-error`;
  const helpId = `${name}-help`;
  const help = getFieldGuidance(name, label);
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  const fieldClass = cn(
    "field",
    error && "border-red-600 focus-visible:ring-red-600",
  );
  function handleInvalid(event) {
    event.currentTarget.setCustomValidity(
      error || getFieldValidationMessage(name, label),
    );
  }
  function handleChange(event) {
    if (event?.currentTarget?.setCustomValidity)
      event.currentTarget.setCustomValidity("");
    onChange?.(event);
  }
  return (
    <div>
      <label className="mb-2 block text-sm font-medium" htmlFor={name}>
        {label}
        {props.required ? " *" : ""}
      </label>
      {type === "date" ? (
        <DatePicker
          id={name}
          name={name}
          defaultValue={props.defaultValue || ""}
          disabled={Boolean(props.disabled)}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChangeValue={onChange}
        />
      ) : (
        <input
          className={fieldClass}
          id={name}
          name={name}
          type={type}
          {...props}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          onInvalid={handleInvalid}
          onChange={handleChange}
        />
      )}
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
