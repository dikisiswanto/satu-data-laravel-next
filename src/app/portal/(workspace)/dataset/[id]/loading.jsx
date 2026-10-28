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
        description="Selesaikan langkah yang sedang aktif. Tahap Validasi otomatis berjalan setelah sumber diunggah; kelengkapan metadata ditampilkan sebelum pengajuan."
      />
      <section className="portal-workspace-panel">
        <h2 className="text-base font-semibold">Informasi dataset</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {[
            "Kode",
            "Organisasi",
            "Sumber",
            "Cakupan",
            "Lisensi",
            "Frekuensi",
          ].map((label) => (
            <div key={label} className="border-b pb-4">
              <p className="text-sm text-muted">{label}</p>
              <LoadingBlock className="mt-2 h-5 w-4/5 max-w-full" />
            </div>
          ))}
          <div className="border-b pb-4" aria-hidden="true">
            <LoadingBlock className="h-4 w-20" />
            <LoadingBlock className="mt-2 h-5 w-4/5 max-w-full" />
          </div>
          <div className="border-b pb-4">
            <p className="text-sm text-muted">Diperbarui</p>
            <LoadingBlock className="mt-2 h-5 w-4/5 max-w-full" />
          </div>
        </div>
      </section>
      <section className="portal-workspace-panel mt-6">
        <h2 className="text-base font-semibold">Riwayat versi dataset</h2>
        <p className="mt-1 text-sm text-muted">
          Setiap versi menyimpan ringkasan perubahan, sumber, waktu pembuatan,
          dan status rilis. Versi terdahulu tetap tersimpan sebagai riwayat.
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
      <section className="portal-workspace-panel mt-6">
        <h2 className="mt-8 text-lg font-semibold">
          Berkas dan hasil pengolahan
        </h2>
        <div className="mt-4">
          <LoadingTableToolbar filters={["Format", "Status konversi"]} />
          <LoadingRows
            headers={["Berkas", "Format", "Jenis", "Status"]}
            rows={2}
          />
        </div>
      </section>
      <section className="portal-workspace-panel mt-6">
        <h2 className="font-semibold">Kelengkapan sebelum pemeriksaan</h2>
        <p className="mt-1 text-sm leading-5 text-muted">
          Informasi wajib dan hasil validasi sumber harus lengkap sebelum
          pengajuan.
        </p>
        <LoadingBlock className="mt-4 h-20 w-full rounded-control" />
        <LoadingBlock className="mt-3 h-24 w-full rounded-control" />
      </section>
    </AdminPageLoading>
  );
}
