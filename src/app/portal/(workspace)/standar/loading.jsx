import {
  AdminPageLoading,
  LoadingBlock,
} from "@/components/admin/admin-page-loading";

export default function SdiStandardsLoading() {
  return (
    <AdminPageLoading
      label="Memuat standar dan kode referensi"
      eyebrow="Interoperabilitas dan tata kelola"
      title="Standar dan kode referensi"
      description="Daftarkan standar dan sistem kode yang menjadi acuan metadata dataset. Catatan baru berstatus Draf sampai sumber, dokumen pendukung, versi, dan masa berlakunya diperiksa."
    >
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {[
          [
            "Standar terdaftar",
            "Menampilkan semua versi yang dapat Anda akses",
          ],
          [
            "Standar terverifikasi",
            "Sumber dan dokumen pendukung sudah diperiksa",
          ],
          ["Sistem kode terverifikasi", "Entri kode dapat diperiksa"],
        ].map(([label, detail]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-white p-4 sm:p-5"
          >
            <p className="text-sm text-muted">{label}</p>
            <LoadingBlock className="mt-2 h-9 w-20" />
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-6" aria-hidden="true">
        {/* Formulir pendaftaran hanya tersedia untuk pengelola registri. Karena hak akses baru diketahui setelah data sesi dimuat, gunakan skeleton netral agar label khusus pengelola tidak muncul lalu menghilang bagi peran lain. */}
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="w-full portal-form-card space-y-4 p-4 sm:p-5">
            <LoadingBlock className="h-5 w-44 max-w-full" />
            <LoadingBlock className="h-4 w-full max-w-md" />
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <LoadingBlock className="h-4 w-28 max-w-full" />
                <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
              </div>
            ))}
            <LoadingBlock className="h-11 w-40 rounded-control" />
          </section>
          <section className="w-full portal-form-card space-y-4 p-4 sm:p-5">
            <LoadingBlock className="h-5 w-56 max-w-full" />
            <LoadingBlock className="h-4 w-full max-w-md" />
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i}>
                <LoadingBlock className="h-4 w-32 max-w-full" />
                <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
              </div>
            ))}
            <LoadingBlock className="h-11 w-40 rounded-control" />
          </section>
          <section className="w-full portal-form-card space-y-4 p-4 sm:p-5 xl:col-span-2">
            <LoadingBlock className="h-5 w-48 max-w-full" />
            <LoadingBlock className="h-4 w-full max-w-lg" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <LoadingBlock className="h-4 w-32 max-w-full" />
                  <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
                </div>
              ))}
            </div>
            <LoadingBlock className="h-11 w-40 rounded-control" />
          </section>
        </div>
        <section className="portal-workspace-panel">
          <div className="portal-panel-heading">
            <div>
              <h2 className="text-base font-semibold">Registri standar</h2>
              <p className="mt-1 text-sm text-muted">
                Standar yang menjadi referensi metadata dataset.
              </p>
            </div>
            <LoadingBlock className="h-5 w-24" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="border-b p-4 last:border-0">
              <LoadingBlock className="h-4 w-48 max-w-full" />
              <LoadingBlock className="mt-2 h-4 w-3/4" />
              <LoadingBlock className="mt-2 h-3 w-36" />
            </div>
          ))}
        </section>
        <section className="portal-workspace-panel">
          <div className="portal-panel-heading">
            <div>
              <h2 className="text-base font-semibold">Sistem kode referensi</h2>
              <p className="mt-1 text-sm text-muted">
                Sistem kode yang ditetapkan oleh otoritas sumber.
              </p>
            </div>
            <LoadingBlock className="h-5 w-24" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="border-b p-4 last:border-0">
              <LoadingBlock className="h-4 w-48 max-w-full" />
              <LoadingBlock className="mt-2 h-4 w-3/4" />
              <LoadingBlock className="mt-2 h-3 w-36" />
            </div>
          ))}
        </section>
        <section className="portal-workspace-panel">
          <div className="portal-panel-heading">
            <div>
              <h2 className="text-base font-semibold">Entri kode tersimpan</h2>
              <p className="mt-1 text-sm text-muted">
                Entri publik hanya tersedia ketika sistem referensinya sudah
                diverifikasi dan masa berlakunya aktif.
              </p>
            </div>
            <LoadingBlock className="h-5 w-24" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Sistem</th>
                  <th className="p-3">Status sistem</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {Array.from({ length: 4 }, (_, j) => (
                      <td key={j} className="p-3">
                        <LoadingBlock className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <span aria-hidden="true">ⓘ</span>Status terverifikasi merupakan
          keputusan kurator internal setelah memeriksa sumber dan bukti; status
          ini bukan sertifikasi oleh BPS, BIG, Kemendagri, atau pengelola SDI
          nasional.
        </p>
      </div>
    </AdminPageLoading>
  );
}
