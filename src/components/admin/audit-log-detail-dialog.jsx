"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, X } from "lucide-react";

const SUMMARY_LABELS = {
  bootstrap: "Akun administrator awal",
  channel: "Kanal",
  code: "Kode organisasi",
  draft_snapshot_only: "Perubahan hanya pada draf",
  eligible: "Dataset yang memenuhi syarat",
  excluded: "Dataset yang dikecualikan",
  format: "Format berkas",
  indicator_id: "ID indikator",
  is_active: "Status akses aktif",
  kind: "Jenis referensi",
  new_user: "Pengguna baru",
  reason: "Alasan",
  resource_id: "ID berkas",
  role: "Peran akses",
  size: "Ukuran berkas (byte)",
  status: "Status",
  target: "Tujuan pemeriksaan",
  user_id: "ID pengguna terkait",
  version: "Versi dataset",
};

const FIELD_LABELS = {
  category: "Kategori",
  code: "Kode",
  description: "Deskripsi",
  definition: "Definisi",
  geographic_scope: "Cakupan wilayah",
  is_active: "Status aktif",
  keywords: "Kata kunci",
  license_text: "Lisensi",
  name: "Nama",
  official_email: "Email resmi",
  official_url: "Situs resmi",
  organization_id: "Organisasi",
  period_label: "Periode",
  published_at: "Waktu publikasi",
  reference_period_end: "Akhir periode data",
  reference_period_start: "Awal periode data",
  role: "Peran akses",
  short_name: "Nama singkat",
  slug: "Slug",
  source_name: "Nama sumber",
  source_url: "URL sumber",
  status: "Status",
  title: "Judul",
  unit: "Satuan",
  update_frequency: "Frekuensi pemutakhiran",
  value_numeric: "Nilai numerik",
  value_text: "Nilai teks",
};

function titleCaseKey(value) {
  return String(value)
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID"));
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function normalizeSummary(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function AuditLogDetailDialog({ item, actionLabel, entityLabel }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const summary = normalizeSummary(item.summary);
  const changedFields = Array.isArray(summary.changed_fields)
    ? summary.changed_fields.filter((field) => typeof field === "string")
    : [];
  const summaryEntries = Object.entries(summary).filter(
    ([key]) => key !== "changed_fields",
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d4e1eb] bg-white px-3 py-2 text-sm font-semibold leading-5 text-primary hover:bg-[#f5f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        aria-haspopup="dialog"
        aria-label={`Lihat detail aktivitas: ${actionLabel}`}
      >
        <Eye size={15} aria-hidden="true" />
        Lihat detail
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto max-h-[min(86dvh,48rem)] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#d7e2e9] bg-white p-0 text-[#183449] shadow-2xl backdrop:bg-slate-950/45"
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#e5ebf0] bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Detail aktivitas
            </p>
            <h2
              id={titleId}
              className="mt-1 break-words text-lg font-semibold leading-7"
            >
              {actionLabel}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#dce5ec] text-[#52697a] hover:bg-[#f4f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            aria-label="Tutup detail aktivitas"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <p id={descriptionId} className="text-sm leading-6 text-muted">
            Catatan yang disimpan oleh API Laravel. Nilai sensitif tidak
            ditampilkan; bagian perubahan menunjukkan nama kolom yang dicatat.
          </p>
          <dl className="grid gap-3 rounded-xl border border-[#e4ebf0] bg-[#f8fafb] p-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Jenis objek</dt>
              <dd className="mt-1 break-words text-sm font-semibold">
                {entityLabel}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">ID objek</dt>
              <dd className="mt-1 break-all font-mono text-xs leading-5">
                {item.entity_id || "Tidak dicatat"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Pelaku</dt>
              <dd className="mt-1 break-words text-sm">
                {item.actor_display_name ||
                  (item.actor_user_id
                    ? "Nama belum tersedia"
                    : "Aktivitas otomatis")}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-medium text-muted">Organisasi</dt>
              <dd className="mt-1 break-words text-sm">
                {item.organization_name || "Lingkup global"}
              </dd>
            </div>
          </dl>

          {changedFields.length ? (
            <section aria-labelledby={`${titleId}-changes`}>
              <h3
                id={`${titleId}-changes`}
                className="text-sm font-semibold leading-6"
              >
                Bagian yang berubah
              </h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {changedFields.map((field) => (
                  <li
                    key={field}
                    className="min-w-0 rounded-lg border border-[#e4ebf0] px-3 py-2 text-sm leading-5"
                  >
                    {FIELD_LABELS[field] || titleCaseKey(field)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {summaryEntries.length ? (
            <section aria-labelledby={`${titleId}-record`}>
              <h3
                id={`${titleId}-record`}
                className="text-sm font-semibold leading-6"
              >
                Informasi yang dicatat
              </h3>
              <dl className="mt-2 divide-y divide-[#e8edf1] rounded-xl border border-[#e4ebf0]">
                {summaryEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid min-w-0 gap-1 px-3 py-2.5 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1.2fr)] sm:gap-4"
                  >
                    <dt className="break-words text-xs font-medium leading-5 text-muted">
                      {SUMMARY_LABELS[key] || titleCaseKey(key)}
                    </dt>
                    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm leading-6">
                      {formatValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {!changedFields.length && !summaryEntries.length ? (
            <p className="rounded-xl border border-[#e4ebf0] bg-[#f8fafb] p-4 text-sm leading-6 text-muted">
              Tidak ada rincian tambahan yang disimpan untuk aktivitas ini.
            </p>
          ) : null}

          {item.request_id ? (
            <p className="break-all text-xs leading-5 text-muted">
              Kode pelacakan: <code>{item.request_id}</code>
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
