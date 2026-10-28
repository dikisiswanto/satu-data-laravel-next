import Link from "next/link";
import {
  AdminPageLoading,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function EditDatasetLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir ubah dataset"
      eyebrow="Informasi dataset"
      title="Ubah informasi dataset"
      description="Simpan informasi sedikit demi sedikit selama dataset masih berstatus Draf. Informasi yang wajib untuk pemeriksaan ditandai; metadata SDI lanjutan dapat dilengkapi setelah rujukan resmi tersedia."
      contextGuide
    >
      <Link
        href="/portal/dataset"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
        prefetch={false}
      >
        ← Kembali ke dataset
      </Link>
      <section
        className="w-full portal-form-card space-y-5 p-5 sm:p-8"
        aria-busy="true"
      >
        <div className="rounded-xl border border-[#d8e4eb] bg-[#f5f9fc] p-4 text-sm leading-6 text-[#355469]">
          Simpan perubahan sedikit demi sedikit. Informasi yang wajib untuk
          pemeriksaan dapat dilengkapi selama draf.
        </div>
        <div className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">1. Informasi utama</h2>
          <LoadingField label="Judul" name="title" required />
          <LoadingField
            label="Deskripsi (wajib sebelum pemeriksaan)"
            name="description"
            height="h-32"
          />
        </div>
        <div className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">
            2. Klasifikasi, sumber, dan periode
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <LoadingField label="Kategori" name="category" />
            <LoadingField
              label="Kata kunci (pisahkan dengan koma)"
              name="keywords"
            />
            <LoadingField
              label="Nama sumber data (wajib sebelum pemeriksaan)"
              name="source_name"
            />
            <LoadingField label="URL sumber" name="source_url" />
            <LoadingField
              label="Cakupan wilayah (wajib sebelum pemeriksaan)"
              name="geographic_scope"
            />
            <LoadingField
              label="Lisensi atau ketentuan penggunaan (wajib sebelum pemeriksaan)"
              name="license_text"
            />
            <LoadingField label="Satuan" name="unit" />
            <LoadingField
              label="Frekuensi pembaruan (wajib sebelum pemeriksaan)"
              name="update_frequency"
              controlText="Belum ditentukan"
            />
            <LoadingField label="Awal periode" name="reference_period_start" />
            <LoadingField label="Akhir periode" name="reference_period_end" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink">
            3. Metode dan kepatuhan SDI
          </h2>
          <LoadingField label="Metodologi" name="methodology" height="h-24" />
          <div
            className="rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5"
            aria-hidden="true"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-base font-semibold text-[#193d59]">
              <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
              <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
                Bisa dilengkapi setelah draf
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <div className="h-11 w-40 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan perubahan
          </div>
          <p className="text-xs leading-5 text-muted">
            Kelengkapan metadata akan diperiksa saat pengajuan.
          </p>
        </div>
      </section>
    </AdminPageLoading>
  );
}
