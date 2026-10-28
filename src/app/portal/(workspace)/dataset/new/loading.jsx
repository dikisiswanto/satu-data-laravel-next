import { siteConfig } from "@/lib/site-config";
import {
  AdminPageLoading,
  LoadingBlock,
  LoadingField,
} from "@/components/admin/admin-page-loading";
import { DatasetPreparationAssistant } from "@/components/admin/dataset-preparation-assistant";
import { DatasetLifecycleGuide } from "@/components/admin/dataset-lifecycle-guide";

export default function NewDatasetLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir dataset"
      eyebrow="Pengelolaan data"
      title="Buat dataset"
      description="Mulai dengan informasi dasar dataset. Jika perlu, unduh template untuk menata kolom. Metadata standar nasional dapat dilengkapi setelah rujukan resminya tersedia. Dataset baru tampil di portal publik setelah selesai diperiksa dan diterbitkan."
      contextGuide
    >
      <DatasetLifecycleGuide
        activeStep={1}
        completedThrough={0}
        compact
        heading="Mulai dari draf, lalu lanjutkan bertahap"
        description="Untuk mulai cukup isi judul dan organisasi pengampu. Unggah sumber dan lengkapi persyaratan pemeriksaan setelah draf tersimpan."
      />
      {/******** Static loading shell mirrors the resolved page order. ********/}
      {/^kabupaten wajo$/i.test(siteConfig.regionName) ? (
        <details className="mb-4 w-full max-w-none rounded-2xl border border-[#d7e7e1] bg-[#f1f8f4] p-4 sm:p-5">
          <summary className="cursor-pointer font-semibold text-[#214f3c]">
            Sumber resmi untuk membantu memeriksa data
          </summary>
          <p className="mt-2 text-sm leading-6 text-[#456857]">
            Buka rujukan ini untuk memeriksa definisi, angka, dan asal data.
            Daftar ini bukan dataset yang sudah diimpor atau ditetapkan sebagai
            prioritas resmi.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <LoadingBlock key={index} className="h-10 rounded-lg" />
            ))}
          </div>
        </details>
      ) : null}
      <section
        id="dataset-create-form-loading"
        className="portal-form-card w-full max-w-none space-y-5 p-4 sm:p-6 lg:p-7"
        aria-busy="true"
      >
        <div className="portal-form-section space-y-4 border p-4 sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Informasi utama</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Mulai dari nama data, penjelasan singkat, dan pihak yang
              bertanggung jawab.
            </p>
          </div>
          <LoadingField label="Judul dataset" name="title" required />
          <LoadingField
            label="Deskripsi (wajib sebelum pemeriksaan; opsional saat draf)"
            name="description"
            height="h-32"
          />
          <LoadingField
            label="Organisasi pengampu"
            name="organization_id"
            required
            controlText="Cari lalu pilih organisasi…"
          />
        </div>
        <details className="rounded-xl border border-[#dce5eb] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Lengkapi informasi data (opsional saat membuat draf)
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2" aria-hidden="true">
            <LoadingField
              label="Nama sumber data (wajib sebelum pemeriksaan)"
              name="source_name"
            />
            <LoadingField
              label="Cakupan wilayah (wajib sebelum pemeriksaan)"
              name="geographic_scope"
              controlText={`Contoh: ${siteConfig.regionName}`}
            />
            <LoadingField
              label="Lisensi / ketentuan penggunaan (wajib sebelum pemeriksaan)"
              name="license_text"
              controlText="Contoh: lisensi atau ketentuan penggunaan yang telah disetujui"
            />
            <LoadingField
              label="Frekuensi pembaruan (wajib sebelum pemeriksaan)"
              name="update_frequency"
              controlText="Pilih frekuensi jika sudah diketahui"
            />
            <LoadingField
              label="Awal periode data"
              name="reference_period_start"
              controlText="Pilih tanggal"
            />
            <LoadingField
              label="Akhir periode data"
              name="reference_period_end"
              controlText="Pilih tanggal"
            />
          </div>
        </details>
        <div
          className="group rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5"
          aria-hidden="true"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-base font-semibold text-[#193d59]">
            <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
            <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
              Bisa dilengkapi setelah draf
            </span>
          </div>
        </div>
        <details className="rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Periksa kembali sebelum menyimpan
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sebelum pemeriksaan, lengkapi informasi wajib dan pastikan berkas
            sumber lolos validasi.
          </p>
        </details>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <div className="h-11 w-40 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan sebagai draf
          </div>
          <p className="text-xs leading-5 text-muted">
            Judul dan organisasi pengampu wajib untuk membuat draf. Berkas
            sumber diunggah setelah draf dibuat.
          </p>
        </div>
      </section>
      <DatasetPreparationAssistant />
    </AdminPageLoading>
  );
}
