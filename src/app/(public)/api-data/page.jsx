import { PageHeading } from "@/components/page-heading";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
} from "@/lib/site-config";

const configuredOrigin = getPublicSiteOrigin();
const displayBaseUrl = configuredOrigin || "https://domain-portal-anda.example";

export const metadata = {
  title: "API data terbuka",
  description:
    "Panduan menggunakan API publik Satu Data Kabupaten Wajo: endpoint, parameter, contoh request, format respons, dan cara menangani error.",
  ...getCanonicalMetadata("/api-data"),
  ...getSocialMetadata({
    path: "/api-data",
    title: "API Data Terbuka | Satu Data Wajo",
    description:
      "Referensi teknis API publik Kabupaten Wajo untuk mengambil dataset, membaca pratinjau tabel, melihat organisasi, dan menggunakan indikator statistik.",
  }),
};

const datasetListExample = `{
  "data": [
    {
      "id": "9dfb3f4d-9d7a-4e56-9b6f-140f72bd0e11",
      "code": "SDW-DATA-001",
      "slug": "jumlah-sekolah",
      "title": "Jumlah Sekolah",
      "description": "Jumlah satuan pendidikan menurut wilayah.",
      "category": "Pendidikan",
      "current_version": 2,
      "published_at": "2026-10-01T08:00:00.000Z",
      "organizations": { "name": "Dinas Pendidikan", "slug": "dinas-pendidikan", "code": "OPD-001" },
      "dataset_resources": [
        { "id": "8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b", "format": "csv", "row_count": 190, "preview_enabled": true, "conversion_status": "succeeded" }
      ]
    }
  ],
  "meta": { "total": 1, "per_page": 20, "current_page": 1, "last_page": 1 },
  "pagination": { "total": 1, "limit": 20, "offset": 0 }
}`;

const datasetDetailExample = `{
  "data": {
    "id": "9dfb3f4d-9d7a-4e56-9b6f-140f72bd0e11",
    "code": "SDW-DATA-001",
    "slug": "jumlah-sekolah",
    "title": "Jumlah Sekolah",
    "description": "Jumlah satuan pendidikan menurut wilayah.",
    "category": "Pendidikan",
    "current_version": 2,
    "published_at": "2026-10-01T08:00:00.000Z",
    "organizations": { "name": "Dinas Pendidikan", "slug": "dinas-pendidikan", "code": "OPD-001" },
    "sdi_metadata": { "dataset_version": 2, "ddp_id": "contoh-id-ddp", "sds_code": "contoh-sds", "available_year": 2026 },
    "dataset_resources": [
      {
        "id": "8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b",
        "original_filename": "jumlah-sekolah.csv",
        "dataset_version": 2,
        "format": "csv",
        "mime_type": "text/csv",
        "size_bytes": 18342,
        "checksum_sha256": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
        "row_count": 190,
        "column_schema": ["kecamatan", "jumlah_sekolah"],
        "preview_enabled": true,
        "is_public": true,
        "conversion_status": "succeeded"
      }
    ]
  }
}`;

const rowsExample = `{
  "data": [
    { "row_number": 1, "row": { "kecamatan": "Tempe", "jumlah_sekolah": 42 } },
    { "row_number": 2, "row": { "kecamatan": "Belawa", "jumlah_sekolah": 18 } }
  ],
  "meta": {
    "resource_id": "8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b",
    "filename": "jumlah-sekolah.csv",
    "format": "csv",
    "page": 1,
    "limit": 25,
    "total": 190,
    "total_pages": 8,
    "offset": 0,
    "columns": ["kecamatan", "jumlah_sekolah"]
  },
  "links": {
    "self": "/api/v1/datasets/jumlah-sekolah/resources/8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b/rows?page=1&limit=25",
    "next": "/api/v1/datasets/jumlah-sekolah/resources/8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b/rows?page=2&limit=25"
  }
}`;

const listExample = `{
  "data": [
    {
      "id": "0cbbdca7-a88a-4c8c-ae72-14352fce9b10",
      "code": "OPD-001",
      "slug": "dinas-pendidikan",
      "name": "Dinas Pendidikan",
      "short_name": "Disdik",
      "description": "Urusan pemerintahan bidang pendidikan.",
      "official_email": "informasi@example.go.id",
      "official_url": "https://example.go.id",
      "published_dataset_count": 12
    }
  ],
  "meta": { "total": 41, "per_page": 50, "current_page": 1, "last_page": 1 }
}`;

const organizationDetailExample = `{
  "data": {
    "id": "0cbbdca7-a88a-4c8c-ae72-14352fce9b10",
    "code": "OPD-001",
    "slug": "dinas-pendidikan",
    "name": "Dinas Pendidikan",
    "short_name": "Disdik",
    "description": "Urusan pemerintahan bidang pendidikan.",
    "official_email": "informasi@example.go.id",
    "official_url": "https://example.go.id",
    "published_dataset_count": 12
  }
}`;

