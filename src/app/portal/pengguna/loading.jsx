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
      <div className="grid gap-5 xl:grid-cols-2" aria-hidden="true">
        <section className="rounded-card border bg-white p-5">
          <h2 className="font-semibold">Undang pengguna</h2>
          <LoadingBlock className="mt-4 h-4 w-full" />
          <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
          <LoadingBlock className="mt-4 h-4 w-5/6" />
          <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
          <LoadingBlock className="mt-4 h-11 w-36 rounded-control" />
        </section>
        <section className="rounded-card border bg-white p-5">
          <LoadingBlock className="h-5 w-2/3 max-w-full" />
          <LoadingBlock className="mt-3 h-4 w-full" />
          <LoadingBlock className="mt-2 h-4 w-5/6" />
          <LoadingBlock className="mt-4 h-11 w-full rounded-control" />
          <LoadingBlock className="mt-4 h-11 w-36 rounded-control" />
        </section>
      </div>
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
