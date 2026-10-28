"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Search, Save } from "lucide-react";
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
import { readSdiMetadataFormFields } from "@/lib/sdi/form-metadata";

const FIELD_MESSAGES = {
  title: "Judul wajib diisi dan harus memiliki 5–180 karakter.",
  description: "Deskripsi harus memiliki 20–5.000 karakter jika diisi.",
  organization_id:
    "Pilih organisasi pengampu yang aktif dan menjadi tanggung jawab Anda.",
  source_name: "Nama sumber data harus memiliki 2–240 karakter jika diisi.",
  geographic_scope: "Cakupan wilayah harus memiliki 2–240 karakter jika diisi.",
  license_text:
    "Lisensi atau ketentuan penggunaan harus memiliki 2–240 karakter jika diisi.",
  update_frequency:
    "Pilih frekuensi pembaruan yang tersedia jika sudah diketahui.",
  reference_period_start: "Pilih tanggal mulai periode data yang benar.",
  reference_period_end:
    "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
};

const REQUEST_ERRORS = {
  forbidden:
    "Akun Anda belum memiliki akses untuk membuat dataset pada organisasi yang dipilih. Jika pilihan ini seharusnya tersedia, hubungi administrator portal.",
  unauthorized:
    "Sesi Anda sudah berakhir. Masuk kembali, lalu simpan draf ini.",
  account_inactive:
    "Akun ini sedang dinonaktifkan. Hubungi administrator portal jika Anda membutuhkan akses.",
  authentication_unavailable:
    "Kami belum dapat memeriksa akun Anda. Isian tetap tersimpan di formulir; coba lagi beberapa saat lagi.",
  authorization_unavailable:
    "Kami belum dapat memeriksa akses akun Anda. Isian tetap ada di formulir; muat ulang halaman sebelum melanjutkan.",
  conflict:
    "Dataset mungkin sudah dibuat melalui proses lain. Periksa daftar dataset sebelum mencoba menyimpan lagi.",
  service_unavailable:
    "Layanan sedang mengalami kendala, jadi hasil penyimpanan belum dapat dipastikan. Periksa daftar dataset sebelum mencoba lagi agar tidak membuat duplikat.",
};

function formError(code) {
  return (
    REQUEST_ERRORS[code] ||
    apiErrorMessage(
      code,
      0,
      "Draf belum tersimpan. Periksa kolom yang ditandai, lalu coba lagi.",
    )
  );
}

function firstInvalidField(fields) {
  const order = [
    "title",
    "description",
    "organization_id",
    "source_name",
    "geographic_scope",
    "license_text",
    "update_frequency",
    "reference_period_start",
    "reference_period_end",
  ];
  return order.find((name) => fields[name]);
}

