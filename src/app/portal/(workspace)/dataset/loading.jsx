import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalLoadingFrame } from "@/components/admin/portal-loading-frame";

function Block({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PortalDatasetLoading() {
  return (
    <PortalLoadingFrame label="Memuat daftar dataset">
      <PageHeading
        eyebrow="Pengelolaan data"
        title="Dataset"
        description="Temukan dataset dengan pencarian dan filter, lalu buka judulnya untuk memeriksa metadata, berkas, dan status publikasi."
      >
        <Block className="h-10 w-36 shrink-0 rounded-lg" />
      </PageHeading>
      <PortalContextGuide />
      <section
        id="portal-dataset-list"
        className="portal-workspace-panel"
        aria-busy="true"
      >
        <div className="portal-panel-heading">
          <div className="min-w-0">
            <h2 id="dataset-list-heading" className="text-base font-semibold">
              Daftar dataset
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted">
              <Block className="inline-block h-4 w-10 align-middle" /> dataset
              sesuai filter. Buka judul dataset untuk melihat informasi, berkas,
              dan statusnya.
            </p>
          </div>
          <Block className="h-8 w-28 shrink-0 rounded-full" />
        </div>
        <form className="portal-filter-form" aria-hidden="true">
          <div className="portal-filter-search">
            <label htmlFor="loading-dataset-q">Cari dataset</label>
            <Block className="h-11 w-full rounded-control" />
          </div>
          <div>
            <label className="portal-field-label">Status</label>
            <Block className="h-11 w-full rounded-control" />
          </div>
          <div>
            <label className="portal-field-label">Organisasi</label>
            <Block className="h-11 w-full rounded-control" />
          </div>
          <div>
            <label className="portal-field-label">Urutkan</label>
            <Block className="h-11 w-full rounded-control" />
          </div>
          <div>
            <label className="portal-field-label">Dibuat sejak</label>
            <div
              className="field flex h-11 items-center px-3 text-sm text-muted"
              aria-hidden="true"
            >
              Pilih tanggal awal
            </div>
          </div>
          <div>
            <label className="portal-field-label">Dibuat sampai</label>
            <div
              className="field flex h-11 items-center px-3 text-sm text-muted"
              aria-hidden="true"
            >
              Pilih tanggal akhir
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-sm font-semibold text-white">
              Terapkan
            </span>
            <span className="text-sm font-medium text-primary">
              Reset filter
            </span>
          </div>
        </form>
        <div className="overflow-hidden border-t bg-white">
          <div className="grid gap-3 border-b bg-slate-50 p-4 xl:grid-cols-[1.5fr_.8fr_.8fr_.8fr_auto]">
            <span className="text-xs font-semibold text-muted">Dataset</span>
            <span className="text-xs font-semibold text-muted">Organisasi</span>
            <span className="text-xs font-semibold text-muted">Status</span>
            <span className="text-xs font-semibold text-muted">Diperbarui</span>
            <span className="sr-only">Tindakan</span>
          </div>
          <div className="p-4">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="grid gap-3 border-b py-5 last:border-0 md:grid-cols-[1.5fr_.8fr_.8fr_.8fr_auto] md:items-center"
              >
                <div>
                  <Block className="h-4 w-4/5" />
                  <Block className="mt-2 h-3 w-24" />
                </div>
                <Block className="h-4 w-3/4" />
                <Block className="h-6 w-24 rounded-full" />
                <Block className="h-4 w-28" />
                <Block className="h-8 w-16 rounded-md" />
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t p-4">
            <Block className="h-4 w-36" />
            <Block className="h-8 w-44 rounded-md" />
          </div>
        </div>
      </section>
    </PortalLoadingFrame>
  );
}
