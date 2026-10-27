import {
  AdminPageLoading,
  LoadingBlock,
} from "@/components/admin/admin-page-loading";

const metrics = [
  ["Dataset dapat diakses", "published"],
  [
    "Metadata SDI belum lengkap",
    "Dataset terbit yang belum memenuhi profil kelengkapan lokal",
  ],
  [
    "Berkas pada versi aktif perlu diperiksa",
    "Belum ada berkas publik yang berhasil diproses pada versi aktif",
  ],
  [
    "Melewati jadwal pembaruan",
    "Berdasarkan frekuensi dan waktu pembaruan terakhir",
  ],
  ["Indikator statistik terbit", "Indikator yang terlihat secara publik"],
  [
    "Indikator tanpa observasi terbit",
    "Indikator publik yang belum memiliki seri observasi aktif",
  ],
];
const actions = [
  [
    "Lengkapi metadata untuk berbagi data",
    "Lengkapi informasi yang masih kosong dan periksa berkas pada versi aktif sebelum menguji pengambilan data oleh sistem lain.",
  ],
  [
    "Tinjau registri standar dan kode",
    "Cantumkan sumber resmi, dokumen bukti, versi, dan masa berlaku referensi.",
  ],
  [
    "Tambahkan observasi indikator",
    "Catat nilai untuk tiap periode dan wilayah agar perubahan dari waktu ke waktu bisa ditampilkan dengan benar.",
  ],
  [
    "Periksa jadwal pembaruan",
    "Periksa dataset yang melewati jadwal pembaruan atau belum memiliki sumber yang dapat dibuka.",
  ],
];

export default function DataQualityLoading() {
  return (
    <AdminPageLoading
      label="Memuat kualitas dan siklus data"
      eyebrow="Pemantauan"
      title="Kualitas dan siklus data"
      description="Ringkasan ini menunjukkan hal-hal yang masih perlu diperiksa atau diperbaiki. Angkanya berasal dari pemeriksaan portal dan bukan sertifikasi kepatuhan dari instansi nasional."
    >
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-hidden="true"
      >
        {metrics.map(([label, detail]) => (
          <article
            key={label}
            className="rounded-2xl border border-line bg-white p-4 sm:p-5"
          >
            <p className="text-sm text-muted">{label}</p>
            <LoadingBlock className="mt-3 h-9 w-20" />
            <p className="mt-2 text-xs leading-5 text-muted">
              {detail === "published" ? (
                <>
                  <LoadingBlock className="mr-1 inline-block h-3 w-8 align-middle" />{" "}
                  dataset telah terbit
                </>
              ) : (
                detail
              )}
            </p>
          </article>
        ))}
        <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <p className="text-sm text-muted">Referensi siap dipakai</p>
          <LoadingBlock className="mt-3 h-9 w-44 max-w-full" />
          <p className="mt-2 text-xs leading-5 text-muted">
            Hanya catatan internal yang telah diverifikasi dan masih berlaku
          </p>
        </article>
        <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <p className="text-sm text-muted">
            Dataset tanpa tautan standar aktif
          </p>
          <LoadingBlock className="mt-3 h-9 w-20" />
          <p className="mt-2 text-xs leading-5 text-muted">
            Catatan teks belum cukup; pilih versi standar yang telah
            diverifikasi
          </p>
        </article>
        <article className="rounded-2xl border border-line bg-white p-4 sm:p-5">
          <p className="text-sm text-muted">Dataset tanpa sistem kode aktif</p>
          <LoadingBlock className="mt-3 h-9 w-20" />
          <p className="mt-2 text-xs leading-5 text-muted">
            Hubungkan kode referensi ke registri yang masih berlaku
          </p>
        </article>
      </div>
      <section className="portal-workspace-panel mt-7">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">
              Tindak lanjut yang disarankan
            </h2>
            <p className="mt-1 text-sm text-muted">
              Mulai dari hal yang bisa diperbaiki dengan merujuk pada dokumen
              dan sumber resmi.
            </p>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {actions.map(([title, description]) => (
            <article key={title} className="rounded-xl border border-line p-4">
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
              <LoadingBlock className="mt-3 h-4 w-28" />
            </article>
          ))}
        </div>
      </section>
      <section className="portal-workspace-panel mt-7">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">
              Riwayat pemeriksaan integrasi
            </h2>
            <p className="mt-1 text-sm text-muted">
              Ini adalah hasil pemeriksaan dari Portal Wajo. Hasil ini belum
              menunjukkan bahwa katalog sudah diambil oleh sistem nasional.
            </p>
          </div>
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b p-4 last:border-0"
          >
            <div className="flex-1">
              <LoadingBlock className="h-4 w-48 max-w-full" />
              <LoadingBlock className="mt-2 h-3 w-36" />
            </div>
            <LoadingBlock className="h-7 w-28 rounded-full" />
          </div>
        ))}
      </section>
      <p className="mt-5 text-xs leading-5 text-muted">
        Jadwal yang terlewat adalah pengingat untuk meninjau data, bukan bukti
        bahwa datanya salah. Untuk dataset yang hanya dikumpulkan sekali atau
        memiliki pengecualian resmi, gunakan jadwal yang sesuai dengan ketentuan
        sektornya.
      </p>
    </AdminPageLoading>
  );
}
