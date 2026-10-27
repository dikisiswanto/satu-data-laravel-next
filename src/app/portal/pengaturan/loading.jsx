import {
  AdminPageLoading,
  LoadingBlock,
  LoadingField,
} from "@/components/admin/admin-page-loading";

export default function AccountSettingsLoading() {
  return (
    <AdminPageLoading
      label="Memuat pengaturan akun"
      eyebrow="Akun"
      title="Pengaturan akun"
      description="Periksa identitas akun, perbarui nama tampilan, atau ganti kata sandi."
      contextGuide
    >
      <section
        className="w-full portal-form-card p-5 sm:p-7 lg:p-8"
        aria-busy="true"
      >
        <dl className="space-y-4">
          {[
            ["Email akun", "w-56"],
            ["Nama tampilan", "w-48"],
            ["Status akun", "w-24"],
          ].map(([label, width]) => (
            <div key={label} className="border-b pb-4">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-2">
                <LoadingBlock className={`h-5 max-w-full ${width}`} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 space-y-4 portal-form-section" aria-hidden="true">
          <LoadingField label="Nama tampilan" name="display_name" />
          <div className="inline-flex h-10 items-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white">
            Simpan perubahan
          </div>
        </div>
        <section className="mt-8 portal-form-section">
          <h2 className="font-semibold">Ubah kata sandi</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Gunakan kata sandi unik minimal 12 karakter, dengan huruf besar,
            huruf kecil, dan angka.
          </p>
          <div className="mt-4 space-y-4" aria-hidden="true">
            <LoadingField label="Kata sandi baru" name="new-password" />
            <LoadingField
              label="Konfirmasi kata sandi"
              name="confirm-password"
            />
            <div className="inline-flex h-10 items-center rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white">
              Perbarui kata sandi
            </div>
          </div>
        </section>
        <p className="mt-5 text-sm leading-6 text-muted">
          Email masuk dan perlindungan akun dikelola oleh layanan keamanan.
          Untuk mengubah peran atau akses organisasi, hubungi administrator.
          Perubahan akses dicatat dalam riwayat aktivitas.
        </p>
      </section>
    </AdminPageLoading>
  );
}
