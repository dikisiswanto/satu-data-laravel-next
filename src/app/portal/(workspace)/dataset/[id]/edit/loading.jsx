import Link from "next/link";
import {
  AdminPageLoading,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function EditDatasetLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir ubah dataset"
      eyebrow="Metadata dataset"
      title="Ubah metadata dataset"
      description="Kelola identitas, penemuan, sumber, dan standar secara terpisah. Simpan perubahan bertahap saat draf; persyaratan pemeriksaan tetap ditampilkan dengan jelas."
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
          Metadata menjelaskan dataset; berkas sumber dan hasil pengolahan
          dikelola pada halaman detail dataset. Kolom wajib pemeriksaan dapat
          dilengkapi bertahap selama draf.
        </div>
        <nav
          aria-label="Bagian metadata dataset"
          className="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3"
        >
          {[
            "Identitas",
            "Kategori dan kata kunci",
            "Sumber dan periode",
            "Standar SDI",
          ].map((label) => (
            <span
              key={label}
              className="inline-flex min-h-9 items-center rounded-control border border-line px-3 py-2 text-xs font-semibold"
            >
              {label}
            </span>
          ))}
        </nav>
        <section
          className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
          aria-labelledby="metadata-primary-title"
        >
          <h2
            id="metadata-primary-title"
            className="text-sm font-semibold text-ink"
          >
            1. Informasi utama
          </h2>
          <LoadingField label="Judul" name="title" required />
          <LoadingField
            label="Deskripsi (wajib sebelum pemeriksaan)"
            name="description"
            height="h-32"
          />
        </section>
        <section
          className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
          aria-labelledby="metadata-discovery-title"
        >
          <h2
            id="metadata-discovery-title"
            className="text-sm font-semibold text-ink"
          >
            2. Kategori dan kata kunci
          </h2>
          <p className="text-xs leading-5 text-muted">
            Kategori membantu pengelompokan; kata kunci membantu pencarian.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <LoadingField label="Kategori" name="category" />
            <LoadingField
              label="Kata kunci (pisahkan dengan koma)"
              name="keywords"
            />
          </div>
        </section>
        <section
          className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
          aria-labelledby="metadata-source-title"
        >
          <h2
            id="metadata-source-title"
            className="text-sm font-semibold text-ink"
          >
            3. Sumber, cakupan, dan periode
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <LoadingField
              label="Sumber / penerbit data (wajib sebelum pemeriksaan)"
              name="source_name"
            />
            <LoadingField label="URL rujukan sumber" name="source_url" />
            <LoadingField
              label="Cakupan wilayah (wajib sebelum pemeriksaan)"
              name="geographic_scope"
            />
            <LoadingField
              label="Lisensi / ketentuan penggunaan (wajib sebelum pemeriksaan)"
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
        </section>
        <section
          className="space-y-4 rounded-xl border border-[#e1e8ed] p-4 sm:p-5"
          aria-labelledby="metadata-method-title"
        >
          <h2
            id="metadata-method-title"
            className="text-sm font-semibold text-ink"
          >
            4. Definisi, metode, dan standar SDI
          </h2>
          <LoadingField label="Metodologi" name="methodology" height="h-24" />
          <div
            className="rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5"
            aria-hidden="true"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-base font-semibold text-[#193d59]">
              <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
              <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
                Dilengkapi dari rujukan resmi
              </span>
            </div>
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <div className="h-11 w-40 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan perubahan
          </div>
          <p className="text-xs leading-5 text-muted">
            Kelengkapan metadata diperiksa saat pengajuan.
          </p>
        </div>
      </section>
    </AdminPageLoading>
  );
}
