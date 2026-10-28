import Link from "next/link";
import { ArrowRight, ClipboardCheck, Database, FileClock } from "lucide-react";
import { PortalLoadingFrame } from "@/components/admin/portal-loading-frame";
import {
  LoadingTableToolbar,
  LoadingRows,
} from "@/components/admin/admin-page-loading";

function Block({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

export default function PortalDashboardLoading() {
  return (
    <PortalLoadingFrame label="Memuat ringkasan pengelola">
      <div
        id="portal-dashboard-overview"
        className="portal-dashboard-heading mb-6 rounded-xl border border-[#d9e2e9] bg-white p-5 sm:p-6"
      >
        <p className="eyebrow">Ringkasan</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Selamat datang
        </h1>
        <p className="mt-2 flex min-h-6 max-w-2xl min-w-0 items-center gap-1.5 text-sm leading-6 text-muted">
          <span className="shrink-0 font-medium text-ink">Akun:</span>
          <Block className="inline-block h-4 w-40 max-w-full align-middle" />
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Lihat daftar dataset, status pemeriksaan, dan pekerjaan yang masih
          perlu diselesaikan.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Block className="min-h-8 w-44 rounded-full" />
          <Block className="h-9 w-36 rounded-control" />
          <Link
            href="/portal/dataset"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
            prefetch={false}
          >
            Kelola dataset <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div
        className="portal-dashboard-kpis grid grid-cols-1 gap-4 sm:grid-cols-3"
        aria-hidden="true"
      >
        <div className="rounded-xl border border-[#d5e1e8] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Dataset dalam cakupan</p>
            <Database size={18} />
          </div>
          <Block className="mt-4 h-9 w-20" />
          <p className="mt-1 text-xs text-muted">
            Seluruh dataset dalam cakupan akses Anda
          </p>
        </div>
        <div className="rounded-xl border border-[#e6dfce] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Perlu diperiksa</p>
            <ClipboardCheck size={18} />
          </div>
          <Block className="mt-4 h-9 w-20" />
          <p className="mt-1 text-xs text-muted">Menunggu pemeriksaan</p>
        </div>
        <div className="rounded-xl border border-[#d8e5dc] bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Masih dikerjakan</p>
            <FileClock size={18} />
          </div>
          <Block className="mt-4 h-9 w-20" />
          <p className="mt-1 text-xs text-muted">
            Belum diajukan untuk diperiksa
          </p>
        </div>
      </div>

      <section
        className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]"
        aria-labelledby="portal-next-steps-title"
        aria-hidden="true"
      >
        <article className="rounded-2xl border border-[#dce5eb] bg-white p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#55788d]">
            Langkah berikutnya
          </p>
          <Block className="mt-2 h-6 w-64 max-w-full" />
          <Block className="mt-3 h-4 w-full" />
          <Block className="mt-2 h-4 w-4/5" />
          <Block className="mt-4 h-10 w-48 rounded-control" />
        </article>
        <aside className="rounded-2xl border border-[#dce5eb] bg-[#f8fbfd] p-5 sm:p-6">
          <h2 className="text-base font-semibold">Akses cepat</h2>
          <Block className="mt-2 h-4 w-4/5" />
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 border-b border-[#e2eaf0] py-3 last:border-b-0"
            >
              <Block className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <Block className="h-4 w-36 max-w-full" />
                <Block className="mt-2 h-3 w-full" />
                <Block className="mt-2 h-3 w-4/5" />
              </div>
            </div>
          ))}
        </aside>
      </section>

      <section
        className="mt-6 overflow-hidden rounded-2xl border border-[#dce5eb] bg-white"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-4 border-b p-5">
          <div>
            <h2 className="font-semibold">Dataset terbaru</h2>
            <p className="mt-1 text-sm text-muted">
              Menampilkan dataset yang terakhir diperbarui dan berada dalam
              cakupan akses Anda.
            </p>
          </div>
          <Block className="h-5 w-28" />
        </div>
        <LoadingTableToolbar filters={["Status"]} />
        <LoadingRows
          headers={["Dataset", "Status", "Diperbarui", "Tindakan"]}
          rows={5}
        />
      </section>
    </PortalLoadingFrame>
  );
}
