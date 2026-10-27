import {
  AdminPageLoading,
  LoadingBlock,
  LoadingField,
} from "@/components/admin/admin-page-loading";
import { DatasetPreparationAssistant } from "@/components/admin/dataset-preparation-assistant";

export default function NewDatasetLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir dataset"
      eyebrow="Pengelolaan data"
      title="Buat dataset"
      description="Mulai dengan informasi dasar dataset. Jika perlu, unduh template untuk menata kolom. Metadata standar nasional dapat dilengkapi setelah rujukan resminya tersedia. Dataset baru tampil di portal publik setelah selesai diperiksa dan diterbitkan."
      contextGuide
    >
      <details className="mb-4 max-w-3xl rounded-2xl border border-[#d7e7e1] bg-[#f1f8f4] p-4 sm:p-5">
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
      <DatasetPreparationAssistant />
      <section
        id="dataset-create-form-loading"
        className="portal-form-card w-full max-w-none space-y-6 p-5 sm:p-8"
        aria-busy="true"
      >
        <LoadingField label="Judul dataset" name="title" required />
        <LoadingField
          label="Deskripsi"
          name="description"
          height="h-32"
          required
        />
        <LoadingField
          label="Organisasi pengampu"
          name="organization_id"
          required
          controlText="Cari lalu pilih organisasi…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingField label="Nama sumber data" name="source_name" required />
          <LoadingField
            label="Cakupan wilayah"
            name="geographic_scope"
            controlText="Contoh: Kabupaten Wajo"
            required
          />
          <LoadingField
            label="Lisensi / ketentuan penggunaan"
            name="license_text"
            controlText="Contoh: lisensi atau ketentuan penggunaan yang telah disetujui"
            required
          />
          <LoadingField
            label="Frekuensi pembaruan"
            name="update_frequency"
            controlText="Pilih frekuensi"
            required
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
        <div
          className="group rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5"
          aria-hidden="true"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg text-base font-semibold text-[#193d59]">
            <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
            <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
              Bisa dilengkapi setelah draf
            </span>
          </div>
        </div>
        <section className="rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-ink">Sebelum menyimpan draf</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Periksa apakah sumber dapat dibuka dan tautannya mengarah ke
              dokumen yang tepat.
            </li>
            <li>
              Periksa periode awal dan akhir; tanggal akhir tidak boleh lebih
              awal dari tanggal mulai.
            </li>
            <li>
              Lengkapi satuan, metodologi, kata kunci, dan lisensi pada tahap
              penyuntingan berikutnya.
            </li>
            <li>
              Dataset disimpan sebagai draf. Data belum terlihat publik sampai
              melalui pemeriksaan dan publikasi.
            </li>
          </ul>
        </section>
        <div className="flex flex-wrap gap-3 border-t pt-5">
          <div className="h-11 w-40 rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan sebagai draf
          </div>
          <p className="self-center text-xs leading-5 text-muted">
            Field bertanda * wajib diisi. Berkas sumber diunggah setelah draf
            dibuat.
          </p>
        </div>
      </section>
    </AdminPageLoading>
  );
}
