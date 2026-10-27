import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
  LoadingTableToolbar,
} from "@/components/admin/admin-page-loading";

export default function AdminActivityLoading() {
  return (
    <AdminPageLoading
      label="Memuat riwayat perubahan"
      eyebrow="Akuntabilitas"
      title="Riwayat perubahan"
      description="Lihat siapa yang mengubah data, perubahan apa yang dilakukan, dan kapan waktunya. Daftar yang tampil menyesuaikan akses akun Anda."
      contextGuide
    >
      <section className="portal-workspace-panel" aria-busy="true">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Riwayat aktivitas</h2>
            <p className="mt-1 text-sm text-muted">
              Cari berdasarkan pengguna, tindakan, ID data, organisasi, atau
              hasil. Gunakan filter dan rentang tanggal untuk menemukan
              aktivitas tertentu.
            </p>
          </div>
          <LoadingBlock className="h-8 w-28 rounded-full" />
        </div>
        <LoadingTableToolbar
          searchPlaceholder="Cari pelaku, tindakan, ID objek, organisasi, atau rincian…"
          dateFilterLabel="Waktu peristiwa"
          filters={["Hasil", "Jenis objek", "Peristiwa", "Organisasi"]}
        />
        <LoadingRows
          headers={[
            "Tindakan",
            "Pelaku",
            "Objek",
            "Lingkup",
            "Waktu (WITA)",
            "Hasil",
            "Rincian / permintaan",
          ]}
          rows={7}
        />
      </section>
    </AdminPageLoading>
  );
}
