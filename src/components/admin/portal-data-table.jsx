import { Database } from "lucide-react";
import { PortalDataTableExplorer } from "@/components/admin/portal-data-table-explorer";

const FILTER_SPECS = [
  { key: "status", label: "Status" },
  { key: "version_status", label: "Status versi" },
  { key: "outcome", label: "Hasil" },
  { key: "entity_type", label: "Jenis objek" },
  { key: "action", label: "Peristiwa" },
  { key: "role", label: "Peran" },
  { key: "format", label: "Format" },
  { key: "conversion_status", label: "Status konversi" },
  { key: "is_active", label: "Status akun" },
  { key: "organization_name", label: "Organisasi" },
];

const VALUE_LABELS = {
  draft: "Draf",
  review: "Menunggu pemeriksaan",
  published: "Terbit",
  archived: "Diarsipkan",
  superseded: "Versi terdahulu",
  abandoned: "Dibatalkan",
  queued: "Dalam antrean",
  processing: "Sedang diproses",
  succeeded: "Berhasil",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  success: "Berhasil",
  denied: "Ditolak",
  failure: "Gagal",
  csv: "CSV",
  xlsx: "Excel (XLSX)",
  pdf: "PDF",
  json: "JSON",
  geojson: "GeoJSON",
  xml: "XML",
  original: "Berkas asli",
  other: "Lainnya",
  super_admin: "Super administrator",
  data_admin: "Administrator data",
  admin_opd: "Administrator OPD",
  reviewer: "Pemeriksa data",
  editor: "Editor data",
  viewer: "Pembaca",
  auditor: "Auditor",
  true: "Aktif",
  false: "Nonaktif",
  dataset: "Dataset",
  dataset_resource: "Berkas dataset",
  indicator: "Indikator statistik",
  organization: "Organisasi",
  membership: "Kewenangan pengguna",
  profile: "Profil pengguna",
  account: "Akun",
  "dataset.create_draft": "Membuat draf dataset",
  "dataset.update_metadata": "Memperbarui metadata dataset",
  "dataset.source_uploaded": "Mengunggah sumber dataset",
  "dataset.submit_review": "Mengajukan dataset untuk pemeriksaan",
  "dataset.publish": "Menerbitkan dataset",
  "dataset.archive": "Mengarsipkan dataset",
  "dataset.return_for_changes": "Mengembalikan dataset untuk perbaikan",
  "indicator.create": "Membuat indikator",
  "indicator.update": "Memperbarui indikator",
  "indicator.publish": "Menerbitkan indikator",
  "indicator.submit_for_review": "Mengajukan indikator untuk pemeriksaan",
  "indicator.return_for_changes": "Mengembalikan indikator untuk perbaikan",
  "indicator.archive": "Mengarsipkan indikator",
  "organization.create": "Membuat organisasi",
  "organization.update": "Memperbarui organisasi",
  "membership.create": "Menambahkan akses pengguna",
  "membership.update": "Memperbarui akses pengguna",
  "profile.update": "Memperbarui profil",
  "profile.onboarding_completed": "Menyelesaikan panduan awal",
  "account.password_changed": "Mengubah kata sandi",
};

function displayValue(value) {
  const key = String(value ?? "");
  return VALUE_LABELS[key] || key.replaceAll("_", " ");
}

function searchValues(value, output = []) {
  if (value === null || value === undefined) return output;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => searchValues(item, output));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => searchValues(item, output));
  }
  return output;
}

function rowDate(row) {
  for (const key of [
    "created_at",
    "updated_at",
    "submitted_at",
    "published_at",
    "started_at",
    "finished_at",
  ]) {
    if (row[key]) {
      const date = new Date(row[key]);
      if (!Number.isNaN(date.getTime())) {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Makassar",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(date);
        const dateParts = Object.fromEntries(
          parts.map((part) => [part.type, part.value]),
        );
        return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      }
    }
  }
  return "";
}

function filterValue(row, key) {
  if (key === "organization_name") {
    return (
      row.organization_name ||
      row.organizations?.name ||
      row.organization?.name ||
      ""
    );
  }
  if (key === "is_active") {
    return typeof row.is_active === "boolean" ? String(row.is_active) : "";
  }
  const value = row[key];
  return value === null || value === undefined || value === ""
    ? ""
    : String(value);
}

function buildRowMeta(row) {
  const filters = {};
  const filterLabels = {};
  for (const spec of FILTER_SPECS) {
    const value = filterValue(row, spec.key);
    if (value) {
      filters[spec.key] = { value, label: displayValue(value) };
      filterLabels[spec.key] = spec.label;
    }
  }
  return {
    searchText: searchValues(row).join(" "),
    filters,
    filterLabels,
    dateValue: rowDate(row),
  };
}

/** Shared table with client-side search and filters over the authorized rows loaded by the server. */
export function PortalDataTable({
  columns,
  rows = [],
  rowKey = "id",
  caption,
  emptyTitle = "Belum ada data",
  emptyDescription = "Data akan tampil di sini setelah tersedia.",
  emptyAction = null,
  searchPlaceholder = "Cari berdasarkan nama, kode, status, atau rincian…",
  dateFilterLabel = "Tanggal",
  alwaysShowFilters = [],
  filterLabelOverrides = {},
}) {
  if (!rows.length) {
    return (
      <div className="portal-empty-state" role="status">
        <span className="portal-empty-icon">
          <Database size={21} aria-hidden="true" />
        </span>
        <h3>{emptyTitle}</h3>
        <p>{emptyDescription}</p>
        {emptyAction ? (
          <div className="portal-empty-actions">{emptyAction}</div>
        ) : null}
      </div>
    );
  }

  const rowNodes = rows.map((row, rowIndex) => (
    <tr key={row[rowKey] ?? `${rowIndex}`}>
      {columns.map((column) => (
        <td key={column.key} className={column.className || ""}>
          {column.render ? column.render(row) : (row[column.key] ?? "—")}
        </td>
      ))}
    </tr>
  ));
  const headers = columns.map((column) => ({
    key: column.key,
    label: column.label,
    className: column.headerClassName || "",
  }));
  const rowMeta = rows.map(buildRowMeta);

  return (
    <PortalDataTableExplorer
      caption={caption}
      headers={headers}
      rowNodes={rowNodes}
      rowMeta={rowMeta}
      emptyTitle="Tidak ada baris yang cocok"
      emptyDescription="Ubah kata kunci, filter, atau rentang tanggal untuk menemukan data."
      searchPlaceholder={searchPlaceholder}
      dateFilterLabel={dateFilterLabel}
      alwaysShowFilters={alwaysShowFilters}
      filterLabelOverrides={filterLabelOverrides}
    />
  );
}
