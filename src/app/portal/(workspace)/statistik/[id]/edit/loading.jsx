import {
  AdminPageLoading,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function EditIndicatorLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir ubah indikator"
      eyebrow="Indikator statistik"
      title="Ubah indikator"
      description="Perubahan akan disimpan sebagai draf terlebih dahulu. Periksa kembali definisi dan sumbernya sebelum menerbitkan indikator."
      contextGuide
    >
      <section
        className="w-full portal-form-card max-w-none space-y-6 p-5 sm:p-8"
        aria-busy="true"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingField label="Kode indikator" name="code" />
          <LoadingField label="Bagian alamat halaman indikator" name="slug" />
          <LoadingField
            label="Nama indikator"
            name="title"
            className="sm:col-span-2"
          />
          <LoadingField
            label="Definisi indikator *"
            name="definition"
            height="h-28"
            className="sm:col-span-2"
          />
          <LoadingField label="Satuan" name="unit" />
          <LoadingField label="Sumber data" name="source_name" />
          <LoadingField
            label="Organisasi pengampu *"
            name="organization_id"
            controlText="Pilih organisasi"
          />
          <LoadingField
            label="Label periode"
            name="period_label"
            controlText="2025 atau Triwulan I 2026"
          />
          <LoadingField label="Nilai numerik" name="value_numeric" />
          <LoadingField label="Nilai teks (alternatif)" name="value_text" />
          <LoadingField
            label="Awal periode"
            name="reference_period_start"
            controlText="Pilih tanggal"
          />
          <LoadingField
            label="Akhir periode"
            name="reference_period_end"
            controlText="Pilih tanggal"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <div className="inline-flex h-11 items-center rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan sebagai draf
          </div>
          <p className="text-xs leading-5 text-muted">
            Draf belum tampil di portal publik.
          </p>
        </div>
      </section>
    </AdminPageLoading>
  );
}
