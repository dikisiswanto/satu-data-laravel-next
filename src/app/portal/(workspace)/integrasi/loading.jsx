import {
  AdminPageLoading,
  LoadingBlock,
} from "@/components/admin/admin-page-loading";

const endpoints = [
  [
    "JSON untuk pengambilan data otomatis",
    "/api/v1/sdi/data.json",
    "JSON array",
  ],
  ["Katalog DCAT/JSON-LD", "/api/v1/sdi/catalog", "application/ld+json"],
  ["Manifest GeoPortal", "/api/v1/sdi/geoportal-manifest", "GeoJSON index"],
  ["Standar terverifikasi", "/api/v1/sdi/standards", "JSON"],
  ["Kode referensi", "/api/v1/sdi/reference-codes", "JSON"],
];

export default function AdminIntegrationLoading() {
  return (
    <AdminPageLoading
      label="Memuat kesiapan integrasi"
      eyebrow="Interoperabilitas"
      title="Kesiapan integrasi Satu Data Indonesia"
      description="Halaman ini membantu Anda memeriksa apakah metadata dan berkas dataset sudah lengkap untuk dibagikan ke sistem lain. Hasil di sini hanya pemeriksaan dari portal; hasil ini belum berarti katalog sudah diterima oleh SPLP atau katalog nasional. Kode SDS dan kode referensi tetap perlu dicocokkan dengan sumber resmi."
    >
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {["Dataset terbit", "Metadata lengkap", "Perlu dilengkapi"].map(
          (label) => (
            <div key={label} className="rounded-2xl border bg-white p-4">
              <p className="text-sm text-muted">{label}</p>
              <LoadingBlock className="mt-2 h-9 w-16" />
              <LoadingBlock className="mt-2 h-3 w-4/5" />
            </div>
          ),
        )}
      </div>
      <section className="mt-6 rounded-2xl border border-[#cbdde9] bg-[#f4f8fb] p-5 sm:p-6">
        <h2 className="font-semibold text-[#153d5b]">
          Endpoint katalog untuk integrasi
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#45677f]">
          Tersedia dua bentuk keluaran untuk diuji bersama pengelola integrasi.
          JSON datar mengikuti nama kolom pada contoh pengambilan data otomatis
          di SDI, sedangkan DCAT/JSON-LD menggunakan istilah metadata yang baku.
          Kesesuaiannya tetap perlu diuji dengan spesifikasi dan akses resmi
          dari pengelola SPLP.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {endpoints.map(([label, url, format]) => (
            <article
              key={url}
              className="rounded-xl border border-[#cbdde9] bg-white p-3"
            >
              <p className="text-sm font-semibold">{label}</p>
              <code className="mt-1 block break-all text-xs">{url}</code>
              <p className="mt-1 text-xs text-muted">{format}</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#45677f]">
          Alamat API saja belum membuat koneksi ke SPLP aktif. Pengelola
          integrasi perlu mendaftarkan katalog portal ini di sistem tujuan, lalu
          menguji pengambilan metadata dan berkas, pembaruan versi, serta
          penarikan dataset dari katalog.
        </p>
      </section>
      <section className="mt-7 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Dataset yang perlu diperiksa
            </h2>
            <p className="mt-1 text-sm text-muted">
              Daftar ini menunjukkan informasi yang masih perlu dilengkapi pada
              versi dataset yang sedang diterbitkan.
            </p>
          </div>
          <LoadingBlock className="h-4 w-20" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-line bg-white p-4 sm:p-5"
          >
            <LoadingBlock className="h-3 w-48 max-w-full" />
            <LoadingBlock className="mt-3 h-5 w-2/3" />
            <LoadingBlock className="mt-2 h-4 w-full" />
          </div>
        ))}
      </section>
    </AdminPageLoading>
  );
}
