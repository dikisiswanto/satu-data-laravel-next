import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
  LoadingTableToolbar,
} from "@/components/admin/admin-page-loading";

export default function AdminUsersLoading() {
  return (
    <AdminPageLoading
      label="Memuat pengguna dan akses"
      eyebrow="Administrasi akses"
      title="Pengguna dan akses"
      description="Atur akses sesuai pekerjaan dan organisasi pengguna. Pilih akses yang paling terbatas tetapi tetap cukup untuk tugasnya."
      contextGuide
    >
      <section
        className="w-full rounded-card border bg-white p-4 sm:p-5"
        aria-busy="true"
      >
        <h2 className="text-base font-semibold text-ink">
          Tambahkan pengguna atau akses
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Pilih berdasarkan kondisi akun. Pengguna baru cukup diundang sekali;
          akun yang sudah ada dapat diberi akses tambahan.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" aria-hidden="true">
          <div className="h-11 rounded-lg border border-[#cbdce7] bg-[#f6f9fb]" />
          <div className="h-11 rounded-lg border border-line bg-white" />
        </div>
        <section
          className="mt-4 space-y-4 rounded-card border border-line p-4"
          aria-hidden="true"
        >
          <LoadingBlock className="h-4 w-2/3 max-w-full" />
          <LoadingBlock className="h-4 w-full" />
          <LoadingBlock className="h-11 w-full rounded-control" />
          <LoadingBlock className="h-4 w-5/6" />
          <LoadingBlock className="h-11 w-full rounded-control" />
          <LoadingBlock className="h-11 w-36 rounded-control" />
        </section>
      </section>
      <section className="portal-workspace-panel mt-8" aria-busy="true">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar akses</h2>
            <p className="mt-1 text-sm text-muted">
              Setiap baris menunjukkan satu peran pengguna pada lingkup global
              atau organisasi tertentu.
            </p>
          </div>
          <LoadingBlock className="h-8 w-24 rounded-full" />
        </div>
        <LoadingTableToolbar filters={["Peran", "Status", "Organisasi"]} />
        <LoadingRows
          headers={["Lingkup", "Peran", "Ditambahkan", "Status", "Tindakan"]}
          rows={6}
        />
      </section>
      <p className="mt-4 text-xs leading-5 text-muted">
        Untuk pengguna yang sudah memiliki akun, pilih ID akun lengkap lalu
        tetapkan peran dan lingkup organisasinya. Untuk mencabut akses,
        nonaktifkan aksesnya agar riwayat aktivitas tetap dapat ditelusuri.
      </p>
    </AdminPageLoading>
  );
}
