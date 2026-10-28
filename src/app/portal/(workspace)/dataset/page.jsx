import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import {
  getPortalShell,
  portalApi,
  portalData,
} from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/admin/date-picker";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kelola dataset",
  robots: { index: false, follow: false },
};
const PAGE_SIZE = 20;
const VALID_STATUSES = new Set(["draft", "review", "published", "archived"]);
const VALID_SORTS = new Set([
  "updated_desc",
  "updated_asc",
  "title_asc",
  "title_desc",
]);
const statusLabels = {
  draft: "Draf",
  review: "Menunggu pemeriksaan",
  published: "Terbit",
  archived: "Diarsipkan",
};
const statusVariant = {
  draft: "neutral",
  review: "warning",
  published: "success",
  archived: "neutral",
};
function safeSearch(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
function buildQuery(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  });
  return params.toString();
}
function safeDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : "";
}
function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Makassar",
  }).format(new Date(value));
}
export default async function ManageDatasetsPage({ searchParams }) {
  const params = await searchParams;
  const q = safeSearch(params?.q);
  const status = VALID_STATUSES.has(params?.status) ? params.status : "";
  const createdFrom = safeDate(params?.created_from);
  const createdTo = safeDate(params?.created_to);
  const organizationId =
    typeof params?.organization === "string" ? params.organization : "";
  const sort = VALID_SORTS.has(params?.sort) ? params.sort : "updated_desc";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(params?.page || "1", 10) || 1),
  );
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const shell = await getPortalShell();
  const memberships = shell?.memberships || [];
  const roles = [
    ...new Set((memberships || []).map((membership) => membership.role)),
  ];
  const canCreate = roles.some((role) =>
    ["super_admin", "data_admin", "admin_opd", "editor"].includes(role),
  );
  const organizationIdIsWellFormed =
    !organizationId ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      organizationId,
    );
  const offset = (page - 1) * PAGE_SIZE;
  const search = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
    sort,
  });
  if (q) search.set("q", q);
  if (status) search.set("status", status);
  if (createdFrom) search.set("created_from", createdFrom);
  if (createdTo) search.set("created_to", createdTo);
  if (organizationIdIsWellFormed && organizationId)
    search.set("organization_id", organizationId);
  const [organizations, datasetResult] = await Promise.all([
    portalData("organizations?limit=500"),
    organizationIdIsWellFormed
      ? portalApi(`datasets?${search.toString()}`)
      : Promise.resolve({ data: [], meta: { total: 0 } }),
  ]);
  const data = datasetResult.data || [];
  const total = datasetResult.meta?.total || 0;
  const error = null;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  if (page !== currentPage)
    redirect(
      `/portal/dataset?${buildQuery({ q, status, organization: organizationId, sort, created_from: createdFrom, created_to: createdTo, page: currentPage })}`,
    );
  const visibleFrom = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const visibleTo = Math.min(currentPage * PAGE_SIZE, total);
  const currentParams = {
    q,
    status,
    organization: organizationId,
    sort,
    created_from: createdFrom,
    created_to: createdTo,
  };
  const previousHref = `/portal/dataset?${buildQuery({ ...currentParams, page: currentPage - 1 })}`;
  const nextHref = `/portal/dataset?${buildQuery({ ...currentParams, page: currentPage + 1 })}`;
  return (
    <>
      <PageHeading
        eyebrow="Pengelolaan data"
        title="Dataset"
        description="Temukan dataset dengan pencarian dan filter, lalu buka judulnya untuk memeriksa metadata, berkas, dan status publikasi."
      >
        {canCreate ? (
          <Button href="/portal/dataset/new">
            <Plus size={16} aria-hidden="true" />
            Tambah dataset
          </Button>
        ) : null}
      </PageHeading>
      <PortalContextGuide />

      <section
        id="portal-dataset-list"
        className="portal-workspace-panel"
        aria-labelledby="dataset-list-heading"
      >
        <div className="portal-panel-heading">
          <div className="min-w-0">
            <h2 id="dataset-list-heading" className="text-base font-semibold">
              Daftar dataset
            </h2>
            <p className="mt-1 text-sm text-muted">
              {error
                ? "Ringkasan jumlah belum tersedia karena daftar gagal dimuat."
                : `${total.toLocaleString("id-ID")} dataset sesuai filter. Buka judul dataset untuk melihat informasi, berkas, dan statusnya.`}
            </p>
          </div>
          <span className="portal-result-count">
            <FileSpreadsheet size={15} aria-hidden="true" />
            {error
              ? "Data belum tersedia"
              : `${total.toLocaleString("id-ID")} data`}
          </span>
        </div>
        <form
          method="get"
          action="/portal/dataset"
          className="portal-filter-form"
        >
          <div className="portal-filter-search">
            <label htmlFor="dataset-q">Cari dataset</label>
            <div className="relative">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                className="field pl-9"
                id="dataset-q"
                name="q"
                type="search"
                maxLength={100}
                defaultValue={q}
                placeholder="Cari berdasarkan judul, kode, sumber, atau deskripsi…"
              />
            </div>
          </div>
          <div>
            <label className="portal-field-label" htmlFor="dataset-status">
              Status
            </label>
            <select
              className="field"
              id="dataset-status"
              name="status"
              defaultValue={status}
            >
              <option value="">Semua status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="portal-field-label"
              htmlFor="dataset-organization"
            >
              Organisasi
            </label>
            <select
              className="field"
              id="dataset-organization"
              name="organization"
              defaultValue={organizationId}
            >
              <option value="">Semua organisasi</option>
              {(organizations || []).map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="portal-field-label" htmlFor="dataset-sort">
              Urutkan
            </label>
            <select
              className="field"
              id="dataset-sort"
              name="sort"
              defaultValue={sort}
            >
              <option value="updated_desc">Terbaru diperbarui</option>
              <option value="updated_asc">Terlama diperbarui</option>
              <option value="title_asc">Judul A–Z</option>
              <option value="title_desc">Judul Z–A</option>
            </select>
          </div>
          <div>
            <label
              className="portal-field-label"
              htmlFor="dataset-created-from"
            >
              Dibuat sejak
            </label>
            <DatePicker
              id="dataset-created-from"
              name="created_from"
              max={createdTo || undefined}
              defaultValue={createdFrom}
              placeholder="Pilih tanggal awal"
            />
          </div>
          <div>
            <label className="portal-field-label" htmlFor="dataset-created-to">
              Dibuat sampai
            </label>
            <DatePicker
              id="dataset-created-to"
              name="created_to"
              min={createdFrom || undefined}
              defaultValue={createdTo}
              placeholder="Pilih tanggal akhir"
            />
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="portal-filter-actions">
            <Button type="submit">
              <SlidersHorizontal size={15} aria-hidden="true" />
              Terapkan
            </Button>
            <Link className="portal-reset-link" href="/portal/dataset">
              Reset filter
            </Link>
          </div>
        </form>

        <p className="portal-table-mobile-hint sm:hidden">
          Geser tabel ke samping untuk melihat kolom lainnya.
        </p>
        <div
          className="portal-table-wrap"
          role="region"
          aria-label="Daftar dataset"
          tabIndex={0}
        >
          {error ? (
            <div className="portal-state-panel portal-state-error" role="alert">
              <h3>Daftar dataset belum dapat dimuat</h3>
              <p>
                Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
                muncul, hubungi administrator portal.
              </p>
            </div>
          ) : data?.length ? (
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th scope="col">Dataset</th>
                  <th scope="col">Organisasi</th>
                  <th scope="col">Status</th>
                  <th scope="col">Diperbarui</th>
                  <th scope="col">
                    <span className="sr-only">Tindakan</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((dataset) => (
                  <tr key={dataset.id}>
                    <td>
                      <div className="portal-dataset-title-cell">
                        <Link
                          href={`/portal/dataset/${dataset.id}`}
                          className="portal-table-primary-link"
                        >
                          {dataset.title}
                        </Link>
                        <span className="portal-table-subtext">
                          {dataset.code}
                        </span>
                      </div>
                    </td>
                    <td>
                      {dataset.organizations?.name ||
                        "Organisasi belum tersedia"}
                    </td>
                    <td>
                      <Badge
                        variant={statusVariant[dataset.status] || "neutral"}
                      >
                        {statusLabels[dataset.status] || dataset.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      {dateLabel(dataset.updated_at)}
                    </td>
                    <td>
                      <Link
                        className="portal-table-action"
                        href={`/portal/dataset/${dataset.id}`}
                      >
                        Buka <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="portal-empty-state">
              <span className="portal-empty-icon">
                <Search size={22} aria-hidden="true" />
              </span>
              <h3>
                {q || status || organizationId
                  ? "Tidak ada dataset yang cocok"
                  : "Belum ada dataset dalam cakupan Anda"}
              </h3>
              <p>
                {q || status || organizationId
                  ? "Coba ubah kata kunci atau longgarkan filter untuk melihat hasil lain."
                  : "Mulai dengan membuat draf dataset. Draf hanya dapat dilihat oleh pengguna yang berwenang sampai melalui proses pemeriksaan dan publikasi."}
              </p>
              <div className="portal-empty-actions">
                {q || status || organizationId ? (
                  <Button href="/portal/dataset" variant="secondary">
                    Hapus semua filter
                  </Button>
                ) : canCreate ? (
                  <Button href="/portal/dataset/new">
                    <Plus size={16} aria-hidden="true" />
                    Tambah dataset pertama
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
        {!error ? (
          <div className="portal-table-footer">
            <p>
              Menampilkan{" "}
              <strong>
                {visibleFrom.toLocaleString("id-ID")}–
                {visibleTo.toLocaleString("id-ID")}
              </strong>{" "}
              dari <strong>{total.toLocaleString("id-ID")}</strong> dataset
            </p>
            <nav
              aria-label="Halaman daftar dataset"
              className="portal-pagination"
            >
              <Link
                aria-disabled={currentPage <= 1}
                tabIndex={currentPage <= 1 ? -1 : undefined}
                className={currentPage <= 1 ? "is-disabled" : ""}
                href={
                  currentPage > 1
                    ? previousHref
                    : `/portal/dataset?${buildQuery({ ...currentParams, page: 1 })}`
                }
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Sebelumnya
              </Link>
              <span>
                Halaman {currentPage} dari {pages}
              </span>
              <Link
                aria-disabled={currentPage >= pages}
                tabIndex={currentPage >= pages ? -1 : undefined}
                className={currentPage >= pages ? "is-disabled" : ""}
                href={
                  currentPage < pages
                    ? nextHref
                    : `/portal/dataset?${buildQuery({ ...currentParams, page: pages })}`
                }
              >
                Berikutnya
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </nav>
          </div>
        ) : null}
      </section>
      <section
        className="portal-template-panel"
        aria-labelledby="template-title"
      >
        <div className="portal-template-copy">
          <span className="portal-template-icon">
            <FileSpreadsheet size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 id="template-title">Template pengisian data</h2>
            <p>
              Unduh format, isi menggunakan data yang sudah diverifikasi, lalu
              buat draf dan unggah berkas sumber. Unggahan tidak otomatis
              memublikasikan dataset.
            </p>
          </div>
        </div>
        <div className="portal-template-links">
          <a href="/templates/data-tabular.xlsx" download>
            Excel (.xlsx)
          </a>
          <a href="/templates/data-tabular.csv" download>
            CSV
          </a>
          <a href="/templates/metadata-dataset.json" download>
            Metadata JSON
          </a>
          <a href="/templates/data-spasial.geojson" download>
            GeoJSON
          </a>
        </div>
      </section>
    </>
  );
}
