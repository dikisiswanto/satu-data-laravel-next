import {
  AdminPageLoading,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function NewIndicatorLoading() {
  return (
    <AdminPageLoading
      label="Memuat formulir indikator baru"
      eyebrow="Indikator statistik"
      title="Indikator baru"
      description="Terangkan apa yang diukur, satuan yang dipakai, asal nilai, dan periode datanya. Informasi ini membantu orang lain membaca indikator dengan benar."
      contextGuide
    >
      <section
        className="w-full portal-form-card max-w-none space-y-6 p-5 sm:p-8"
        aria-busy="true"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 border-b border-line pb-2">
            <h2 className="text-sm font-semibold text-ink">
              1. Identitas indikator
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Kode, alamat halaman, dan nama membantu indikator dikenali secara
              konsisten.
            </p>
          </div>
          <LoadingField
            label="Kode indikator"
            name="code"
            controlText="IND-001"
            required
          />
          <LoadingField
            label="Bagian alamat halaman indikator"
            name="slug"
            controlText="jumlah-penduduk"
            required
          />
          <LoadingField
            label="Nama indikator"
            name="title"
            required
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2 border-b border-line pb-2 pt-2">
            <h2 className="text-sm font-semibold text-ink">
              2. Definisi dan pengampu
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Jelaskan arti indikator, satuan ukur, sumber nilai, dan organisasi
              yang bertanggung jawab.
            </p>
          </div>
          <LoadingField
            label="Definisi indikator *"
            name="definition"
            height="h-28"
            className="sm:col-span-2"
          />
          <LoadingField
            label="Satuan"
            name="unit"
            controlText="Orang, persen, ton"
            required
          />
          <LoadingField label="Sumber data" name="source_name" required />
          <LoadingField
            label="Organisasi pengampu *"
            name="organization_id"
            controlText="Pilih organisasi"
          />
          <div className="sm:col-span-2 border-b border-line pb-2 pt-2">
            <h2 className="text-sm font-semibold text-ink">
              3. Periode dan nilai awal (opsional)
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              Isi jika nilai awal sudah tersedia. Nilai yang masih draf tidak
              ditampilkan pada API publik.
            </p>
          </div>
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
