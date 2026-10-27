import Link from "next/link";
import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
} from "@/components/admin/admin-page-loading";

export default function IndicatorObservationsLoading() {
  return (
    <AdminPageLoading
      label="Memuat observasi indikator"
      eyebrow="Statistik dan indikator"
      title="Observasi indikator"
      description="Tambahkan dan kelola nilai untuk tiap periode, wilayah, atau dimensi. Nilai berstatus Draf belum tersedia di API publik sampai diperiksa dan diterbitkan."
    >
      <Link
        href="/portal/statistik"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        Kembali ke indikator
      </Link>
      <section
        className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5"
        aria-busy="true"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Indikator
        </p>
        <LoadingBlock className="mt-2 h-7 w-3/4 max-w-xl" />
        <LoadingBlock className="mt-3 h-4 w-full max-w-3xl" />
        <div className="mt-3 flex flex-wrap gap-2">
          <LoadingBlock className="h-7 w-40 rounded-full" />
          <LoadingBlock className="h-7 w-32 rounded-full" />
        </div>
        <p className="mt-3 text-xs text-muted">Alamat API nilai indikator:</p>
        <LoadingBlock className="mt-1 h-4 w-80 max-w-full" />
      </section>
      {/* Pengisian observasi bergantung pada hak edit. Gunakan placeholder netral sampai server memastikan peran akun. */}
      <section
        className="portal-form-card mb-6 max-w-4xl space-y-5 p-5 sm:p-7"
        aria-busy="true"
        aria-hidden="true"
      >
        <div className="flex items-start gap-3">
          <LoadingBlock className="mt-0.5 size-5 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <LoadingBlock className="h-5 w-40 max-w-full" />
            <LoadingBlock className="h-4 w-full max-w-2xl" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className={i === 10 ? "sm:col-span-2" : ""}>
              <LoadingBlock className="h-4 w-36 max-w-full" />
              <LoadingBlock className="mt-2 h-11 w-full rounded-control" />
              <LoadingBlock className="mt-2 h-3 w-4/5 max-w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <LoadingBlock className="h-11 w-40 rounded-xl" />
          <LoadingBlock className="h-4 w-64 max-w-full" />
        </div>
      </section>
      <section className="portal-workspace-panel" aria-busy="true">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Riwayat observasi</h2>
            <p className="mt-1 text-sm text-muted">
              Versi sebelumnya tetap tersimpan untuk jejak audit. Hanya
              observasi berstatus terbit dan aktif yang disajikan oleh API
              publik.
            </p>
          </div>
          <LoadingBlock className="h-5 w-24 rounded-full" />
        </div>
        <LoadingRows
          headers={[
            "Periode / wilayah",
            "Nilai",
            "Sumber",
            "Status / revisi",
            "Tindakan",
          ]}
          rows={5}
        />
      </section>
      <Link
        href="/portal/statistik"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
      >
        Kembali ke indikator statistik
      </Link>
    </AdminPageLoading>
  );
}
