import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
  LoadingTableToolbar,
} from "@/components/admin/admin-page-loading";

export default function AdminStatisticsLoading() {
  return (
    <AdminPageLoading
      label="Memuat daftar indikator statistik"
      eyebrow="Statistik"
      title="Indikator statistik"
      description="Kelola definisi indikator dan nilai statistiknya. Setiap indikator perlu memiliki satuan, sumber, dan periode yang jelas agar angkanya tidak salah ditafsirkan."
      contextGuide
      actionPlaceholder
    >
      <section className="portal-workspace-panel" aria-busy="true">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar indikator</h2>
            <p className="mt-1 text-sm text-muted">
              Indikator yang dapat Anda akses, beserta status pemeriksaannya.
            </p>
          </div>
          <LoadingBlock className="h-8 w-28 rounded-full" />
        </div>
        <LoadingTableToolbar filters={["Status", "Organisasi"]} />
        <LoadingRows
          headers={[
            "Indikator",
            "Organisasi",
            "Satuan / periode",
            "Status",
            "Deret nilai",
            "Tindakan",
          ]}
          rows={6}
        />
      </section>
    </AdminPageLoading>
  );
}
