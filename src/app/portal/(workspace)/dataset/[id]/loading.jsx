import Link from "next/link";
import {
  AdminPageLoading,
  LoadingBlock,
  LoadingRows,
  LoadingTableToolbar,
} from "@/components/admin/admin-page-loading";
import { DatasetLifecycleGuide } from "@/components/admin/dataset-lifecycle-guide";

export default function DatasetWorkspaceDetailLoading() {
  return (
    <AdminPageLoading
      label="Memuat detail dataset"
      eyebrow="Detail dataset"
      title={<LoadingBlock className="h-10 w-3/4 max-w-xl sm:h-12" />}
      descriptionPlaceholder
      contextGuide
      actionPlaceholder
    >
      <Link
        href="/portal/dataset"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
        prefetch={false}
      >
        ← Kembali ke daftar
      </Link>
      <DatasetLifecycleGuide
        activeStep={2}
        completedThrough={1}
        heading="Langkah berikutnya"
        description="Selesaikan langkah yang sedang aktif. Tahap validasi berjalan setelah sumber diunggah; kelengkapan metadata ditampilkan sebelum pengajuan."
      />
      <section
        aria-label="Tindakan utama dataset"
        className="mb-5 grid gap-3 md:grid-cols-3"
      >
        {["Edit metadata", "Unggah berkas sumber", "Distribusi unduhan"].map(
          (label) => (
            <div
              key={label}
              className="flex min-h-24 items-start gap-3 rounded-card border border-line bg-white p-4"
            >
              <LoadingBlock className="size-10 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{label}</span>
                <LoadingBlock className="mt-2 h-4 w-full max-w-48" />
                <LoadingBlock className="mt-1 h-4 w-3/4" />
              </span>
            </div>
          ),
        )}
      </section>
      <nav
        aria-label="Bagian pengelolaan dataset"
        className="mb-5 flex flex-wrap gap-2 rounded-card border border-line bg-white p-3"
      >
        {[
          "Metadata",
          "Data & berkas",
          "Distribusi",
          "Riwayat versi",
          "Pemeriksaan dan publikasi",
        ].map((label) => (
          <span
            key={label}
            className="inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-sm font-medium"
          >
            {label}
          </span>
        ))}
      </nav>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section id="dataset-metadata" className="portal-workspace-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Metadata dataset
                </p>
                <h2 className="mt-1 text-lg font-semibold">Tentang dataset</h2>
                <p className="mt-1 text-sm text-muted">
                  Informasi untuk menemukan, memahami, menggunakan, dan mengutip
                  data.
                </p>
              </div>
              <LoadingBlock className="h-10 w-32 rounded-control" />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                "Kode",
                "Organisasi pengampu",
                "Kategori",
                "Kata kunci",
                "Nama sumber",
                "URL sumber",
                "Cakupan wilayah",
                "Lisensi / ketentuan penggunaan",
                "Frekuensi pembaruan",
                "Satuan",
                "Periode data",
                "Versi kerja",
              ].map((label) => (
                <div
                  key={label}
                  className="min-w-0 border-b border-line/70 pb-3"
                >
                  <p className="text-sm text-muted">{label}</p>
                  <LoadingBlock className="mt-2 h-5 w-4/5 max-w-full" />
                </div>
              ))}
            </div>
          </section>

          <section
            id="dataset-source-workspace"
            className="portal-workspace-panel"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Data & berkas
            </p>
            <h2 className="mt-1 text-lg font-semibold">Sumber data</h2>
            <p className="mt-1 text-sm text-muted">
              Setiap versi memiliki satu berkas sumber utama. Format hasil
              pemrosesan ditampilkan terpisah sebagai distribusi.
            </p>
            <div className="mt-4">
              <LoadingTableToolbar filters={["Format", "Status pemrosesan"]} />
              <LoadingRows
                headers={["Nama berkas", "Format", "Status"]}
                rows={2}
              />
            </div>
            <section id="dataset-source-upload" className="mt-6 border-t pt-5">
              <h3 className="font-semibold">Unggah berkas sumber</h3>
              <LoadingBlock className="mt-3 h-20 w-full rounded-control" />
              <LoadingBlock className="mt-3 h-11 w-40 rounded-control" />
            </section>
          </section>
          <section
            id="dataset-distributions"
            className="portal-workspace-panel"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Distribusi dataset
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Berkas hasil pengolahan
            </h2>
            <p className="mt-1 text-sm text-muted">
              Format hasil konversi yang siap digunakan.
            </p>
            <div className="mt-4">
              <LoadingTableToolbar filters={["Format", "Status"]} />
              <LoadingRows
                headers={["Nama distribusi", "Format", "Status"]}
                rows={2}
              />
            </div>
          </section>
          <section id="dataset-versions" className="portal-workspace-panel">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Riwayat versi
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              Riwayat versi dataset
            </h2>
            <p className="mt-1 text-sm text-muted">
              Setiap versi menyimpan ringkasan perubahan, sumber, waktu
              pembuatan, dan status rilis.
            </p>
            <div className="mt-4">
              <LoadingTableToolbar
                searchPlaceholder="Cari versi, ringkasan perubahan, sumber, atau status…"
                dateFilterLabel="Tanggal dibuat"
                filters={["Status versi"]}
              />
              <LoadingRows
                headers={[
                  "Versi",
                  "Status versi",
                  "Ringkasan perubahan",
                  "Sumber",
                  "Dibuat",
                ]}
                rows={3}
              />
            </div>
          </section>
        </div>
        <aside
          id="dataset-review"
          className="h-fit rounded-card border bg-white p-5"
        >
          <h2 className="text-base font-semibold">
            Kelengkapan sebelum pemeriksaan
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Informasi wajib dan hasil validasi sumber harus lengkap sebelum
            pengajuan.
          </p>
          <LoadingBlock className="mt-4 h-20 w-full rounded-control" />
          <LoadingBlock className="mt-3 h-24 w-full rounded-control" />
        </aside>
      </div>
    </AdminPageLoading>
  );
}
