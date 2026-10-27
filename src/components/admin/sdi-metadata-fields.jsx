import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FieldGuidance } from "@/components/admin/form-field-guidance";

const FIELDS = [
  {
    key: "ddp_id",
    label: "ID DDP",
    group: "identitas",
    maxLength: 160,
    placeholder: "ID yang diberikan pada registri DDP",
  },
  {
    key: "ddp_name",
    label: "Nama DDP",
    group: "identitas",
    maxLength: 240,
    placeholder: "Nama entri sesuai registri DDP",
  },
  {
    key: "source_reference",
    label: "Sumber Referensi",
    group: "identitas",
    maxLength: 2048,
    placeholder: "URL atau identitas publikasi sumber resmi",
  },
  {
    key: "available_year",
    label: "Tahun Tersedia",
    group: "identitas",
    type: "number",
    min: 1900,
    max: 2200,
    placeholder: "Contoh: 2026",
  },
  {
    key: "sds_code",
    label: "Kode SDS",
    group: "standar",
    maxLength: 160,
    placeholder: "Kode standar dari katalog resmi",
  },
  {
    key: "sds_type",
    label: "Tipe SDS",
    group: "standar",
    maxLength: 120,
    placeholder: "Jenis standar sesuai referensi resmi",
  },
  {
    key: "sds_version",
    label: "Versi SDS",
    group: "standar",
    maxLength: 80,
    placeholder: "Versi standar yang digunakan",
  },
  {
    key: "standard_concept",
    label: "Konsep",
    group: "standar",
    maxLength: 1000,
    placeholder: "Konsep statistik/standar yang dirujuk",
  },
  {
    key: "standard_definition",
    label: "Definisi Standar",
    group: "standar",
    maxLength: 5000,
    multiline: true,
    placeholder: "Salin definisi dari sumber standar yang berwenang",
  },
  {
    key: "measurement",
    label: "Ukuran",
    group: "standar",
    maxLength: 160,
    placeholder: "Contoh: jumlah, persentase, rasio, indeks",
  },
  {
    key: "presentation_classification",
    label: "Klasifikasi Penyajian",
    group: "standar",
    maxLength: 1600,
    placeholder: "Pisahkan beberapa klasifikasi dengan koma",
  },
  {
    key: "reference_code",
    label: "Kode Referensi",
    group: "referensi",
    maxLength: 160,
    placeholder: "Kode referensi resmi yang digunakan",
  },
  {
    key: "reference_code_version",
    label: "Versi Kode Referensi",
    group: "referensi",
    maxLength: 80,
    placeholder: "Versi kode referensi",
  },
  {
    key: "method_description",
    label: "Metode",
    group: "referensi",
    maxLength: 10000,
    multiline: true,
    placeholder: "Metode pengumpulan, perhitungan, atau pemutakhiran data",
  },
];

const GROUPS = [
  {
    key: "identitas",
    title: "Identitas katalog dan sumber",
    description:
      "Gunakan ID/nama dari registri atau identitas sumber yang sudah tersedia.",
  },
  {
    key: "standar",
    title: "Standar dan definisi",
    description:
      "Isi berdasarkan standar berwenang yang benar-benar berlaku untuk data ini.",
  },
  {
    key: "referensi",
    title: "Kode referensi dan metode",
    description:
      "Gunakan kode resmi dan dokumentasikan metode penyusunan atau pemutakhiran.",
  },
];