function SearchableOrganizationSelect({
  id,
  organizations,
  value,
  onChange,
  invalid = false,
  describedBy,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = organizations.find(
    (organization) => organization.id === value,
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
  const filtered = organizations.filter((organization) =>
    organization.name.toLocaleLowerCase("id-ID").includes(normalizedQuery),
  );
  const listboxId = `${id}-options`;

  function selectOrganization(organization) {
    onChange(organization.id);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length)
        setActiveIndex((index) =>
          index < 0 || index >= filtered.length - 1 ? 0 : index + 1,
        );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (filtered.length)
        setActiveIndex((index) =>
          index <= 0 ? filtered.length - 1 : index - 1,
        );
      return;
    }
    if (event.key === "Enter" && open && filtered.length) {
      event.preventDefault();
      selectOrganization(
        filtered[
          activeIndex < 0 ? 0 : Math.min(activeIndex, filtered.length - 1)
        ],
      );
    }
  }

  return (
    <div
      className="portal-filter-search relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && filtered[activeIndex]
              ? `${listboxId}-${activeIndex}`
              : undefined
          }
          aria-invalid={invalid ? "true" : undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          className={cn(
            "field pl-9 pr-10",
            invalid && "border-red-600 focus-visible:ring-red-600",
          )}
          placeholder="Cari lalu pilih organisasi…"
          value={open ? query : selected?.name || ""}
          onFocus={() => {
            setQuery("");
            setActiveIndex(-1);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Pilihan organisasi pengampu"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#d5e0e7] bg-white p-1 shadow-lg"
        >
          {filtered.length ? (
            filtered.map((organization, index) => (
              <button
                id={`${listboxId}-${index}`}
                key={organization.id}
                type="button"
                role="option"
                aria-selected={organization.id === value}
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#263f50] hover:bg-[#f1f6fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7]/30",
                  index === activeIndex && "bg-[#f1f6fa]",
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOrganization(organization)}
              >
                <span className="min-w-0 truncate">{organization.name}</span>
                {organization.id === value ? (
                  <Check size={16} aria-hidden="true" />
                ) : null}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-muted" role="status">
              Organisasi tidak ditemukan. Coba kata kunci lain.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function DatasetCreateForm({
  orgs,
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  function clearFieldError(name) {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
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
    const nextFieldErrors = {};
    if (
      raw.reference_period_start &&
      raw.reference_period_end &&
      raw.reference_period_end < raw.reference_period_start
    ) {
      nextFieldErrors.reference_period_end =
        FIELD_MESSAGES.reference_period_end;
    }
    if (!orgs.some((organization) => organization.id === raw.organization_id)) {
      nextFieldErrors.organization_id = FIELD_MESSAGES.organization_id;
    }
    setFieldErrors(nextFieldErrors);
    setError("");
    setStatusUnknown(false);

    if (Object.keys(nextFieldErrors).length) {
      finish();
      document.getElementById(firstInvalidField(nextFieldErrors))?.focus();
      return;
    }

    const payload = {
      title: raw.title,
      description: raw.description?.trim() || null,
      organization_id: raw.organization_id,
      source_name: raw.source_name?.trim() || null,
      geographic_scope: raw.geographic_scope?.trim() || null,
      license_text: raw.license_text?.trim() || null,
      update_frequency: raw.update_frequency || null,
      reference_period_start: raw.reference_period_start || null,
      reference_period_end: raw.reference_period_end || null,
      sdi_metadata: readSdiMetadataFormFields(raw),
    };

    try {
      const response = await fetch("/api/v1/portal/datasets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        if (
          result.error === "validation_failed" &&
          Array.isArray(result.issues)
        ) {
          const mapped = {};
          for (const issue of result.issues) {
            const field = Array.isArray(issue.path) ? issue.path[0] : null;
            if (typeof field === "string" && FIELD_MESSAGES[field])
              mapped[field] = FIELD_MESSAGES[field];
          }
          setFieldErrors(mapped);
          setError(
            Object.keys(mapped).length
              ? "Beberapa kolom perlu diperbaiki. Isian lainnya tetap ada di formulir."
              : "Ada kolom yang perlu diperbaiki. Ikuti pesan di dekat kolom tersebut, lalu simpan kembali.",
          );
          const target = firstInvalidField(mapped);
          if (target)
            window.requestAnimationFrame(() => {
              const control = document.getElementById(target);
              control?.focus();
              control?.scrollIntoView({ block: "center", behavior: "smooth" });
            });
        } else {
          setError(formError(result.error));
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

      const created = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!created?.id) {
        setError(
          "Portal belum mengonfirmasi apakah dataset sudah tersimpan. Periksa daftar dataset terlebih dahulu sebelum mencoba lagi agar tidak membuat duplikat.",
        );
        setStatusUnknown(true);
        markUncertain();
        return;
      }
      router.push(`/portal/dataset/${created.id}?created=1`);
    } catch (requestError) {
      setError(
        apiTransportFailureMessage(
          requestError,
          "Koneksi terputus sebelum hasil penyimpanan terkonfirmasi. Periksa daftar dataset terlebih dahulu sebelum mencoba lagi.",
        ),
      );
      setStatusUnknown(true);
      markUncertain();
    } finally {
      finish();
    }
  }

  function invalidProps(name) {
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
      id="dataset-create-form"
      onSubmit={submit}
      aria-busy={busy}
      className="w-full max-w-none space-y-5 portal-form-card p-4 sm:p-6 lg:p-7"
    >
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"
        >
          <p className="font-semibold">Dataset belum tersimpan</p>
          <p className="mt-1">{error}</p>
          {statusUnknown ? (
            <p className="mt-1">
              Jangan kirim ulang sebelum memeriksa daftar dataset.
            </p>
          ) : null}
          {statusUnknown ? (
            <Link
              href="/portal/dataset"
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              Periksa daftar dataset
            </Link>
          ) : null}
        </div>
      ) : null}
      <section
        className="portal-form-section space-y-4 border p-4 sm:p-5"
        aria-labelledby="dataset-core-fields-title"
      >
        <div>
          <h2
            id="dataset-core-fields-title"
            className="text-sm font-semibold text-ink"
          >
            Informasi utama
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Mulai dari nama data, penjelasan singkat, dan pihak yang bertanggung
            jawab.
          </p>
        </div>
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium">
            Judul dataset <span aria-hidden="true">*</span>
          </label>
          <input
            className={fieldClass("title")}
            id="title"
            name="title"
            minLength={5}
            maxLength={180}
            required
            {...invalidProps("title")}
            onInvalid={(event) =>
              event.currentTarget.setCustomValidity(
                fieldErrors.title || getFieldValidationMessage("title"),
              )
            }
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              clearFieldError("title");
            }}
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
              (opsional untuk draf)
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
            {...invalidProps("description")}
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
        <div>
          <label
            htmlFor="organization_id"
            className="mb-2 block text-sm font-medium"
          >
            Organisasi pengampu <span aria-hidden="true">*</span>
          </label>
          <SearchableOrganizationSelect
            id="organization_id"
            organizations={orgs}
            value={selectedOrganizationId}
            onChange={(organizationId) => {
              setSelectedOrganizationId(organizationId);
              clearFieldError("organization_id");
            }}
            invalid={Boolean(fieldErrors.organization_id)}
            describedBy={[
              "organization_id-help",
              fieldErrors.organization_id ? "organization_id-error" : null,
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <input
            type="hidden"
            name="organization_id"
            value={selectedOrganizationId}
          />
          <FieldGuidance name="organization_id" id="organization_id-help" />
          {fieldErrors.organization_id ? (
            <FieldError id="organization_id-error">
              {fieldErrors.organization_id}
            </FieldError>
          ) : null}
        </div>
      </section>
      <details className="rounded-xl border border-[#dce5eb] bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Lengkapi informasi data{" "}
          <span className="font-normal text-muted">
            (opsional saat membuat draf)
          </span>
        </summary>
        <p className="mt-2 text-xs leading-5 text-muted">
          Isi yang sudah diketahui sekarang. Informasi sumber, cakupan, lisensi,
          dan frekuensi perlu dilengkapi sebelum dataset diajukan untuk
          pemeriksaan, bukan untuk menyimpan draf.
        </p>
        <section
          className="portal-form-section mt-4 space-y-4 border p-4 sm:p-5"
          aria-labelledby="dataset-source-fields-title"
        >
          <div>
            <h2
              id="dataset-source-fields-title"
              className="text-sm font-semibold text-ink"
            >
              Sumber, cakupan, dan periode
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Tambahkan informasi yang sudah tersedia. Periode data boleh
              dibiarkan kosong jika belum ditetapkan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama sumber data"
              name="source_name"
              maxLength={240}
              error={fieldErrors.source_name}
              onChange={() => clearFieldError("source_name")}
            />
            <Field
              label="Cakupan wilayah"
              name="geographic_scope"
              maxLength={240}
              placeholder="Contoh: Kabupaten Wajo"
              error={fieldErrors.geographic_scope}
              onChange={() => clearFieldError("geographic_scope")}
            />
            <Field
              label="Lisensi / ketentuan penggunaan"
              name="license_text"
              maxLength={240}
              placeholder="Contoh: lisensi atau ketentuan penggunaan yang telah disetujui"
              error={fieldErrors.license_text}
              onChange={() => clearFieldError("license_text")}
            />
            <div>
              <label
                htmlFor="update_frequency"
                className="mb-2 block text-sm font-medium"
              >
                Frekuensi pembaruan
              </label>
              <select
                className={fieldClass("update_frequency")}
                id="update_frequency"
                name="update_frequency"
                defaultValue=""
                {...invalidProps("update_frequency")}
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
                <option value="" disabled>
                  Pilih frekuensi
                </option>
                {UPDATE_FREQUENCY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldGuidance
                name="update_frequency"
                id="update_frequency-help"
              />
              {fieldErrors.update_frequency ? (
                <FieldError id="update_frequency-error">
                  {fieldErrors.update_frequency}
                </FieldError>
              ) : null}
            </div>
            <DateField
              label="Awal periode data"
              name="reference_period_start"
              error={fieldErrors.reference_period_start}
              clearError={() => {
                clearFieldError("reference_period_start");
                clearFieldError("reference_period_end");
              }}
            />
            <DateField
              label="Akhir periode data"
              name="reference_period_end"
              error={fieldErrors.reference_period_end}
              clearError={() => {
                clearFieldError("reference_period_start");
                clearFieldError("reference_period_end");
              }}
            />
          </div>
        </section>
      </details>
      <SdiMetadataFields
        standards={standards}
        referenceSystems={referenceSystems}
      />
      <details className="rounded-xl border border-[#e1e8ed] bg-[#f8fafc] px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#415e72]">
          Periksa kembali sebelum menyimpan
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-muted">
          <li>
            Periksa apakah sumber dapat dibuka dan tautannya mengarah ke dokumen
            yang tepat.
          </li>
          <li>
            Tanggal akhir periode tidak boleh lebih awal daripada tanggal mulai.
          </li>
          <li>
            Dataset disimpan sebagai draf dan belum terlihat di portal publik
            sampai diperiksa serta diterbitkan.
          </li>
        </ul>
      </details>
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Menyimpan draf…"
          disabled={!orgs.length || statusUnknown}
          className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden="true" />
            Simpan sebagai draf
          </span>
        </PendingActionButton>
        <p className="self-center text-xs leading-5 text-muted">
          Untuk menyimpan draf, cukup isi judul dan organisasi pengampu.
          Lengkapi informasi lain sebelum mengajukan pemeriksaan.
        </p>
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
        id={name}
        name={name}
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
      {help ? <FieldGuidance id={helpId} name={name} text={help} /> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

function DateField({ label, name, error, clearError }) {
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
