"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { DatePicker } from "@/components/admin/date-picker";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { cn } from "@/lib/utils";
import {
  FieldGuidance,
  getFieldGuidance,
  getFieldValidationMessage,
} from "@/components/admin/form-field-guidance";
import { UPDATE_FREQUENCY_OPTIONS } from "@/lib/dataset-options";
import { SdiMetadataFields } from "@/components/admin/sdi-metadata-fields";
import { DatasetCategoryField } from "@/components/admin/dataset-category-field";
import { readSdiMetadataFormFields } from "@/lib/sdi/form-metadata";
import { siteConfig } from "@/lib/site-config";

const FIELDS = {
  title: "Isi judul dengan 5–180 karakter.",
  description: "Jika diisi, deskripsi harus memiliki 20–5.000 karakter.",
  category: "Nama kategori terlalu panjang. Gunakan nama yang lebih ringkas.",
  keywords:
    "Gunakan maksimal 30 kata kunci; pisahkan dengan koma dan batasi tiap kata kunci hingga 80 karakter.",
  source_name:
    "Jika diisi, nama sumber atau penerbit data harus memiliki 2–240 karakter.",
  source_url:
    "Gunakan URL rujukan sumber lengkap dengan protokol https:// atau http://, atau kosongkan bila tidak tersedia.",
  geographic_scope: `Isi cakupan wilayah, misalnya ${siteConfig.regionName}.`,
  license_text:
    "Jika diisi, lisensi atau ketentuan penggunaan harus memiliki 2–240 karakter.",
  update_frequency:
    "Pilih frekuensi yang tersedia atau biarkan kosong sampai ditetapkan.",
  reference_period_start: "Pilih tanggal mulai periode yang benar.",
  reference_period_end:
    "Tanggal akhir harus valid dan tidak boleh lebih awal dari tanggal mulai.",
  methodology:
    "Penjelasan metodologi terlalu panjang. Ringkas cara pengumpulan dan pengolahan data.",
  unit: "Satuan terlalu panjang. Gunakan nama satuan yang ringkas.",
};

const API_ERRORS = {
  forbidden:
    "Akun Anda belum memiliki akses untuk mengubah dataset ini. Jika Anda seharusnya dapat mengubahnya, hubungi administrator portal.",
  unauthorized:
    "Sesi Anda sudah berakhir. Masuk kembali sebelum menyimpan perubahan.",
  account_inactive:
    "Akun ini sedang dinonaktifkan. Hubungi administrator portal jika Anda membutuhkan akses.",
  authentication_unavailable:
    "Layanan masuk sedang mengalami kendala. Perubahan belum terkonfirmasi; periksa detail dataset sebelum mencoba lagi.",
  authorization_unavailable:
    "Kami belum dapat memeriksa akses akun Anda. Muat ulang halaman sebelum melanjutkan.",
  not_found:
    "Dataset tidak ditemukan atau akses akun Anda sudah berubah. Muat ulang daftar untuk melihat informasi terbaru.",
  conflict:
    "Dataset telah berubah sejak halaman ini dibuka. Muat ulang data terbaru sebelum menyimpan perubahan.",
  service_unavailable:
    "Layanan sedang mengalami kendala dan belum mengonfirmasi perubahan. Periksa detail dataset sebelum mencoba lagi.",
};

function messageFor(code, status) {
  return (
    API_ERRORS[code] ||
    apiErrorMessage(
      code,
      status,
      "Perubahan metadata belum tersimpan. Periksa kolom yang ditandai, lalu coba lagi.",
    )
  );
}

function firstInvalidField(errors) {
  const order = Object.keys(FIELDS);
  return order.find((name) => errors[name]);
}