const indicatorExample = `{
  "data": [
    {
      "id": "cf817af5-0ab7-4fad-86c0-a5a23fc01929",
      "code": "STAT-001",
      "slug": "jumlah-penduduk",
      "title": "Jumlah Penduduk",
      "definition": "Jumlah penduduk pada periode rujukan.",
      "unit": "jiwa",
      "source_name": "Dinas terkait",
      "period_label": "2025",
      "value_numeric": 400000,
      "value_text": null,
      "published_at": "2026-10-01T08:00:00.000Z",
      "organizations": { "name": "Dinas terkait", "slug": "dinas-terkait" }
    }
  ],
  "meta": { "total": 1, "per_page": 20, "current_page": 1, "last_page": 1 }
}`;

const indicatorDetailExample = `{
  "data": {
    "id": "cf817af5-0ab7-4fad-86c0-a5a23fc01929",
    "code": "STAT-001",
    "slug": "jumlah-penduduk",
    "title": "Jumlah Penduduk",
    "definition": "Jumlah penduduk pada periode rujukan.",
    "unit": "jiwa",
    "source_name": "Dinas terkait",
    "period_label": "2025",
    "value_numeric": 400000,
    "value_text": null,
    "reference_period_start": "2025-01-01",
    "reference_period_end": "2025-12-31",
    "published_at": "2026-10-01T08:00:00.000Z",
    "organizations": {
      "name": "Dinas terkait",
      "code": "OPD-002",
      "slug": "dinas-terkait",
      "is_active": true
    }
  }
}`;

const errorExamples = `// HTTP 404 Not Found — data tidak ada atau belum diterbitkan
{ "error": "not_found" }

// HTTP 400 Bad Request — nomor halaman melewati data yang tersedia
{ "error": "page_out_of_range" }

// HTTP 429 Too Many Requests — tunggu sesuai header Retry-After
{ "error": "rate_limited" }

// HTTP 503 Service Unavailable — layanan belum siap; coba lagi nanti
{ "error": "catalog_unavailable" }
{ "error": "rate_limit_unavailable" }`;

