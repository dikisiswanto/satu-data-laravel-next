import {
  AdminPageLoading,
  LoadingBlock,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function NewOrganizationLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir organisasi"
      eyebrow="Tata kelola kelembagaan"
      title="Tambah organisasi"
      description="Masukkan kode dan nama resmi organisasi. Jika tersedia, tambahkan email atau situs resmi agar pengguna dapat menghubungi pengampu data."
      contextGuide
    >
      <section
        className="portal-form-card max-w-3xl space-y-5 p-5 sm:p-8"
        aria-busy="true"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingField
            label="Kode organisasi"
            name="code"
            required
            controlText="DISKOMINFO"
          />
          <LoadingField
            label="Bagian alamat halaman organisasi"
            name="slug"
            required
            controlText="dinas-komunikasi-informatika"
          />
          <LoadingField
            label="Nama resmi organisasi"
            name="name"
            required
            className="sm:col-span-2"
          />
          <LoadingField label="Nama singkat" name="short_name" />
          <LoadingField label="Email resmi" name="official_email" />
          <LoadingField
            label="Situs resmi"
            name="official_url"
            controlText="https://..."
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
          Simpan organisasi
        </div>
      </section>
    </AdminPageLoading>
  );
}
