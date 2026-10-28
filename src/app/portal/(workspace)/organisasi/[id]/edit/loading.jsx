import {
  AdminPageLoading,
  LoadingBlock,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function EditOrganizationLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir ubah organisasi"
      eyebrow="Tata kelola kelembagaan"
      title="Ubah organisasi"
      description="Perbarui identitas dan kontak organisasi jika ada perubahan. Jika organisasi dinonaktifkan, dataset dan riwayat yang sudah tercatat tetap disimpan."
      contextGuide
    >
      <section
        className="w-full portal-form-card max-w-none space-y-5 p-5 sm:p-8"
        aria-busy="true"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 border-b border-line pb-2">
            <h2 className="text-sm font-semibold text-ink">
              1. Identitas organisasi
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Kode, alamat halaman, dan nama resmi menjadi identitas utama.
              Kontak dapat dilengkapi setelahnya.
            </p>
          </div>
          <LoadingField label="Kode organisasi" name="code" />
          <LoadingField label="Bagian alamat halaman organisasi" name="slug" />
          <LoadingField
            label="Nama resmi organisasi"
            name="name"
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2 border-b border-line pb-2 pt-2">
            <h2 className="text-sm font-semibold text-ink">
              2. Kontak dan informasi tambahan (opsional)
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Tambahkan kanal resmi agar publik dapat menemukan pengampu data.
            </p>
          </div>
          <LoadingField label="Nama singkat" name="short_name" />
          <LoadingField label="Email resmi" name="official_email" />
          <LoadingField
            label="Situs resmi"
            name="official_url"
            className="sm:col-span-2"
          />
          <LoadingField
            label="Deskripsi"
            name="description"
            height="h-24"
            className="sm:col-span-2"
          />
        </div>
        <div>
          <div className="flex items-center gap-3 text-sm">
            <LoadingBlock className="size-4 rounded border" />
            <span>Organisasi aktif</span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            Matikan akses jika pengguna atau organisasi tidak lagi berwenang.
            Catatan aktivitas sebelumnya tetap tersimpan.
          </p>
        </div>
        <div className="inline-flex h-11 items-center rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
          Simpan perubahan
        </div>
      </section>
    </AdminPageLoading>
  );
}