export function DatasetMetadataForm({
  id,
  initial,
  isReplacementVersion = false,
  standards = [],
  referenceSystems = [],
  initialError = "",
  initialStatusUnknown = false,
}) {
  const router = useRouter();
  const { pending: busy, begin, finish, markUncertain } = useSubmissionLock();
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(initialError);
  const [statusUnknown, setStatusUnknown] = useState(initialStatusUnknown);

  function clearFieldError(name) {
    setFieldErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
    if (!statusUnknown) setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (statusUnknown || !begin()) return;
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const nextErrors = {};
    if (
      raw.reference_period_start &&
      raw.reference_period_end &&
      raw.reference_period_end < raw.reference_period_start
    ) {
      nextErrors.reference_period_end = FIELDS.reference_period_end;
    }
    const keywords = raw.keywords
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (keywords.length > 30 || keywords.some((value) => value.length > 80))
      nextErrors.keywords = FIELDS.keywords;
    setFieldErrors(nextErrors);
    setError("");
    if (Object.keys(nextErrors).length) {
      finish();
      const target = firstInvalidField(nextErrors);
      if (target) document.getElementById(target)?.focus();
      return;
    }

    const payload = {
      title: raw.title,
      description: raw.description,
      category: raw.category?.trim() || "",
      keywords,
      source_name: raw.source_name,
      source_url: raw.source_url || "",
      geographic_scope: raw.geographic_scope,
      license_text: raw.license_text,
      update_frequency: raw.update_frequency,
      reference_period_start: raw.reference_period_start || null,
      reference_period_end: raw.reference_period_end || null,
      methodology: raw.methodology || "",
      unit: raw.unit || "",
      sdi_metadata: readSdiMetadataFormFields(raw),
    };

    try {
      const response = await fetch(
        `/api/v1/portal/datasets/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (
          result.error === "validation_failed" &&
          Array.isArray(result.issues)
        ) {
          const mapped = {};
          for (const issue of result.issues) {
            const field = Array.isArray(issue.path) ? issue.path[0] : null;
            if (typeof field === "string" && FIELDS[field])
              mapped[field] = FIELDS[field];
          }
          setFieldErrors(mapped);
          setError(
            Object.keys(mapped).length
              ? "Beberapa kolom perlu diperbaiki. Isian lainnya tetap tersedia pada formulir."
              : "Ada informasi yang perlu diperbaiki. Ikuti pesan di dekat kolom yang ditandai, lalu simpan kembali.",
          );
          const target = firstInvalidField(mapped);
          if (target)
            window.requestAnimationFrame(() => {
              const control = document.getElementById(target);
              control?.focus();
              control?.scrollIntoView({ block: "center", behavior: "smooth" });
            });
        } else {
          setError(messageFor(result.error, response.status));
          const isUnknown =
            [
              "service_unavailable",
              "authentication_unavailable",
              "authorization_unavailable",
            ].includes(result.error) || response.status >= 500;
          setStatusUnknown(isUnknown);
          if (isUnknown) markUncertain();
        }
        return;
      }
      router.push(`/portal/dataset/${id}?action_success=updated`);
    } catch (requestError) {
      setError(
        apiTransportFailureMessage(
          requestError,
          "Koneksi terputus sebelum perubahan terkonfirmasi. Periksa detail dataset sebelum mencoba lagi agar tidak menimpa perubahan terbaru.",
        ),
      );
      setStatusUnknown(true);
      markUncertain();
    } finally {
      finish();
    }
  }

  function fieldProps(name) {
    return {
      "aria-invalid": fieldErrors[name] ? "true" : undefined,
      "aria-describedby": [
        `${name}-help`,
        fieldErrors[name] ? `${name}-error` : null,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  function fieldClass(name) {
    return cn(
      "field",
      fieldErrors[name] && "border-red-600 focus-visible:ring-red-600",
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="w-full max-w-none space-y-5 portal-form-card p-5 sm:p-8"
    >
      <div className="rounded-xl border border-[#d8e4eb] bg-[#f5f9fc] p-4 text-sm leading-6 text-[#355469]">
        Simpan perubahan sedikit demi sedikit. Kolom sumber, cakupan, frekuensi,
        lisensi, dan deskripsi dapat dilengkapi selama draf; semuanya wajib
        lengkap sebelum dataset diajukan untuk pemeriksaan.
      </div>
      <nav
        aria-label="Bagian metadata dataset"
        className="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3"
      >
        {[
          ["#metadata-primary-title", "Identitas"],
          ["#metadata-discovery-title", "Kategori dan kata kunci"],
          ["#metadata-source-title", "Sumber dan periode"],
          ["#metadata-method-title", "Standar SDI"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-9 items-center rounded-control border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {label}
          </a>
        ))}
      </nav>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"
        >
          <p className="font-semibold">Metadata belum tersimpan</p>
          <p className="mt-1">{error}</p>
          {statusUnknown ? (
            <p className="mt-1">
              Jangan simpan ulang sebelum memeriksa keadaan dataset terbaru.
            </p>
          ) : null}
          {statusUnknown ? (
            <a
              href={`/portal/dataset/${id}`}
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              Periksa detail dataset
            </a>
          ) : null}
        </div>
      ) : null}
      <section
        className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
        aria-labelledby="metadata-primary-title"
      >
        <div>
          <h2
            id="metadata-primary-title"
            className="text-sm font-semibold text-ink"
          >
            1. Informasi utama
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Identitas yang membantu orang memahami isi dataset.
          </p>
        </div>
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium">
            Judul <span aria-hidden="true">*</span>
          </label>
          <input
            className={fieldClass("title")}
            id="title"
            name="title"
            required
            minLength={5}
            maxLength={180}
            defaultValue={initial.title}
            {...fieldProps("title")}
            onChange={() => clearFieldError("title")}
          />
          <FieldGuidance name="title" id="title-help" />
          {fieldErrors.title ? (
            <FieldError id="title-error">{fieldErrors.title}</FieldError>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium"
          >
            Deskripsi{" "}
            <span className="text-xs font-normal text-muted">
              (wajib sebelum pemeriksaan)
            </span>
          </label>
          <textarea
            className={cn(
              "field min-h-32",
              fieldErrors.description &&
                "border-red-600 focus-visible:ring-red-600",
            )}
            id="description"
            name="description"
            minLength={20}
            maxLength={5000}
            defaultValue={initial.description || ""}
            {...fieldProps("description")}
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
      </section>
      <section
        className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
        aria-labelledby="metadata-discovery-title"
      >
        <div>
          <h2
            id="metadata-discovery-title"
            className="text-sm font-semibold text-ink"
          >
            2. Kategori dan kata kunci
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Gunakan kategori yang sudah ada bila sesuai, lalu tambahkan kata
            kunci yang membantu pencarian. Kategori mengelompokkan dataset; kata
            kunci menjelaskan topik yang lebih spesifik.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatasetCategoryField
            value={initial.category || ""}
            error={fieldErrors.category}
            onChange={() => clearFieldError("category")}
          />
          <Field
            label="Kata kunci (pisahkan dengan koma)"
            name="keywords"
            value={(initial.keywords || []).join(", ")}
            maxLength={2500}
            error={fieldErrors.keywords}
            onChange={() => clearFieldError("keywords")}
          />
        </div>
      </section>
      <section
        className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
        aria-labelledby="metadata-source-title"
      >
        <div>
          <h2
            id="metadata-source-title"
            className="text-sm font-semibold text-ink"
          >
            3. Sumber, cakupan, dan periode
          </h2>
          <p className="text-xs leading-5 text-muted">
            Bagian ini mencatat asal dan konteks data. Berkas yang diunggah
            dikelola terpisah pada halaman detail dataset.
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Catat siapa yang menghasilkan data, cakupan yang dijelaskan, cara
            penggunaan, serta periode dan jadwal pembaruannya. Kolom bertanda
            wajib sebelum pemeriksaan boleh kosong selama draf.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sumber / penerbit data (wajib sebelum pemeriksaan)"
            name="source_name"
            value={initial.source_name || ""}
            maxLength={240}
            error={fieldErrors.source_name}
            onChange={() => clearFieldError("source_name")}
          />
          <Field
            label="URL rujukan sumber"
            name="source_url"
            value={initial.source_url || ""}
            maxLength={2048}
            error={fieldErrors.source_url}
            onChange={() => clearFieldError("source_url")}
          />
          <Field
            label="Cakupan wilayah (wajib sebelum pemeriksaan)"
            name="geographic_scope"
            value={initial.geographic_scope || ""}
            maxLength={240}
            error={fieldErrors.geographic_scope}
            onChange={() => clearFieldError("geographic_scope")}
          />
          <Field
            label="Lisensi atau ketentuan penggunaan (wajib sebelum pemeriksaan)"
            name="license_text"
            value={initial.license_text || ""}
            maxLength={240}
            error={fieldErrors.license_text}
            onChange={() => clearFieldError("license_text")}
          />
          <Field
            label="Satuan"
            name="unit"
            value={initial.unit || ""}
            maxLength={100}
            error={fieldErrors.unit}
            onChange={() => clearFieldError("unit")}
          />
          <div>
            <label
              htmlFor="update_frequency"
              className="mb-2 block text-sm font-medium"
            >
              Frekuensi pembaruan{" "}
              <span className="text-xs font-normal text-muted">
                (wajib sebelum pemeriksaan)
              </span>
            </label>
            <select
              className={fieldClass("update_frequency")}
              id="update_frequency"
              name="update_frequency"
              defaultValue={initial.update_frequency || ""}
              {...fieldProps("update_frequency")}
              onInvalid={(event) =>
                event.currentTarget.setCustomValidity(
                  fieldErrors.update_frequency ||
                    getFieldValidationMessage("update_frequency"),
                )
              }
              onChange={(event) => {
                event.currentTarget.setCustomValidity("");
                clearFieldError("update_frequency");
              }}
            >
              <option value="">Belum ditentukan</option>
              {UPDATE_FREQUENCY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldGuidance name="update_frequency" id="update_frequency-help" />
            {fieldErrors.update_frequency ? (
              <FieldError id="update_frequency-error">
                {fieldErrors.update_frequency}
              </FieldError>
            ) : null}
          </div>
          <DateField
            label="Awal periode"
            name="reference_period_start"
            value={initial.reference_period_start || ""}
            error={fieldErrors.reference_period_start}
            clearError={() => {
              clearFieldError("reference_period_start");
              clearFieldError("reference_period_end");
            }}
          />
          <DateField
            label="Akhir periode"
            name="reference_period_end"
            value={initial.reference_period_end || ""}
            error={fieldErrors.reference_period_end}
            clearError={() => {
              clearFieldError("reference_period_start");
              clearFieldError("reference_period_end");
            }}
          />
        </div>
      </section>
      <section
        className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
        aria-labelledby="metadata-method-title"
      >
        <div>
          <h2
            id="metadata-method-title"
            className="text-sm font-semibold text-ink"
          >
            4. Definisi, metode, dan standar SDI
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Jelaskan cara data dihasilkan dan isi standar hanya ketika ada
            rujukan resmi. Bagian ini membantu memeriksa konsep, definisi,
            klasifikasi, ukuran, satuan, dan interoperabilitas tanpa menebak
            kode standar.
          </p>
        </div>
        <div>
          <label
            htmlFor="methodology"
            className="mb-2 block text-sm font-medium"
          >
            Metodologi
          </label>
          <textarea
            className={cn(
              "field min-h-24",
              fieldErrors.methodology &&
                "border-red-600 focus-visible:ring-red-600",
            )}
            id="methodology"
            name="methodology"
            maxLength={10000}
            defaultValue={initial.methodology || ""}
            {...fieldProps("methodology")}
            onChange={() => clearFieldError("methodology")}
          />
          <FieldGuidance name="methodology" id="methodology-help" />
          {fieldErrors.methodology ? (
            <FieldError id="methodology-error">
              {fieldErrors.methodology}
            </FieldError>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-muted">
          Perlu melihat bentuk pertukaran metadata?{" "}
          <a
            href="/templates/metadata-dataset.json"
            download
            className="font-semibold text-primary underline underline-offset-2"
          >
            Unduh contoh metadata JSON
          </a>
          . File ini adalah referensi metadata, bukan berkas sumber untuk
          diunggah pada langkah sebelumnya.
        </p>
        <SdiMetadataFields
          initial={initial.sdi_metadata || {}}
          standards={standards}
          referenceSystems={referenceSystems}
        />
      </section>
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Link
          href={`/portal/dataset/${id}`}
          prefetch={false}
          className="inline-flex min-h-11 items-center rounded-control border border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          Batal dan kembali
        </Link>
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Menyimpan metadata…"
          disabled={statusUnknown}
          className="rounded-control border border-transparent bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden="true" />
            Simpan perubahan
          </span>
        </PendingActionButton>
        <p className="text-xs leading-5 text-muted">
          {isReplacementVersion
            ? "Perubahan disimpan pada draf versi baru. Versi publik saat ini tetap aktif sampai versi baru disetujui dan diterbitkan."
            : "Perubahan disimpan sebagai draf. Kelengkapan metadata akan diperiksa saat Anda mengajukan dataset untuk pemeriksaan."}
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  error,
  onChange,
  type = "text",
  ...props
}) {
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
    if (event?.currentTarget?.setCustomValidity)
      event.currentTarget.setCustomValidity("");
    onChange?.(event);
  }
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {type === "date" ? (
        <DatePicker
          id={name}
          name={name}
          defaultValue={props.defaultValue || value || ""}
          disabled={Boolean(props.disabled)}
          invalid={Boolean(error)}
          describedBy={describedBy}
          onChangeValue={onChange}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={value}
          className={cn(
            "field",
            error && "border-red-600 focus-visible:ring-red-600",
          )}
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

function DateField({ label, name, value, error, clearError }) {
  const errorId = `${name}-error`;
  const helpId = `${name}-help`;
  const help = getFieldGuidance(name, label);
  const describedBy =
    [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <DatePicker
        id={name}
        name={name}
        defaultValue={value}
        invalid={Boolean(error)}
        describedBy={describedBy}
        onChangeValue={clearError}
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
