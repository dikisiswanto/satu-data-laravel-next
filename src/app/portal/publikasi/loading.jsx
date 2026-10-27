import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
} from "@/components/admin/admin-page-loading";

export default function PublicationQueueLoading() {
  return (
    <AdminPageLoading
      label="Membuka antrean publikasi"
      eyebrow="Tata kelola"
      title="Pemeriksaan data"
      description="Periksa metadata, sumber, periode, dan hasil pengolahan berkas. Jika ada informasi yang belum jelas, kembalikan dengan catatan perbaikan yang spesifik."
      contextGuide
    >
      <section
        id="portal-review-list"
        className="portal-workspace-panel"
        aria-busy="true"
      >
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar pemeriksaan</h2>
            <p className="mt-1 text-sm text-muted">
              Dataset yang menunggu keputusan pemeriksaan atau telah terbit,
              sesuai cakupan akses Anda.
            </p>
          </div>
          <LoadingBlock className="h-8 w-28 rounded-full" />
        </div>
        <LoadingRows columns={5} rows={6} />
      </section>
    </AdminPageLoading>
  );
}
