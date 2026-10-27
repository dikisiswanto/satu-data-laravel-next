import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalLoadingFrame } from "@/components/admin/portal-loading-frame";
import { getFieldGuidance } from "@/components/admin/form-field-guidance";
import { ListFilter, Search, X } from "lucide-react";

export function LoadingBlock({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export function LoadingField({
  label,
  name,
  height = "h-11",
  required = false,
  className = "",
  hint,
  controlText,
}) {
  const guidance = hint ?? (name ? getFieldGuidance(name, label) : "");
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="mb-2 block text-sm font-medium">
        {label}
        {required ? (
          <>
            {" "}
            <span aria-hidden="true">*</span>
          </>
        ) : null}
      </p>
      {controlText !== undefined ? (
        <div
          className={`field flex ${height} min-w-0 items-center overflow-hidden px-3 text-sm text-muted`}
          aria-hidden="true"
        >
          <span className="truncate">{controlText}</span>
        </div>
      ) : (
        <LoadingBlock className={`${height} w-full rounded-control`} />
      )}
      {guidance ? (
        <p className="mt-1.5 text-xs leading-5 text-muted">{guidance}</p>
      ) : null}
    </div>
  );
}

export function LoadingTableToolbar({
  searchPlaceholder = "Cari berdasarkan nama, kode, status, atau rincian…",
  dateFilterLabel = "Tanggal",
  filters = [],
  showDates = true,
}) {
  return (
    <>
      <div
        className="portal-filter-form portal-table-explorer-toolbar"
        role="group"
        aria-label="Pencarian dan filter tabel"
        aria-busy="true"
      >
        <div className="portal-filter-search">
          <label className="portal-field-label">Cari data</label>
          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <div className="field flex h-11 min-w-0 items-center pl-9 pr-3 text-sm text-muted">
              <span className="truncate">{searchPlaceholder}</span>
            </div>
          </div>
        </div>
        {filters.map((label) => (
          <div className="portal-table-filter" key={label}>
            <label className="portal-field-label">{label}</label>
            <LoadingBlock className="h-11 w-full rounded-control" />
          </div>
        ))}
        {showDates ? (
          <>
            <div className="portal-table-filter portal-table-date-filter">
              <label className="portal-field-label">
                {dateFilterLabel} dari
              </label>
              <div className="field flex h-11 min-w-0 items-center px-3 text-sm text-muted">
                Pilih tanggal awal
              </div>
            </div>
            <div className="portal-table-filter portal-table-date-filter">
              <label className="portal-field-label">
                {dateFilterLabel} sampai
              </label>
              <div className="field flex h-11 min-w-0 items-center px-3 text-sm text-muted">
                Pilih tanggal akhir
              </div>
            </div>
          </>
        ) : null}
        <div className="portal-filter-actions">
          <span className="portal-reset-link inline-flex items-center gap-1.5">
            <X size={14} aria-hidden="true" /> Reset filter
          </span>
        </div>
      </div>
      <div className="portal-table-explorer-summary" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <ListFilter size={14} aria-hidden="true" /> Menampilkan{" "}
          <LoadingBlock className="inline-block h-4 w-7 align-middle" /> dari{" "}
          <LoadingBlock className="inline-block h-4 w-7 align-middle" /> baris
          yang dimuat
        </span>
      </div>
    </>
  );
}

export function LoadingRows({ columns = 4, rows = 6, headers = null }) {
  if (Array.isArray(headers) && headers.length) {
    return (
      <div className="portal-table-wrap" aria-hidden="true">
        <table className="portal-data-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                {headers.map((header, column) => (
                  <td key={header}>
                    <LoadingBlock
                      className={`${column === 0 ? "h-4 w-4/5" : "h-4 w-full"} max-w-full`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-white"
      aria-hidden="true"
    >
      <div
        className="grid gap-3 border-b bg-surface-secondary p-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <LoadingBlock key={index} className="h-4 w-4/5" />
        ))}
      </div>
      <div className="p-4">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="grid gap-3 border-b py-4 last:border-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <LoadingBlock
                key={column}
                className={column === 0 ? "h-4 w-4/5" : "h-4 w-full"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPageLoading({
  label = "Memuat halaman pengelola",
  eyebrow,
  title,
  description,
  descriptionPlaceholder = false,
  contextGuide = false,
  children,
  actionPlaceholder = false,
}) {
  return (
    <PortalLoadingFrame label={label}>
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        description={
          descriptionPlaceholder ? (
            <span className="block" aria-hidden="true">
              <span className="loading-skeleton mb-2 block h-4 w-full max-w-2xl" />
              <span className="loading-skeleton block h-4 w-5/6 max-w-xl" />
            </span>
          ) : (
            description
          )
        }
      >
        {actionPlaceholder ? (
          <LoadingBlock className="h-10 w-36 shrink-0 rounded-control" />
        ) : null}
      </PageHeading>
      {contextGuide ? <PortalContextGuide /> : null}
      {children}
    </PortalLoadingFrame>
  );
}