export function SdiMetadataFields({
  initial = {},
  standards = [],
  referenceSystems = [],
}) {
  const hasSavedMetadata =
    Boolean(initial?.sds_registry_id || initial?.reference_system_id) ||
    FIELDS.some((field) => {
      const value = initial?.[field.key];
      return Array.isArray(value)
        ? value.length > 0
        : value !== null && value !== undefined && String(value).trim() !== "";
    });
  const filledCount =
    FIELDS.filter((field) => {
      const value = initial?.[field.key];
      return Array.isArray(value)
        ? value.some((item) => String(item).trim())
        : value !== null && value !== undefined && String(value).trim() !== "";
    }).length +
    Number(Boolean(initial?.sds_registry_id)) +
    Number(Boolean(initial?.reference_system_id));

  const verifiedStandards = standards.filter(
    (item) => item.status === "verified",
  );
  const verifiedReferenceSystems = referenceSystems.filter(
    (item) => item.status === "verified",
  );

  return (
    <details className="group rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-lg text-base font-semibold text-[#193d59] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#28719b]">
        <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
            {hasSavedMetadata
              ? `${filledCount} dari ${FIELDS.length + 2} terisi`
              : "Bisa dilengkapi setelah draf"}
          </span>
          <ChevronDown
            size={17}
            aria-hidden="true"
            className="transition-transform group-open:rotate-180"
          />
        </span>
      </summary>
      <p className="mt-3 text-sm leading-6 text-muted">
        Bagian ini tidak perlu ditebak saat membuat draf. Lengkapi jika Anda
        sudah memiliki rujukan resmi, atau minta bantuan Walidata. Kode SDS, ID
        DDP, dan kode referensi tidak boleh dibuat sendiri. Dataset baru
        dianggap siap dipertukarkan setelah metadata dan distribusi aktif lolos
        pemeriksaan lokal serta kontrak tujuan diuji.
      </p>
      <div className="mt-5 space-y-6">
        {GROUPS.map((group) => (
          <section key={group.key} aria-labelledby={`sdi-group-${group.key}`}>
            {group.key === "standar" ? (
              <div className="mb-4 rounded-xl border border-[#d6e4ed] bg-white p-3 sm:p-4">
                <label
                  htmlFor="sdi_sds_registry_id"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Tautkan ke standar terverifikasi (disarankan)
                </label>
                <select
                  id="sdi_sds_registry_id"
                  name="sdi_sds_registry_id"
                  className="field h-11 w-full"
                  defaultValue={initial?.sds_registry_id || ""}
                >
                  <option value="">Belum ditautkan</option>
                  {verifiedStandards.map((standard) => (
                    <option key={standard.id} value={standard.id}>
                      {standard.standard_code} · {standard.title} · v
                      {standard.version_label}
                    </option>
                  ))}
                </select>
                <FieldGuidance
                  id="sdi_sds_registry_id-help"
                  text={
                    verifiedStandards.length
                      ? "Pilih standar yang sudah diperiksa dan masih berlaku. Saat disimpan, kode, versi, konsep, dan definisi akan mengikuti catatan pada registri."
                      : "Belum ada standar yang sudah diperiksa dan masih berlaku. Minta Walidata menambahkan rujukan resmi melalui halaman Standar dan Kode Referensi sebelum melanjutkan."
                  }
                />
                {initial?.sds_registry_id &&
                !verifiedStandards.some(
                  (item) => item.id === initial.sds_registry_id,
                ) ? (
                  <p
                    className="mt-2 text-xs leading-5 text-amber-800"
                    role="status"
                  >
                    Rujukan yang tersimpan tidak muncul di daftar standar aktif.
                    Periksa status dan masa berlakunya; pilih versi aktif yang
                    benar sebelum menyiapkan ekspor.
                  </p>
                ) : null}
                {!verifiedStandards.length ? (
                  <Link
                    href="/portal/standar"
                    className="mt-2 inline-flex text-xs font-semibold text-primary underline"
                  >
                    Buka registri standar
                  </Link>
                ) : null}
              </div>
            ) : null}
            {group.key === "referensi" ? (
              <div className="mb-4 rounded-xl border border-[#d6e4ed] bg-white p-3 sm:p-4">
                <label
                  htmlFor="sdi_reference_system_id"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Tautkan ke sistem kode referensi terverifikasi (disarankan)
                </label>
                <select
                  id="sdi_reference_system_id"
                  name="sdi_reference_system_id"
                  className="field h-11 w-full"
                  defaultValue={initial?.reference_system_id || ""}
                >
                  <option value="">Belum ditautkan</option>
                  {verifiedReferenceSystems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.system_code} · {system.title} · v
                      {system.version_label}
                    </option>
                  ))}
                </select>
                <FieldGuidance
                  id="sdi_reference_system_id-help"
                  text={
                    verifiedReferenceSystems.length
                      ? "Pilih sistem kode yang benar-benar digunakan oleh dataset. Kode dan versi sistem akan diselaraskan dari registri saat disimpan."
                      : "Belum ada sistem kode terverifikasi yang tersedia. Minta Walidata mencatat referensi yang benar dan memverifikasi sumbernya terlebih dahulu."
                  }
                />
                {initial?.reference_system_id &&
                !verifiedReferenceSystems.some(
                  (item) => item.id === initial.reference_system_id,
                ) ? (
                  <p
                    className="mt-2 text-xs leading-5 text-amber-800"
                    role="status"
                  >
                    Sistem kode yang tersimpan tidak muncul di daftar yang
                    aktif. Periksa versi dan masa berlakunya sebelum menyiapkan
                    ekspor.
                  </p>
                ) : null}
                {!verifiedReferenceSystems.length ? (
                  <Link
                    href="/portal/standar"
                    className="mt-2 inline-flex text-xs font-semibold text-primary underline"
                  >
                    Buka registri kode referensi
                  </Link>
                ) : null}
              </div>
            ) : null}
            <h3
              id={`sdi-group-${group.key}`}
              className="text-sm font-semibold text-[#234d67]"
            >
              {group.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {group.description}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {FIELDS.filter((field) => field.group === group.key).map(
                (field) => {
                  const name = `sdi_${field.key}`;
                  const initialValue =
                    field.key === "presentation_classification"
                      ? (initial?.presentation_classification || []).join(", ")
                      : (initial?.[field.key] ?? "");
                  return (
                    <div
                      key={field.key}
                      className={field.multiline ? "sm:col-span-2" : "min-w-0"}
                    >
                      <label
                        htmlFor={name}
                        className="mb-2 block text-sm font-medium text-ink"
                      >
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          id={name}
                          name={name}
                          className="field min-h-24"
                          maxLength={field.maxLength}
                          defaultValue={initialValue}
                          placeholder={field.placeholder}
                          aria-describedby={`${name}-help`}
                        />
                      ) : (
                        <input
                          id={name}
                          name={name}
                          type={field.type || "text"}
                          className="field"
                          maxLength={field.maxLength}
                          min={field.min}
                          max={field.max}
                          step={field.type === "number" ? 1 : undefined}
                          defaultValue={initialValue}
                          placeholder={field.placeholder}
                          aria-describedby={`${name}-help`}
                        />
                      )}
                      <FieldGuidance
                        id={`${name}-help`}
                        text={
                          field.key === "presentation_classification"
                            ? "Masukkan kategori penyajian resmi, pisahkan dengan koma. Contoh: Wilayah, Jenis Kelamin. Hanya gunakan klasifikasi yang memang tersedia pada data."
                            : field.key === "available_year"
                              ? "Tahun kalender ketika data tersedia. Ini tidak otomatis sama dengan tahun periode referensi dataset."
                              : field.key === "reference_code"
                                ? "Gunakan referensi resmi yang sesuai. Jika tidak yakin, biarkan kosong dan konfirmasikan kepada Walidata."
                                : field.key === "sds_code"
                                  ? "Salin kode dari registri standar yang berwenang; jangan mengarang kode untuk melengkapi formulir."
                                  : `Isi ${field.label.toLocaleLowerCase("id-ID")} sesuai dokumentasi atau registri sumber yang berwenang.`
                        }
                      />
                    </div>
                  );
                },
              )}
            </div>
          </section>
        ))}
      </div>
    </details>
  );
}
