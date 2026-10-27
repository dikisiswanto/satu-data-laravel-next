import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
  LoadingTableToolbar,
} from "@/components/admin/admin-page-loading";

export default function AdminOrganizationsLoading() {
  return (
    <AdminPageLoading
      label="Memuat daftar organisasi"
      eyebrow="Tata kelola kelembagaan"
      title="Organisasi"
      description="Kelola organisasi yang menjadi pemilik dataset dan indikator dalam portal. Daftar yang ditampilkan menyesuaikan akses akun Anda."
      contextGuide
      actionPlaceholder
    >
      <section className="portal-workspace-panel" aria-busy="true">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar organisasi</h2>
            <p className="mt-1 text-sm text-muted">
              Daftar organisasi yang dapat Anda akses, baik yang aktif maupun
              yang sudah dinonaktifkan.
            </p>
          </div>
          <LoadingBlock className="h-8 w-28 rounded-full" />
        </div>
        <LoadingTableToolbar filters={["Status"]} />
        <LoadingRows
          headers={["Organisasi", "Kontak", "Status", "Peran akun", "Tindakan"]}
          rows={6}
        />
      </section>
    </AdminPageLoading>
  );
}