export default function ApiDocsPage() {
  return (
    <main className="page-container section-space public-interior-page">
      <PageHeading
        eyebrow="Integrasi data"
        title="API data terbuka"
        description="Gunakan API ini untuk mengambil dataset yang sudah diterbitkan, membaca detail berkasnya, melihat pratinjau tabel, serta mengintegrasikan organisasi dan indikator statistik ke aplikasi Anda."
      />

      <div className="mt-6 max-w-5xl">
        <nav
          aria-label="Navigasi dokumentasi API"
          className="rounded-2xl border border-[#d9e4e9] bg-[#f5f8fa] p-4 sm:p-5"
        >
          <p className="text-sm font-semibold text-ink">Langsung ke bagian</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["#base-url", "Mulai menggunakan API"],
              ["#parameters", "Parameter"],
              ["#endpoints", "Daftar endpoint"],
              ["#success", "Contoh respons"],
              ["#errors", "Penanganan error"],
              ["#formats", "Format berkas"],
              ["#geoportal", "GeoPortal"],
              ["#sdi-harvesting", "Pengambilan otomatis SDI/SPLP"],
              ["#security", "Batas penggunaan & keamanan"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="inline-flex min-h-9 items-center rounded-full border border-[#d5e1e8] bg-white px-3 py-1.5 text-sm font-medium text-[#24577c] transition-colors hover:border-[#9bbbd0] hover:bg-[#edf5fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d5fa7]"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>
      </div>

      <div className="mt-6 grid max-w-5xl gap-6">
        <section
          id="base-url"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="01" title="Mulai menggunakan API" />
          <p className="mt-3 text-sm leading-6 text-muted">
            API memberi aplikasi cara yang konsisten untuk mengambil data dari
            portal melalui HTTP. Setiap endpoint memiliki tujuan tertentu,
            seperti mencari dataset, membaca detail dataset, atau mengambil
            indikator statistik. API publik hanya menampilkan informasi yang
            sudah tersedia untuk umum.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Alamat dasar (base URL) mengikuti domain portal yang dikonfigurasi
            melalui
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">
              NEXT_PUBLIC_SITE_URL
            </code>
            . Path seperti <code>/api/v1/datasets</code> ditambahkan di belakang
            alamat ini untuk membentuk URL endpoint lengkap.
          </p>
          <div className="mt-3 rounded-xl bg-[#102b3b] p-4 text-sm text-white">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              Base URL
            </p>
            <code className="break-all">{displayBaseUrl}</code>
            {!configuredOrigin ? (
              <p className="mt-2 text-xs leading-5 text-amber-200">
                Alamat ini hanya contoh karena domain produksi belum
                dikonfigurasi. Tetapkan NEXT_PUBLIC_SITE_URL ke alamat HTTPS
                portal yang sebenarnya agar contoh request mengarah ke server
                yang benar.
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact
              title="Metode HTTP"
              value="GET untuk membaca data; endpoint yang didokumentasikan tidak menerima body request."
            />
            <Fact
              title="Autentikasi"
              value="Tidak perlu API key atau sesi admin untuk endpoint publik."
            />
            <Fact
              title="Parameter"
              value="Filter dan pagination dikirim melalui query string di URL."
            />
            <Fact
              title="Format respons"
              value="JSON UTF-8 (application/json), kecuali unduhan berkas yang mengembalikan redirect HTTP 302."
            />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-ink">
            Contoh: ambil 20 dataset
          </h3>
          <CodeBlock>{`curl -sS -H "Accept: application/json" \\\n  "${displayBaseUrl}/api/v1/datasets?page=1&limit=20"`}</CodeBlock>
          <p className="mt-2 text-xs leading-5 text-muted">
            Ganti alamat contoh dengan domain portal yang aktif. Saat parameter
            memuat spasi atau karakter khusus, lakukan URL-encoding agar
            nilainya dibaca dengan benar.
          </p>
        </section>

        <section
          id="parameters"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="02" title="Parameter request" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Parameter di bawah digunakan oleh endpoint tertentu, bukan semuanya
            sekaligus. Periksa daftar parameter pada masing-masing endpoint
            sebelum mengirim request. Jika nilai <code>page</code> atau{" "}
            <code>limit</code> tidak sesuai, API menggunakan nilai bawaan. Nilai{" "}
            <code>limit</code> tetap dibatasi sesuai batas maksimum endpoint.
          </p>
          <ParamTable
            rows={[
              [
                "page",
                "Bilangan bulat",
                "Nomor halaman, dimulai dari 1. Default: 1.",
              ],
              [
                "limit",
                "Bilangan bulat",
                "Jumlah item per halaman. Default bergantung endpoint; maksimum: 100.",
              ],
              [
                "q",
                "Teks pencarian",
                "Mencari judul dan deskripsi dataset, atau judul dan definisi indikator. Maksimum 120 karakter; tanda baca yang tidak didukung akan dinormalisasi.",
              ],
              [
                "organization",
                "Slug organisasi",
                "Filter daftar dataset berdasarkan identitas URL organisasi, misalnya dinas-pendidikan.",
              ],
              [
                "category",
                "Teks kategori",
                "Filter daftar dataset berdasarkan nama kategori yang tersimpan.",
              ],
              [
                "slug",
                "Bagian URL",
                "Identitas dataset atau indikator pada URL; gunakan huruf kecil, angka, dan tanda hubung.",
              ],
              [
                "resourceId",
                "UUID",
                "ID unik berkas/resource yang tercantum pada detail dataset.",
              ],
            ]}
          />
        </section>

        <section
          id="endpoints"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="03" title="Endpoint yang tersedia" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Endpoint adalah alamat untuk mengambil jenis informasi tertentu.
            Gunakan dataset untuk menemukan data, lalu buka detailnya untuk
            memperoleh ID resource dan tautan pratinjau atau unduhan. Istilah{" "}
            <em>resource</em> di dokumentasi ini berarti berkas data yang
            melekat pada sebuah dataset.
          </p>
          <div className="mt-4 grid gap-3">
            <Endpoint
              method="GET"
              path="/api/v1/datasets"
              title="Cari dan telusuri dataset"
              summary="Mengembalikan dataset terbit yang mempunyai berkas publik pada versi aktif. Gunakan q untuk mencari judul/deskripsi; filter dapat mempersempit organisasi, kategori, tahun, format berkas, dan urutan."
              params="page (default 1), limit (default 24; maksimum 100), q (maksimum 100 karakter), organization atau organization_id (slug organisasi atau ID), category, year, format, sort."
              example={`curl -sS "${displayBaseUrl}/api/v1/datasets?page=1&limit=20&q=sekolah&organization=dinas-pendidikan&category=Pendidikan"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/datasets/{slug}"
              title="Baca detail dataset"
              summary="Menampilkan metadata, organisasi pengampu, versi aktif, dan daftar berkas publik yang pemrosesannya berhasil."
              params="slug (wajib; ambil dari hasil daftar dataset)."
              example={`curl -sS "${displayBaseUrl}/api/v1/datasets/jumlah-sekolah"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/datasets/{slug}/resources/{resourceId}/rows"
              title="Baca pratinjau tabel"
              summary="Mengambil sebagian baris dari berkas CSV publik yang sudah selesai diproses dan mengizinkan pratinjau. Endpoint ini tidak menyediakan pratinjau untuk semua format berkas."
              params="slug dan resourceId (wajib), page (default 1), limit (default 25; maksimum 100). Halaman di luar rentang data ditolak."
              example={`curl -sS "${displayBaseUrl}/api/v1/datasets/jumlah-sekolah/resources/8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b/rows?page=1&limit=25"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/datasets/{slug}/resources/{resourceId}"
              title="Unduh berkas dataset"
              summary="Memvalidasi status publikasi, versi aktif, dan hak akses berkas lalu mengirim berkas sebagai respons unduhan (Content-Disposition: attachment)."
              params="slug dan resourceId (wajib)."
              example={`curl -L -OJ "${displayBaseUrl}/api/v1/datasets/jumlah-sekolah/resources/8ab6e0e7-2f49-4a15-b35b-6d5e320d9e2b"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/organizations"
              title="Daftar organisasi"
              summary="Mengembalikan organisasi yang berstatus aktif, diurutkan berdasarkan nama. Gunakan kode atau slug organisasi untuk menghubungkannya dengan dataset."
              params="page (default 1), limit (default 50; maksimum 100). per_page didukung sebagai alias kompatibilitas."
              example={`curl -sS "${displayBaseUrl}/api/v1/organizations?page=1&limit=50"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/organizations/{slug}"
              title="Baca detail perangkat daerah"
              summary="Mengembalikan profil publik organisasi aktif dan jumlah dataset yang telah dipublikasikan. Organisasi yang tidak aktif atau tidak ditemukan akan menghasilkan 404."
              params="slug (wajib; ambil dari field slug pada daftar organisasi)."
              example={`curl -sS "${displayBaseUrl}/api/v1/organizations/dinas-pendidikan"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/indicators"
              title="Cari indikator statistik"
              summary="Menampilkan indikator yang sudah diterbitkan oleh organisasi aktif. Parameter q mencari judul atau definisi indikator."
              params="page (default 1), limit (default 50; maksimum 100), q (maksimum 100 karakter; mencari kode, judul, dan definisi). per_page didukung sebagai alias kompatibilitas."
              example={`curl -sS "${displayBaseUrl}/api/v1/indicators?page=1&limit=20&q=penduduk"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/indicators/{slug}"
              title="Baca detail indikator"
              summary="Menampilkan definisi, satuan, sumber, periode rujukan, nilai, dan organisasi pengampu indikator."
              params="slug (wajib)."
              example={`curl -sS "${displayBaseUrl}/api/v1/indicators/jumlah-penduduk"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/indicators/{slug}/observations"
              title="Baca deret observasi indikator"
              summary="Mengambil nilai yang sudah diterbitkan menurut periode, wilayah, dimensi, sumber, dan revisi. Cocok untuk membuat grafik tren atau tabel analitis tanpa menggabungkan definisi indikator dengan satu nilai terbaru."
              params="slug (wajib), page (default 1), limit (default 50; maksimum 500). Hanya observasi terbit yang menjadi revisi aktif dan tanggal publikasinya sudah tercapai yang ditampilkan."
              example={`curl -sS "${displayBaseUrl}/api/v1/indicators/jumlah-penduduk/observations?page=1&limit=50"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/standards"
              title="Daftar standar yang terverifikasi"
              summary="Mencari standar yang sudah ditinjau secara internal, dengan kode, instansi penerbit, versi, sumber, bukti, dan masa berlaku. Status ini bukan pengesahan lembaga standar nasional."
              params="page (default 1), limit (default 50; maksimum 100), q (pencarian), type (jenis standar)."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/standards?page=1&limit=50&type=statistical"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/reference-codes"
              title="Daftar kode referensi terverifikasi"
              summary="Mengambil kode dan label referensi yang masih berlaku dari sistem referensi terverifikasi."
              params="page (default 1), limit (default 100; maksimum 200), q (pencarian), system (kode sistem referensi)."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/reference-codes?page=1&limit=100&system=KODE-WILAYAH"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/geoportal-manifest"
              title="Manifest untuk GeoPortal"
              summary="Menyediakan dataset terbit yang memiliki distribusi GeoJSON publik dan berhasil diproses pada versi aktif. GeoPortal tetap perlu mengatur pemetaan layer dan perilaku pembaruan."
              params="Tidak ada parameter query. Batas 60 permintaan per menit."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/geoportal-manifest"`}
            />
            <Endpoint
              method="GET"
              path="/api/openapi"
              title="Spesifikasi API (OpenAPI)"
              summary="Dokumen spesifikasi OpenAPI. Endpoint /api/openapi dan /api/openapi.json menyajikan JSON; /api/openapi.yaml menyajikan YAML untuk alat pengembangan yang kompatibel."
              params="Tidak ada."
              example={`curl -sS "${displayBaseUrl}/api/openapi.json"`}
            />
            <Endpoint
              method="GET"
              path="/api/health"
              title="Periksa aplikasi"
              summary="Memastikan aplikasi menjawab permintaan. Status ok tidak menjamin database atau seluruh layanan pendukung sedang tersedia."
              params="Tidak ada."
              example={`curl -sS "${displayBaseUrl}/api/health"`}
            />
          </div>
        </section>

        <section
          id="success"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="04" title="Contoh respons berhasil" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Contoh di bawah menunjukkan struktur data yang dikembalikan API. ID,
            jumlah, nilai, nama organisasi, dan tanggal hanya ilustrasi—respons
            nyata mengikuti data yang sedang diterbitkan di portal.
          </p>
          <Example
            title="GET /api/v1/datasets?page=1&limit=20"
            code={datasetListExample}
          />
          <Example
            title="GET /api/v1/datasets/{slug}"
            code={datasetDetailExample}
          />
          <Example
            title="GET /api/v1/datasets/{slug}/resources/{resourceId}/rows"
            code={rowsExample}
          />
          <Example
            title="GET /api/v1/organizations?page=1&limit=50"
            code={listExample}
          />
          <Example
            title="GET /api/v1/organizations/{slug}"
            code={organizationDetailExample}
          />
          <Example
            title="GET /api/v1/indicators?page=1&limit=20"
            code={indicatorExample}
          />
          <Example
            title="GET /api/v1/indicators/{slug}"
            code={indicatorDetailExample}
          />
          <Example
            title="GET /api/v1/indicators/{slug}/observations"
            code={`{\n  "data": [{ "period_label": "2025", "geographic_code": "731301", "geographic_name": "Tempe", "value_numeric": 42000, "value_text": null, "revision_no": 2, "status": "published", "is_current": true }],\n  "meta": { "total": 1, "per_page": 50, "current_page": 1, "last_page": 1 }\n}`}
          />
          <div className="mt-4 rounded-xl border border-[#dce8e3] bg-[#f3faf6] p-4 text-sm leading-6 text-[#235741]">
            Respons berbentuk daftar menyertakan <code>data</code> dan{" "}
            <code>meta</code> untuk informasi pagination. Daftar dataset juga
            menyediakan metadata kompatibilitas <code>pagination</code>,
            sedangkan endpoint pratinjau baris menyediakan{" "}
            <code>links.self</code> dan <code>links.next</code>. Pada halaman
            terakhir, <code>next</code> bernilai <code>null</code>. Respons
            detail membungkus satu objek di dalam <code>data</code>.
          </div>
        </section>

        <section
          id="errors"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="05" title="Jika request gagal" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Ketika terjadi error, API mengirim kode status HTTP dan—untuk
            respons JSON—properti <code>error</code> yang dapat dibaca aplikasi.
            Periksa keduanya: status menjelaskan jenis kegagalan, sedangkan kode
            error membantu menemukan penyebab dan langkah berikutnya.
          </p>
          <ParamTable
            rows={[
              [
                "200 OK",
                "Permintaan berhasil. Bentuk data mengikuti endpoint yang dipanggil.",
              ],
              [
                "400 Bad Request",
                "Parameter tidak dapat diproses, misalnya nomor halaman pratinjau sudah melewati data yang tersedia. Periksa kode page_out_of_range.",
              ],
              [
                "404 Not Found",
                "Dataset, indikator, atau berkas tidak ditemukan atau tidak tersedia untuk publik. Pastikan slug dan ID benar serta datanya sudah diterbitkan.",
              ],
              [
                "429 Too Many Requests",
                "Permintaan terlalu sering untuk batas yang ditetapkan. Tunggu sesuai jumlah detik pada header Retry-After sebelum mencoba kembali.",
              ],
              [
                "503 Service Unavailable",
                "Layanan database, katalog, pratinjau, unduhan, atau pembatasan permintaan sedang tidak siap. Coba lagi setelah jeda; hindari retry terus-menerus.",
              ],
            ]}
          />
          <Example
            title="Contoh isi respons JSON saat error"
            code={errorExamples}
          />
          <h3 className="mt-5 text-sm font-semibold text-ink">
            Kode error dan langkah penanganan
          </h3>
          <ParamTable
            rows={[
              [
                "catalog_unavailable",
                "Katalog belum dapat ditampilkan. Coba lagi beberapa saat lagi. Jika masalah terus berulang, hubungi pengelola portal.",
              ],
              [
                "resources_unavailable",
                "Kami belum dapat memeriksa daftar berkas pada versi yang sedang diterbitkan. Coba lagi beberapa saat lagi.",
              ],
              [
                "dataset_lookup_unavailable",
                "Kami belum dapat memastikan berkas mana yang dapat diunduh. Tunggu sebentar lalu coba lagi.",
              ],
              [
                "resource_lookup_unavailable",
                "Kami belum dapat menemukan informasi berkas ini. Buka detail dataset untuk mengambil tautan unduhan terbaru.",
              ],
              [
                "preview_not_available",
                "Berkas tidak memenuhi syarat pratinjau atau tidak tersedia pada versi yang sedang diterbitkan. Gunakan tautan unduhan jika tersedia.",
              ],
              [
                "preview_unavailable",
                "Kami belum dapat menampilkan pratinjau saat ini. Tunggu sebentar lalu coba lagi, atau unduh berkas jika tersedia.",
              ],
              [
                "download_unavailable",
                "Tautan unduhan belum dapat dibuat. Tunggu sebentar lalu coba lagi.",
              ],
              [
                "organizations_unavailable",
                "Daftar organisasi belum dapat ditampilkan. Coba lagi beberapa saat lagi.",
              ],
              [
                "indicators_unavailable",
                "Data indikator belum dapat ditampilkan. Coba lagi beberapa saat lagi.",
              ],
              [
                "page_out_of_range",
                "Nomor halaman melampaui jumlah baris yang tersedia. Kurangi nilai page atau ikuti links.next dari respons sebelumnya.",
              ],
              [
                "rate_limited",
                "Batas permintaan tercapai. Tunggu sesuai Retry-After sebelum mengirim permintaan berikutnya.",
              ],
              [
                "rate_limit_unavailable",
                "Layanan pembatasan permintaan belum siap. API menolak permintaan sementara untuk menjaga keamanan; coba kembali beberapa saat kemudian.",
              ],
            ]}
          />
        </section>

        <section
          id="formats"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle
            number="06"
            title="Format berkas untuk unggah dan konversi"
          />
          <p className="mt-3 text-sm leading-6 text-muted">
            Format berikut berlaku untuk berkas yang diunggah melalui Portal
            Admin, bukan untuk request ke API publik. Endpoint API yang
            dijelaskan di atas hanya membaca data; unggah dan konversi dilakukan
            melalui alur admin.
          </p>
          <ParamTable
            rows={[
              [
                "CSV (.csv)",
                "Berkas teks ber-encoding UTF-8. BOM didukung dan baris kosong dapat dilewati saat dibaca.",
              ],
              [
                "Excel Open XML (.xlsx)",
                "Workbook Excel modern. Portal memproses lembar kerja pertama; format Excel lama .xls tidak didukung.",
              ],
              [
                "JSON (.json)",
                "Array objek dengan satu objek untuk setiap baris, atau array dua dimensi dengan baris pertama sebagai nama kolom.",
              ],
              [
                "GeoJSON (.geojson)",
                "Data geospasial yang valid, misalnya FeatureCollection atau Feature, dengan geometri Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, atau GeometryCollection. Baris hasil konversi mengikuti geometri dan properti fitur. Endpoint pratinjau baris publik saat ini hanya melayani resource CSV.",
              ],
            ]}
          />
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Batas pemrosesan berkas:</strong> ukuran berkas maksimal 25
            MiB, hingga 250.000 baris, 250 kolom, dan 500.000 sel. Workbook XLSX
            juga diperiksa jumlah bagian arsip dan ukuran setelah diekstrak.
            GeoJSON dibatasi hingga 1.000.000 nilai koordinat. Berkas yang
            melewati salah satu batas akan ditolak oleh proses validasi; pecah
            data menjadi beberapa berkas bila diperlukan.
          </div>
        </section>

        <section
          id="geoportal"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="07" title="GeoPortal dan pertukaran data" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Peta tematik interaktif dapat ditampilkan melalui GeoPortal Wajo.
            Portal Satu Data tetap menjadi rujukan untuk metadata resmi, status
            publikasi, versi, dan URL distribusi dataset. Membuka GeoPortal
            tidak menggantikan publikasi atau membuat layer peta secara
            otomatis; aplikasi peta harus membaca API di bawah ini dan
            mengonfigurasi layer yang sesuai.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact
              title="Temukan dataset"
              value="GET /api/v1/datasets — daftar dataset publik dengan pagination."
            />
            <Fact
              title="Ambil metadata & distribusi"
              value="GET /api/v1/datasets/{slug} — metadata dasar, sdi_metadata jika tersedia, dan URL resource publik pada versi aktif."
            />
            <Fact
              title="Ambil resource"
              value="Gunakan download_url yang disediakan detail dataset, bukan signed URL sementara dari object storage."
            />
            <Fact
              title="Jaga sinkronisasi"
              value="Catat slug/ID, versi, updated_at dan checksum; periksa kembali status publikasi sebelum memperbarui layer."
            />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-ink">
            Alur konsumen GeoPortal
          </h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
            <li>
              Ambil daftar dataset publik dan pilih dataset yang mempunyai
              distribusi spasial yang kompatibel.
            </li>
            <li>
              Baca detail dataset untuk menemukan resource aktif, format,
              ukuran, dan URL unduhan stabil.
            </li>
            <li>
              Validasi geometri, sistem koordinat, atribut, dan kode wilayah
              sebelum membuat atau memperbarui layer peta.
            </li>
            <li>
              Tampilkan sumber, organisasi, periode, versi dan tautan kembali ke
              detail dataset Satu Data Wajo.
            </li>
            <li>
              Ketika dataset diarsipkan atau versinya berubah, sinkronkan status
              layer dan simpan log hasil panen agar proses dapat diaudit.
            </li>
          </ol>
          <p className="mt-4 rounded-xl border border-[#d5e5f5] bg-[#f3f8fd] p-4 text-sm leading-6 text-[#214f70]">
            <strong>Catatan integrasi:</strong> API publik portal menyediakan
            metadata dan distribusi yang bisa dikonsumsi mesin. Agar benar-benar
            dapat di-harvest oleh GeoPortal atau katalog Satu Data Indonesia,
            konsumen harus dikonfigurasi dan diuji terhadap profil
            metadata/protokol tujuan yang disepakati. Keberadaan API saja tidak
            membuktikan sinkronisasi eksternal sudah aktif.
          </p>
        </section>

        <section
          id="sdi-harvesting"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle
            number="08"
            title="Pertukaran metadata SDI dan kesiapan SPLP"
          />
          <p className="mt-3 text-sm leading-6 text-muted">
            Selain API publik versi 1, portal menyediakan profil ekspor untuk
            kebutuhan integrasi katalog host-to-host. Endpoint berikut hanya
            berisi dataset yang telah dipublikasikan, organisasinya aktif,
            metadata profil lokal lengkap, dan memiliki setidaknya satu berkas
            publik pada versi aktif yang berhasil diproses.
          </p>
          <div className="mt-4 grid gap-3">
            <Endpoint
              method="GET"
              path="/api/v1/sdi/data.json"
              title="Ekspor JSON untuk pengambilan otomatis (harvesting)"
              summary="Mengembalikan array JSON dengan kolom yang dipetakan dari contoh rekaman pengambilan data otomatis SDI. Setiap dataset juga harus terhubung ke standar dan sistem kode yang sudah diverifikasi serta masih berlaku. Lulus pemeriksaan di portal Wajo belum berarti SPLP telah menerima data."
              params="Tidak ada parameter query; satu respons berisi seluruh dataset yang lolos kesiapan lokal. Batas: 30 permintaan per menit."
              example={`curl -sS -H "Accept: application/json" "${displayBaseUrl}/api/v1/sdi/data.json"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/catalog"
              title="Katalog DCAT/JSON-LD"
              summary="Mengembalikan dcat:Catalog berisi dcat:Dataset dan dcat:Distribution, termasuk ID stabil, penerbit, tanggal modifikasi, distribusi, tipe media, ukuran, dan checksum bila tersedia."
              params="Tidak ada parameter query; satu respons berisi seluruh dataset yang lolos kesiapan lokal. Batas: 30 permintaan per menit."
              example={`curl -sS -H "Accept: application/ld+json" "${displayBaseUrl}/api/v1/sdi/catalog"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/profile"
              title="Baca profil ekspor mesin"
              summary="Menjelaskan versi profil, daftar nama field dan artinya, endpoint yang tersedia, format respons, batas penggunaan, dan status registrasi konektor."
              params="Tidak ada."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/profile"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/standards"
              title="Registri standar"
              summary="Endpoint referensi untuk kode dan versi standar yang telah ditinjau serta berlaku."
              params="page, limit, q, type."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/standards"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/reference-codes"
              title="Registri kode referensi"
              summary="Endpoint referensi bagi integrasi untuk memakai kode yang sama, misalnya kode wilayah atau klasifikasi yang telah diverifikasi."
              params="page, limit, q, system."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/reference-codes"`}
            />
            <Endpoint
              method="GET"
              path="/api/v1/sdi/geoportal-manifest"
              title="Manifest GeoPortal"
              summary="Daftar distribusi GeoJSON aktif yang dapat diperiksa oleh aplikasi peta."
              params="Tidak ada. Batas 60 permintaan per menit."
              example={`curl -sS "${displayBaseUrl}/api/v1/sdi/geoportal-manifest"`}
            />
          </div>
          <h3 className="mt-5 text-sm font-semibold text-ink">
            Kolom profil JSON datar
          </h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#d9e4e9]">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-[#f5f8fa] text-ink">
                <tr>
                  <th className="border-b border-[#d9e4e9] px-3 py-2.5 font-semibold">
                    Field
                  </th>
                  <th className="border-b border-[#d9e4e9] px-3 py-2.5 font-semibold">
                    Isi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4edf2] text-muted">
                {[
                  ["Nama Data", "Judul resmi dataset yang diterbitkan."],
                  [
                    "Kode Instansi / Nama Instansi",
                    "Identitas dan nama organisasi produsen pada Portal Wajo.",
                  ],
                  [
                    "ID DDP / Nama DDP",
                    "Identitas dan nama DDP sesuai terminologi registri sumber; makna dan kewajibannya perlu dikonfirmasi dengan pengelola SDI.",
                  ],
                  [
                    "Sumber Referensi / Tahun Tersedia",
                    "Sumber rujukan dan tahun data tersedia.",
                  ],
                  [
                    "Kode SDS / Type SDS / Versi SDS",
                    "Rujukan standar data statistik yang benar-benar digunakan.",
                  ],
                  [
                    "Konsep / Definisi / Ukuran / Satuan",
                    "Makna data, ukuran statistik, dan satuan penyajiannya.",
                  ],
                  [
                    "Klasifikasi Penyajian",
                    "Kategori atau klasifikasi resmi yang dipakai untuk menyajikan data.",
                  ],
                  [
                    "Kode Referensi / Versi Kode Referensi",
                    "Referensi atau data induk yang digunakan dan versi rujukannya.",
                  ],
                  [
                    "Metode",
                    "Metode pengumpulan, pengolahan, kompilasi, atau perhitungan data.",
                  ],
                  [
                    "ID Dataset Daerah / Versi Dataset / Distribusi",
                    "Identitas lokal, versi aktif, checksum, format, dan URL distribusi stabil.",
                  ],
                ].map(([field, meaning]) => (
                  <tr key={field}>
                    <td className="px-3 py-2.5 align-top font-medium text-ink">
                      {field}
                    </td>
                    <td className="px-3 py-2.5 align-top">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Catatan integrasi penting.</strong> Profil JSON datar ini
            merupakan pemetaan kompatibilitas lokal dari field yang teramati
            pada contoh rekaman pengambilan data otomatis SDI. Ketersediaan
            endpoint belum membuktikan SPLP telah mendaftarkan atau menerima
            katalog Wajo. Sebelum produksi, pengelola perlu menyepakati field
            wajib, tipe data, autentikasi, jadwal pengambilan otomatis, dan
            perilaku ketika dataset berubah atau dicabut; kemudian menjalankan
            uji end-to-end dengan konektor tujuan. Endpoint DCAT/JSON-LD
            merupakan opsi pertukaran tambahan, bukan pengganti kontrak SPLP
            yang disepakati.
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Dataset yang belum lengkap dikecualikan dari ekspor dan ditampilkan
            pada menu <strong>Portal Admin → Integrasi SDI</strong> beserta
            daftar metadata yang harus dilengkapi. Gunakan kode serta definisi
            dari registri berwenang; jangan mengisi nilai contoh agar lolos
            pemeriksaan.
          </p>
        </section>

        <section
          id="security"
          className="scroll-mt-24 rounded-2xl border border-[#d9e4e9] bg-white p-5 sm:p-6"
        >
          <SectionTitle number="09" title="Batas penggunaan dan keamanan" />
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
            <li>
              API hanya menampilkan dataset dan indikator yang sudah
              diterbitkan. Berkas harus berada pada versi aktif dan ditandai
              publik agar bisa dilihat atau diunduh.
            </li>
            <li>
              Endpoint publik tidak memerlukan API key. Jangan pernah mengirim
              password, cookie admin, atau secret/service-role key ke request
              publik.
            </li>
            <li>
              Batas normalnya 120 request per menit untuk API data publik utama,
              60 request per menit untuk unduhan, dan 30 request per menit untuk
              setiap kelompok endpoint ekspor/profil SDI. Batas dihitung
              berdasarkan alamat IP dan kelompok endpoint. Jika menerima HTTP
              429, tunggu sesuai header <code>Retry-After</code>.
            </li>
            <li>
              API data publik utama menggunakan{" "}
              <code>Cache-Control: no-store</code>. Ekspor untuk pengambilan
              otomatis SDI memakai cache HTTP singkat (maksimal 60 detik, dengan
              stale-while-revalidate 300 detik); perubahan katalog akan
              menghasilkan revisi cache baru di server. Tautan unduhan bertanda
              tangan hanya berlaku 60 detik; mintalah URL baru dari endpoint
              unduhan jika kedaluwarsa.
            </li>
            <li>
              Endpoint admin dan operasi perubahan data tidak termasuk dalam API
              publik. Gunakan alur autentikasi Portal Admin untuk mengelola
              dataset.
            </li>
          </ul>
          <a
            className="mt-5 inline-flex items-center rounded-lg bg-[#1d5fa7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#174f8b]"
            href="/api/openapi"
          >
            Lihat spesifikasi OpenAPI JSON
          </a>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({ number, title }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#edf4fa] text-xs font-bold text-[#1d5fa7]">
        {number}
      </span>
      <h2 className="pt-1 text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
    </div>
  );
}

function Fact({ title, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f5f8fa] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      <p className="mt-1 text-sm leading-5 text-ink">{value}</p>
    </div>
  );
}

function Endpoint({ method, path, title, summary, params, example }) {
  return (
    <article className="min-w-0 rounded-xl border border-[#e1e8ed] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-xs font-bold text-emerald-900">
          {method}
        </span>
        <code className="break-all text-sm font-semibold text-ink">{path}</code>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted">{summary}</p>
      <p className="mt-2 text-xs leading-5 text-muted">
        <strong className="text-ink">Parameter yang didukung:</strong> {params}
      </p>
      <CodeBlock>{example}</CodeBlock>
    </article>
  );
}

function ParamTable({ rows }) {
  const includesType = rows.some((row) => row.length > 2);

  return (
    <div className="mt-3 max-w-full overflow-x-auto rounded-xl border border-[#e0e8ed]">
      <table
        className={`w-full ${includesType ? "min-w-[42rem]" : "min-w-[30rem]"} border-collapse text-left text-sm`}
      >
        <thead className="bg-[#f5f8fa] text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-semibold">
              {includesType ? "Parameter" : "Nama / kode"}
            </th>
            {includesType ? (
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Tipe
              </th>
            ) : null}
            <th scope="col" className="px-3 py-2.5 font-semibold">
              Penjelasan
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, typeOrDescription, maybeDescription]) => (
            <tr key={name} className="border-t border-[#e7edf1] align-top">
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs font-semibold text-ink">
                {name}
              </td>
              {includesType ? (
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink">
                  {typeOrDescription}
                </td>
              ) : null}
              <td className="px-3 py-2.5 leading-6 text-muted">
                {includesType ? maybeDescription : typeOrDescription}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="mt-3 max-w-full overflow-x-auto rounded-lg bg-[#102b3b] p-3 text-xs leading-5 text-[#e9f2f6]">
      <code>{children}</code>
    </pre>
  );
}

function Example({ title, code }) {
  return (
    <div className="mt-4 min-w-0">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <CodeBlock>{code}</CodeBlock>
    </div>
  );
}
