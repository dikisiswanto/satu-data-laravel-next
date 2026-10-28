import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path) =>
  readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const compact = (source) => source.replace(/\s+/g, " ").trim();
const workspaceRoot = fileURLToPath(
  new URL("../../src/app/portal/(workspace)", import.meta.url),
);

function findWorkspacePages(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return findWorkspacePages(entryPath);
    return entry.isFile() && entry.name === "page.jsx" ? [entryPath] : [];
  });
}

const routeLoaders = [
  "src/app/portal/(workspace)/loading.jsx",
  "src/app/portal/(workspace)/dataset/loading.jsx",
  "src/app/portal/(workspace)/dataset/new/loading.jsx",
  "src/app/portal/(workspace)/dataset/[id]/loading.jsx",
  "src/app/portal/(workspace)/dataset/[id]/edit/loading.jsx",
  "src/app/portal/(workspace)/statistik/loading.jsx",
  "src/app/portal/(workspace)/statistik/baru/loading.jsx",
  "src/app/portal/(workspace)/statistik/[id]/edit/loading.jsx",
  "src/app/portal/(workspace)/statistik/[id]/observasi/loading.jsx",
  "src/app/portal/(workspace)/organisasi/loading.jsx",
  "src/app/portal/(workspace)/organisasi/baru/loading.jsx",
  "src/app/portal/(workspace)/organisasi/[id]/edit/loading.jsx",
  "src/app/portal/(workspace)/pengguna/loading.jsx",
  "src/app/portal/(workspace)/review/loading.jsx",
  "src/app/portal/(workspace)/publikasi/loading.jsx",
  "src/app/portal/(workspace)/riwayat/loading.jsx",
  "src/app/portal/(workspace)/kualitas/loading.jsx",
  "src/app/portal/(workspace)/standar/loading.jsx",
  "src/app/portal/(workspace)/integrasi/loading.jsx",
  "src/app/portal/(workspace)/integrasi/[id]/loading.jsx",
  "src/app/portal/(workspace)/pengaturan/loading.jsx",
  "src/app/portal/(auth)/login/loading.jsx",
  "src/app/portal/(auth)/forgot-password/loading.jsx",
  "src/app/portal/(auth)/reset-password/loading.jsx",
];

