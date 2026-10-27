import Link from "next/link";
import {
  AdminPageLoading,
  LoadingBlock,
} from "@/components/admin/admin-page-loading";

const metadataHelp =
  "Bagian ini tidak perlu ditebak saat membuat draf. Lengkapi jika Anda sudah memiliki rujukan resmi, atau minta bantuan Walidata. Kode SDS, ID DDP, dan kode referensi tidak boleh dibuat sendiri. Dataset baru dianggap siap dipertukarkan setelah metadata dan distribusi aktif lolos pemeriksaan lokal serta kontrak tujuan diuji.";
const versionHelp = "Anda sedang mengubah metadata untuk";

export default function SdiMetadataLoading() {
  return (
    <AdminPageLoading
      label="Memuat metadata pertukaran SDI"
      eyebrow="Interoperabilitas"
      title="Metadata pertukaran SDI"
      description="Lengkapi metadata standar dan referensi yang dibutuhkan profil ekspor Satu Data Wajo. Dataset hanya masuk ekspor siap-harvest ketika seluruh field penting dan distribusi versi aktif tersedia."
    >
      <Link
        href="/portal/integrasi"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        Kembali ke kesiapan integrasi
      </Link>
      <section
        className="portal-form-card space-y-5 p-5 sm:p-7"
        aria-busy="true"
      >
        <div className="rounded-xl border border-[#d6e4ed] bg-[#f4f8fb] p-4">
          <LoadingBlock className="h-5 w-3/4 max-w-xl" />
          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm leading-6 text-muted">
            {versionHelp}{" "}
            <LoadingBlock className="inline-block h-4 w-28 align-middle" />.
            Jika versi ini sudah terbit, perubahan langsung memperbarui
            informasi katalog dan tercatat dalam riwayat. Jika ada draf versi
            baru, yang diperbarui hanya metadata draf; versi terbit tetap sama
            sampai draf tersebut diterbitkan.
          </p>
        </div>
        <details className="group rounded-2xl border border-[#cddde8] bg-[#f6f9fc] p-4 sm:p-5">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-lg text-base font-semibold text-[#193d59]">
            <span>Metadata standar dan pertukaran SDI (lanjutan)</span>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full border border-[#d5e3ec] bg-white px-2.5 py-1 text-xs font-medium text-[#42677f]">
                <LoadingBlock className="inline-block h-3 w-28 max-w-full align-middle" />
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted">{metadataHelp}</p>
        </details>
        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <div className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white">
            Simpan metadata pertukaran
          </div>
          <p className="text-xs leading-5 text-muted">
            Simpan metadata sumber sesuai registri resmi. Menyimpan metadata di
            sini belum berarti SPLP/SDI sudah menerima katalog. Penerimaan perlu
            dikonfirmasi melalui pengujian dengan sistem tujuan.
          </p>
        </div>
      </section>
    </AdminPageLoading>
  );
}