describe("loading shells preserve static UI copy and route structure", () => {
  it("gives every admin route its own static loading shell without API requests", () => {
    for (const pagePath of findWorkspacePages(workspaceRoot)) {
      const loadingPath = join(dirname(pagePath), "loading.jsx");
      const relativePath = loadingPath.replaceAll("\\", "/");

      expect(
        existsSync(loadingPath),
        "missing loading shell: " + relativePath,
      ).toBe(true);
      expect(readFileSync(loadingPath, "utf8"), relativePath).not.toMatch(
        /\b(?:fetch|portalData|portalApi|backendFetch|useQuery)\s*\(/,
      );
    }
  });

  it("provides a route-specific loading shell for each core admin workflow", () => {
    for (const path of routeLoaders) {
      expect(
        existsSync(new URL(`../../${path}`, import.meta.url)),
        `missing loading shell: ${path}`,
      ).toBe(true);
      const source = read(path);
      expect(source, `missing loading indicator: ${path}`).toMatch(
        /LoadingBlock|LoadingField|LoadingTableToolbar|Block|Skeleton|AuthLoadingState|loading-skeleton/,
      );
      expect(source, `missing busy state: ${path}`).toMatch(
        /aria-busy|AdminPageLoading|PortalLoadingFrame|AuthLoadingState/,
      );
    }
  });

  it("keeps the public catalog's fixed heading and form labels stable while result-dependent text stays a skeleton", () => {
    const page = read("src/app/(public)/dataset/page.jsx");
    const loading = read("src/app/(public)/dataset/loading.jsx");
    const description =
      "Jelajahi data berdasarkan maksud pencarian, topik terkait, metadata, kata kunci, sumber, dan perangkat daerah—bukan hanya kecocokan judul.";
    for (const source of [page, loading]) {
      expect(source).toContain(description);
      expect(source).toContain("Kata kunci");
      expect(source).toContain("Cari dataset");
    }
    expect(loading).not.toContain('title="Dataset yang tersedia"');
    expect(loading).toContain("loading-skeleton");
  });

  it("keeps public statistics copy and GeoPortal promo shared between loading and resolved states", () => {
    const page = read("src/app/(public)/statistik/page.jsx");
    const loading = read("src/app/(public)/statistik/loading.jsx");
    const promo = read("src/components/geoportal-statistics-promo.jsx");
    const description =
      "Telusuri indikator yang telah diterbitkan, termasuk arti angka, satuan, periode, dan sumber datanya.";
    expect(page).toContain(description);
    expect(loading).toContain(description);
    expect(page).toContain("<GeoPortalStatisticsPromo />");
    expect(loading).toContain("<GeoPortalStatisticsPromo />");
    expect(promo).toContain("Jelajahi data berbasis lokasi");
    expect(promo).toContain("GeoPortal ${siteConfig.regionShortName}");
  });

  it("keeps the organization directory's helper sentence visible with only counts reserved", () => {
    const page = read("src/app/(public)/organisasi/page.jsx");
    const component = read("src/components/organization-directory.jsx");
    const loading = read("src/app/(public)/organisasi/loading.jsx");
    expect(page).toContain(
      "<OrganizationDirectory organizations={organizations} />",
    );
    for (const text of [
      "Menampilkan",
      "dari",
      "organisasi aktif.",
      "Cari perangkat daerah",
      "Nama OPD, kode, atau keterangan…",
    ]) {
      expect(component).toContain(text);
      expect(loading).toContain(text);
    }
  });

  it("preserves fixed labels in the public indicator detail fallback", () => {
    const page = read("src/app/(public)/statistik/[slug]/page.jsx");
    const loading = read("src/app/(public)/statistik/[slug]/loading.jsx");
    for (const text of [
      "Nilai terakhir di ringkasan",
      "Organisasi produsen",
      "Jumlah observasi aktif",
      "Sumber",
      "Tren nilai terpublikasi",
      "Periode</th>",
      "Wilayah</th>",
      "Dimensi</th>",
      "Nilai</th>",
      "Sumber</th>",
      "Revisi</th>",
      "Data yang tampil mengikuti status publikasi dan kebijakan akses sumber.",
    ]) {
      expect(page, `resolved indicator page missing: ${text}`).toContain(text);
      expect(loading, `indicator fallback missing: ${text}`).toContain(text);
    }
    expect(loading).toContain('aria-busy="true"');
  });

  it("keeps the new dataset category visible during form loading", () => {
    const form = read("src/components/admin/dataset-create-form.jsx");
    const loading = read("src/app/portal/(workspace)/dataset/new/loading.jsx");
    expect(form).toContain("DatasetCategoryField");
    expect(loading).toContain(
      'label="Kategori dataset (opsional)" name="category"',
    );
  });

  it("keeps page-heading copy aligned in core admin listings and forms", () => {
    const pairs = [
      [
        "src/app/portal/(workspace)/dataset/page.jsx",
        "src/app/portal/(workspace)/dataset/loading.jsx",
        "Temukan dataset dengan pencarian dan filter, lalu buka judulnya untuk memeriksa metadata, berkas, dan status publikasi.",
      ],
      [
        "src/app/portal/(workspace)/statistik/page.jsx",
        "src/app/portal/(workspace)/statistik/loading.jsx",
        "Kelola definisi indikator dan nilai statistiknya. Setiap indikator perlu memiliki satuan, sumber, dan periode yang jelas agar angkanya tidak salah ditafsirkan.",
      ],
      [
        "src/app/portal/(workspace)/organisasi/baru/page.jsx",
        "src/app/portal/(workspace)/organisasi/baru/loading.jsx",
        "Masukkan kode dan nama resmi organisasi. Jika tersedia, tambahkan email atau situs resmi agar pengguna dapat menghubungi pengampu data.",
      ],
      [
        "src/app/portal/(workspace)/statistik/baru/page.jsx",
        "src/app/portal/(workspace)/statistik/baru/loading.jsx",
        "Terangkan apa yang diukur, satuan yang dipakai, asal nilai, dan periode datanya. Informasi ini membantu orang lain membaca indikator dengan benar.",
      ],
      [
        "src/app/portal/(workspace)/pengaturan/page.jsx",
        "src/app/portal/(workspace)/pengaturan/loading.jsx",
        "Periksa identitas akun, perbarui nama tampilan, atau ganti kata sandi.",
      ],
      [
        "src/app/portal/(workspace)/kualitas/page.jsx",
        "src/app/portal/(workspace)/kualitas/loading.jsx",
        "Ringkasan ini menunjukkan hal-hal yang masih perlu diperiksa atau diperbaiki. Angkanya berasal dari pemeriksaan portal dan bukan sertifikasi kepatuhan dari instansi nasional.",
      ],
      [
        "src/app/portal/(workspace)/standar/page.jsx",
        "src/app/portal/(workspace)/standar/loading.jsx",
        "Daftarkan standar dan sistem kode yang menjadi acuan metadata dataset. Catatan baru berstatus Draf sampai sumber, dokumen pendukung, versi, dan masa berlakunya diperiksa.",
      ],
    ];
    for (const [pagePath, loadingPath, description] of pairs) {
      expect(read(pagePath), `${pagePath} missing description`).toContain(
        description,
      );
      expect(
        read(loadingPath),
        `${loadingPath} copy differs from page`,
      ).toContain(description);
    }
  });

  it("preserves fixed section headings and descriptions in statistics and audit-history loading shells", () => {
    const pairs = [
      [
        "src/app/portal/(workspace)/statistik/page.jsx",
        "src/app/portal/(workspace)/statistik/loading.jsx",
        [
          "Daftar indikator",
          "Indikator yang dapat Anda akses, beserta status pemeriksaannya.",
        ],
      ],
      [
        "src/app/portal/(workspace)/riwayat/page.jsx",
        "src/app/portal/(workspace)/riwayat/loading.jsx",
        [
          "Riwayat aktivitas",
          "Cari berdasarkan pengguna, tindakan, ID data, organisasi, atau hasil. Gunakan filter dan rentang tanggal untuk menemukan aktivitas tertentu.",
        ],
      ],
    ];
    for (const [pagePath, loadingPath, copy] of pairs) {
      const page = compact(read(pagePath));
      const loading = compact(read(loadingPath));
      for (const phrase of copy) {
        expect(page, `${pagePath} missing fixed copy: ${phrase}`).toContain(
          phrase,
        );
        expect(
          loading,
          `${loadingPath} changes fixed copy: ${phrase}`,
        ).toContain(phrase);
      }
    }
  });

  it("does not reveal permission-gated form labels before the standards page knows the user's role", () => {
    const loading = read("src/app/portal/(workspace)/standar/loading.jsx");
    const _page = read("src/app/portal/(workspace)/standar/page.jsx");
    const manager = read("src/components/admin/sdi-registry-manager.jsx");
    const gatedHeadings = [
      "Daftarkan standar",
      "Daftarkan sistem kode referensi",
      "Tambahkan entri kode",
    ];
    for (const heading of gatedHeadings) {
      expect(manager).toMatch(
        new RegExp(`<h2 className="font-semibold">\\s*${heading}\\s*</h2>`),
      );
      expect(compact(loading)).not.toContain(
        `<h2 className="font-semibold"> ${heading} </h2>`,
      );
    }
    expect(manager).toContain('label="Kode standar"');
    expect(loading).not.toContain('label="Kode standar"');
    expect(loading).toContain("Registri standar");
    expect(loading).toContain("Sistem kode referensi");
    expect(loading).toContain("Entri kode tersimpan");
  });

  it("retains the same copy for admin dashboard summary and next steps", () => {
    const page = read("src/app/portal/(workspace)/page.jsx");
    const loading = read("src/app/portal/(workspace)/loading.jsx");
    for (const text of [
      "Selamat datang",
      "Dataset dalam cakupan",
      "Perlu diperiksa",
      "Masih dikerjakan",
      "Langkah berikutnya",
      "Dataset terbaru",
    ]) {
      expect(page).toContain(text);
      expect(loading).toContain(text);
    }
  });

  it("keeps all additional admin route headings and descriptions stable during loading", () => {
    const pairs = [
      [
        "src/app/portal/(workspace)/organisasi/page.jsx",
        "src/app/portal/(workspace)/organisasi/loading.jsx",
        "Kelola organisasi yang menjadi pemilik dataset dan indikator dalam portal. Daftar yang ditampilkan menyesuaikan akses akun Anda.",
      ],
      [
        "src/app/portal/(workspace)/dataset/[id]/edit/page.jsx",
        "src/app/portal/(workspace)/dataset/[id]/edit/loading.jsx",
        "Simpan informasi sedikit demi sedikit selama dataset masih berstatus Draf. Informasi yang wajib untuk pemeriksaan ditandai; metadata SDI lanjutan dapat dilengkapi setelah rujukan resmi tersedia.",
      ],
      [
        "src/app/portal/(workspace)/organisasi/[id]/edit/page.jsx",
        "src/app/portal/(workspace)/organisasi/[id]/edit/loading.jsx",
        "Perbarui identitas dan kontak organisasi jika ada perubahan. Jika organisasi dinonaktifkan, dataset dan riwayat yang sudah tercatat tetap disimpan.",
      ],
      [
        "src/app/portal/(workspace)/statistik/[id]/edit/page.jsx",
        "src/app/portal/(workspace)/statistik/[id]/edit/loading.jsx",
        "Perubahan akan disimpan sebagai draf terlebih dahulu. Periksa kembali definisi dan sumbernya sebelum menerbitkan indikator.",
      ],
      [
        "src/app/portal/(workspace)/pengguna/page.jsx",
        "src/app/portal/(workspace)/pengguna/loading.jsx",
        "Atur akses sesuai pekerjaan dan organisasi pengguna. Pilih akses yang paling terbatas tetapi tetap cukup untuk tugasnya.",
      ],
      [
        "src/app/portal/(workspace)/review/page.jsx",
        "src/app/portal/(workspace)/review/loading.jsx",
        "Periksa metadata, sumber, periode, dan hasil pengolahan berkas. Jika ada informasi yang belum jelas, kembalikan dengan catatan perbaikan yang spesifik.",
      ],
      [
        "src/app/portal/(workspace)/riwayat/page.jsx",
        "src/app/portal/(workspace)/riwayat/loading.jsx",
        "Lihat siapa yang mengubah data, perubahan apa yang dilakukan, dan kapan waktunya. Daftar yang tampil menyesuaikan akses akun Anda.",
      ],
      [
        "src/app/portal/(workspace)/integrasi/page.jsx",
        "src/app/portal/(workspace)/integrasi/loading.jsx",
        "Halaman ini membantu Anda memeriksa apakah metadata dan berkas dataset sudah lengkap untuk dibagikan ke sistem lain. Hasil di sini hanya pemeriksaan dari portal; hasil ini belum berarti katalog sudah diterima oleh SPLP atau katalog nasional. Kode SDS dan kode referensi tetap perlu dicocokkan dengan sumber resmi.",
      ],
      [
        "src/app/portal/(workspace)/integrasi/[id]/page.jsx",
        "src/app/portal/(workspace)/integrasi/[id]/loading.jsx",
        "profil ekspor ${siteConfig.shortName}. Dataset hanya masuk ekspor siap-harvest ketika seluruh field penting dan distribusi versi aktif tersedia.",
      ],
      [
        "src/app/portal/(workspace)/statistik/[id]/observasi/page.jsx",
        "src/app/portal/(workspace)/statistik/[id]/observasi/loading.jsx",
        "Tambahkan dan kelola nilai untuk tiap periode, wilayah, atau dimensi. Nilai berstatus Draf belum tersedia di API publik sampai diperiksa dan diterbitkan.",
      ],
    ];
    for (const [pagePath, loadingPath, description] of pairs) {
      expect(
        read(pagePath),
        `${pagePath} missing stable description`,
      ).toContain(description);
      expect(
        read(loadingPath),
        `${loadingPath} description changes after loading`,
      ).toContain(description);
    }
  });

  it("keeps static navigation and disclosure text visible in route-specific loaders", () => {
    const checks = [
      [
        "src/app/portal/(workspace)/dataset/new/loading.jsx",
        [
          "Sumber resmi untuk membantu memeriksa data",
          "Metadata standar dan pertukaran SDI (lanjutan)",
          "Bisa dilengkapi setelah draf",
          "Periksa kembali sebelum menyimpan",
          "Simpan sebagai draf",
          "Mulai dari draf, lalu lanjutkan bertahap",
        ],
      ],
      [
        "src/app/portal/(workspace)/dataset/[id]/loading.jsx",
        [
          "Kembali ke daftar",
          "Tentang dataset",
          "Riwayat versi dataset",
          "Sumber data",
          "Berkas hasil pengolahan",
          "Bagian pengelolaan dataset",
          "Langkah berikutnya",
          "Kelengkapan sebelum pemeriksaan",
          "Validasi otomatis",
        ],
      ],
      [
        "src/app/portal/(workspace)/dataset/[id]/edit/loading.jsx",
        [
          "Kembali ke dataset",
          "1. Informasi utama",
          "2. Kategori dan kata kunci",
          "3. Sumber, cakupan, dan periode",
          "4. Definisi, metode, dan standar SDI",
          "Metadata standar dan pertukaran SDI (lanjutan)",
          "Simpan perubahan",
        ],
      ],
      [
        "src/app/portal/(workspace)/statistik/[id]/observasi/loading.jsx",
        [
          "Kembali ke indikator",
          "Observasi indikator",
          "Riwayat observasi",
          "Alamat API nilai indikator:",
        ],
      ],
      [
        "src/app/portal/(workspace)/integrasi/[id]/loading.jsx",
        [
          "Kembali ke kesiapan integrasi",
          "Metadata standar dan pertukaran SDI (lanjutan)",
          "Kode SDS, ID DDP, dan kode referensi tidak boleh dibuat sendiri.",
          "Simpan metadata pertukaran",
        ],
      ],
      [
        "src/app/portal/(workspace)/standar/loading.jsx",
        [
          "Registri standar",
          "Sistem kode referensi",
          "Entri kode tersimpan",
          "Status terverifikasi merupakan keputusan kurator internal setelah memeriksa sumber dan bukti; status ini bukan sertifikasi oleh BPS, BIG, Kemendagri, atau pengelola SDI nasional.",
        ],
      ],
      [
        "src/app/portal/(workspace)/publikasi/loading.jsx",
        [
          "Pemeriksaan data",
          "Daftar pemeriksaan",
          "Dataset yang menunggu keputusan pemeriksaan atau telah terbit, sesuai cakupan akses Anda.",
        ],
      ],
    ];
    for (const [path, phrases] of checks) {
      const source = compact(read(path));
      for (const phrase of phrases)
        expect(source, `${path} missing static phrase: ${phrase}`).toContain(
          compact(phrase),
        );
    }
  });

  it("reserves dashboard identity space and keeps fixed actions visible during loading", () => {
    const page = compact(read("src/app/portal/(workspace)/page.jsx"));
    const loading = compact(read("src/app/portal/(workspace)/loading.jsx"));
    for (const source of [page, loading]) {
      expect(source).toContain("Selamat datang");
      expect(source).toContain("Akun:");
      expect(source).toContain("Kelola dataset");
      expect(source).toContain(
        "Lihat daftar dataset, status pemeriksaan, dan pekerjaan yang masih perlu diselesaikan.",
      );
    }
    expect(page).toContain('className="min-w-0 truncate"');
    expect(loading).toContain(
      'className="inline-block h-4 w-40 max-w-full align-middle"',
    );
    expect(page).not.toContain("Selamat datang {profile?.display_name");
  });

  it("uses local Suspense fallbacks on the public homepage instead of replacing its static copy", () => {
    const page = read("src/app/(public)/page.jsx");
    for (const phrase of [
      "Temukan Data,",
      "Pahami {siteConfig.regionShortName}.",
      "siteConfig.regionName.toUpperCase()",
      "Dataset terbaru",
      "Data berdasarkan tema",
      "Ringkasan dihitung dari data yang tersedia untuk publik.",
    ]) {
      expect(page).toContain(phrase);
    }
    expect(page).toContain("<Suspense fallback={<HomeHeroContent loading />}>");
    expect(page).toContain(
      "<Suspense fallback={<HomeLatestDatasetsSkeleton />}",
    );
  });

  it("keeps table search, fixed filter labels, reset action, and column headings consistent while loading", () => {
    const pages = [
      {
        page: "src/app/portal/(workspace)/statistik/page.jsx",
        loading: "src/app/portal/(workspace)/statistik/loading.jsx",
        filters: ["Status", "Organisasi"],
        headers: [
          "Indikator",
          "Organisasi",
          "Satuan / periode",
          "Status",
          "Deret nilai",
          "Tindakan",
        ],
      },
      {
        page: "src/app/portal/(workspace)/pengguna/page.jsx",
        loading: "src/app/portal/(workspace)/pengguna/loading.jsx",
        filters: ["Peran", "Status", "Organisasi"],
        headers: ["Lingkup", "Peran", "Ditambahkan", "Status", "Tindakan"],
      },
      {
        page: "src/app/portal/(workspace)/review/page.jsx",
        loading: "src/app/portal/(workspace)/review/loading.jsx",
        filters: ["Status", "Organisasi"],
        headers: ["Dataset", "Organisasi", "Diperbarui", "Status", "Tindakan"],
      },
      {
        page: "src/app/portal/(workspace)/organisasi/page.jsx",
        loading: "src/app/portal/(workspace)/organisasi/loading.jsx",
        filters: ["Status"],
        headers: ["Organisasi", "Kontak", "Status", "Peran akun", "Tindakan"],
      },
    ];
    for (const item of pages) {
      const resolved = read(item.page);
      const loading = read(item.loading);
      expect(
        resolved,
        `${item.page} does not provide stable filter labels`,
      ).toContain("alwaysShowFilters");
      expect(resolved).toContain("filterLabelOverrides");
      expect(
        loading,
        `${item.loading} does not preserve the table toolbar`,
      ).toContain("LoadingTableToolbar");
      expect(loading).toContain("LoadingTableToolbar");
      expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
        "Cari berdasarkan nama, kode, status, atau rincian…",
      );
      expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
        "Reset filter",
      );
      for (const filter of item.filters) expect(loading).toContain(filter);
      for (const header of item.headers) expect(loading).toContain(header);
    }

    const auditPage = read("src/app/portal/(workspace)/riwayat/page.jsx");
    const auditLoading = read("src/app/portal/(workspace)/riwayat/loading.jsx");
    expect(auditPage).toContain(
      'searchPlaceholder="Cari pelaku, tindakan, ID objek, organisasi, atau rincian…"',
    );
    expect(auditLoading).toContain(
      "Cari pelaku, tindakan, ID objek, organisasi, atau rincian…",
    );
    expect(auditLoading).toContain('dateFilterLabel="Waktu peristiwa"');
    expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
      "{dateFilterLabel} dari",
    );
    expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
      "{dateFilterLabel} sampai",
    );

    const detailPage = read("src/app/portal/(workspace)/dataset/[id]/page.jsx");
    const detailLoading = read(
      "src/app/portal/(workspace)/dataset/[id]/loading.jsx",
    );
    for (const text of [
      "Cari versi, ringkasan perubahan, sumber, atau status…",
      'dateFilterLabel="Tanggal dibuat"',
      "Status versi",
      "Status konversi",
      "Format",
    ]) {
      expect(detailPage).toContain(text);
      expect(detailLoading).toContain(text);
    }
    expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
      "{dateFilterLabel} dari",
    );
    expect(read("src/components/admin/admin-page-loading.jsx")).toContain(
      "{dateFilterLabel} sampai",
    );
  });

  it("keeps SDI metadata detail collapsed consistently until the user chooses to open it", () => {
    const page = compact(
      read("src/app/portal/(workspace)/integrasi/[id]/page.jsx"),
    );
    const fields = compact(
      read("src/components/admin/sdi-metadata-fields.jsx"),
    );
    const loading = compact(
      read("src/app/portal/(workspace)/integrasi/[id]/loading.jsx"),
    );
    const editor = compact(
      read("src/components/admin/sdi-metadata-editor.jsx"),
    );
    const staticCopy = [
      "profil ekspor ${siteConfig.shortName}.",
      "Metadata standar dan pertukaran SDI (lanjutan)",
      "Bagian ini tidak perlu ditebak saat membuat draf. Lengkapi jika Anda sudah memiliki rujukan resmi, atau minta bantuan Walidata.",
      "Simpan metadata pertukaran",
      "Simpan metadata sumber sesuai registri resmi.",
    ];
    expect(page).toContain(staticCopy[0]);
    expect(fields).toContain(staticCopy[1]);
    expect(fields).toContain(staticCopy[2]);
    expect(editor).toContain(staticCopy[3]);
    expect(editor).toContain(staticCopy[4]);
    for (const text of staticCopy) expect(loading).toContain(text);
    expect(fields).not.toContain("<details open={hasSavedMetadata}");
    expect(loading).not.toContain("Identitas data");
  });

  it("keeps form placeholder examples visible in create and edit loading shells", () => {
    const pairs = [
      [
        "src/components/admin/dataset-create-form.jsx",
        "src/app/portal/(workspace)/dataset/new/loading.jsx",
        [
          "Cari lalu pilih organisasi…",
          "Contoh: ${siteConfig.regionName}",
          "Contoh: lisensi atau ketentuan penggunaan yang telah disetujui",
          "Pilih frekuensi",
        ],
      ],
      [
        "src/components/admin/organization-form.jsx",
        "src/app/portal/(workspace)/organisasi/baru/loading.jsx",
        ["DISKOMINFO", "dinas-komunikasi-informatika", "https://..."],
      ],
      [
        "src/components/admin/indicator-form.jsx",
        "src/app/portal/(workspace)/statistik/baru/loading.jsx",
        [
          "IND-001",
          "jumlah-penduduk",
          "Orang, persen, ton",
          "2025 atau Triwulan I 2026",
        ],
      ],
    ];
    for (const [resolvedPath, loadingPath, samples] of pairs) {
      const resolved = read(resolvedPath);
      const loading = read(loadingPath);
      for (const sample of samples) {
        expect(
          resolved,
          `${resolvedPath} missing example: ${sample}`,
        ).toContain(sample);
        expect(
          loading,
          `${loadingPath} hides fixed example: ${sample}`,
        ).toContain(sample);
      }
    }
  });

  it("uses distinct authentication loading copy instead of the same generic form skeleton", () => {
    const authLoading = read("src/components/auth/loading-state.jsx");
    const loginPage = read("src/app/portal/(auth)/login/page.jsx");
    const forgotPage = read("src/app/portal/(auth)/forgot-password/page.jsx");
    const resetPage = read("src/app/portal/(auth)/reset-password/page.jsx");
    for (const [source, texts] of [
      [loginPage, ["Masuk ke Portal Admin", "Alamat email", "Kata sandi"]],
      [forgotPage, ["Atur ulang kata sandi", "Email akun", "Kirim instruksi"]],
      [
        resetPage,
        [
          "Buat kata sandi baru",
          "Kata sandi baru",
          "Ulangi kata sandi",
          "Simpan kata sandi",
        ],
      ],
    ])
      for (const text of texts) expect(source).toContain(text);
    expect(authLoading).toContain('variant === "forgot"');
    expect(authLoading).toContain('variant === "reset"');
    expect(authLoading).toContain("Masuk ke Portal Admin");
  });
});
