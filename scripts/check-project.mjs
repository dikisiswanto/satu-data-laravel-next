import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const errors = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name))
      errors.push(
        `Berkas TypeScript tidak digunakan dalam proyek ini: ${path.relative(root, file)}`,
      );
  }
}
await walk(path.join(root, "src"));
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (pkg.packageManager !== "npm@10.9.2")
  errors.push("packageManager harus npm@10.9.2");
if (!pkg.engines.node.includes("22.16.0") || !pkg.engines.node.includes("<25"))
  errors.push("Versi Node.js yang didukung adalah 22 dan 24");

for (const required of [
  "src/app/(public)/dataset/[slug]/page.jsx",
  "src/app/portal/(auth)/login/page.jsx",
  "src/app/portal/layout.jsx",
  "src/app/portal/(workspace)/layout.jsx",
  "src/lib/backend/server.js",
  "src/lib/backend/compat-server.js",
  "src/lib/backend/request-user.js",
  "src/lib/data/public.js",
  "src/components/source-upload-form.jsx",
  "src/components/query-provider.jsx",
  "src/components/portal-query-cache-guard.jsx",
  "src/components/dataset-resource-preview.jsx",
  "src/lib/api/query-keys.js",
  ".env.example",
  "backend/.env.example",
  "backend/artisan",
  "backend/bootstrap/cache/.gitignore",
  "backend/routes/api.php",
  "backend/app/Jobs/ProcessDatasetConversion.php",
  "backend/app/Services/DatasetPreviewBudget.php",
  "backend/tests/Unit/DatasetPreviewBudgetTest.php",
  "backend/tests/Unit/TrustConfiguredProxiesTest.php",
  "backend/app/Console/Commands/ImportLegacySupabase.php",
  "backend/database/migrations/2026_10_01_000001_create_identity_and_organizations.php",
  "backend/database/migrations/2026_10_01_000002_create_dataset_workflow_tables.php",
  "backend/database/migrations/2026_10_01_000003_create_indicator_sdi_audit_tables.php",
  "backend/database/migrations/2026_10_26_000001_add_legacy_compatibility_columns.php",
  "backend/database/migrations/2026_10_26_000002_add_backend_query_indexes.php",
  "backend/database/migrations/2026_10_26_000003_expand_authorization_and_integrity_constraints.php",
  "backend/database/migrations/2026_10_26_000004_enforce_membership_scope_uniqueness.php",
  "backend/database/migrations/2026_10_27_000001_allow_progressive_dataset_drafts.php",
  "backend/tests/Feature/PortalIndicatorWorkflowTest.php",
  "backend/tests/Feature/ProgressiveDatasetDraftTest.php",
  "scripts/export-legacy-storage.mjs",
  "next.config.mjs",
  "Dockerfile",
  "docker-compose.yml",
  "deploy/laravel-nginx.conf",
  "deploy/edge-nginx.conf",
  "deploy/vps-host-nginx.example.conf",
  "scripts/deploy-vps.sh",
  "backend/openapi/openapi.json",
  "backend/openapi/openapi.yaml",
  "README.md",
  "DOKUMENTASI.md",
  "PENGUJIAN.md",
  "backend/app/Models/Role.php",
  "backend/app/Models/Permission.php",
  "backend/tests/Feature/AuthorizationCatalogTest.php",
  "tests/unit/migration-index-identifiers.test.js",
]) {
  try {
    await stat(path.join(root, required));
  } catch {
    errors.push(`Berkas proyek wajib tidak ditemukan: ${required}`);
  }
}

const checks = [
  [
    ".github/workflows/ci.yml",
    /node-version-file:\s*\.nvmrc[\s\S]*?npm ci/,
    "CI harus mengikuti versi Node.js proyek dan memasang dependensi dari lockfile",
  ],
  [
    ".github/workflows/ci.yml",
    /backend-tests:[\s\S]*?mkdir -p bootstrap\/cache[\s\S]*?composer install[\s\S]*?php artisan migrate --force[\s\S]*?php artisan test/,
    "CI harus menyiapkan direktori runtime lalu menguji migration dan fitur Laravel pada MariaDB",
  ],
  [
    "backend/Dockerfile",
    /COPY \. \.[\s\S]*?RUN mkdir -p [^\n]*bootstrap\/cache[\s\S]*?composer dump-autoload/,
    "Image Laravel harus membuat direktori cache sebelum Composer menjalankan package discovery",
  ],
  [
    "backend/bootstrap/app.php",
    /TrustConfiguredProxies::class/,
    "Bootstrap harus menghindari config() sebelum container Laravel siap",
  ],
  [
    "backend/app/Http/Middleware/TrustConfiguredProxies.php",
    /config\('app\.trusted_proxies'\)/,
    "Proxy tepercaya harus dibaca setelah konfigurasi Laravel tersedia",
  ],
  [
    ".github/workflows/ci.yml",
    /docker-images:[\s\S]{0,160}?needs:\s*\[verify, backend-tests\]/,
    "Image produksi hanya boleh dibangun setelah verifikasi frontend dan backend lulus",
  ],
  [
    "next.config.mjs",
    /source:\s*"\/api\/:path\*"[\s\S]*destination:\s*`\$\{backend\}\/api\/:path\*`/,
    "Rute API Next.js harus diteruskan ke Laravel",
  ],
  [
    "src/lib/backend/server.js",
    /wajo_portal_token/,
    "Permintaan server Next.js harus meneruskan cookie sesi Laravel",
  ],
  [
    "src/lib/backend/server.js",
    /auth\s*=\s*true/,
    "Helper backend harus mendukung akses publik tanpa meneruskan token portal",
  ],
  [
    "src/proxy.js",
    /wajo_portal_token/,
    "Penjaga rute portal harus memakai cookie token Laravel",
  ],
  [
    "src/app/robots.js",
    /disallow:\s*\[[^\]]*\"\/portal\"[^\]]*\"\/portal\/\"/,
    "Kebijakan robots harus mengecualikan rute administrasi portal",
  ],
  [
    "src/components/source-upload-form.jsx",
    /X-Upload-Token/,
    "Unggahan langsung harus memakai token kapabilitas Laravel berumur pendek",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /assertJsonComplexityBounds|JSON_THROW_ON_ERROR/,
    "Worker konversi harus menolak JSON rusak atau terlalu kompleks",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /hash_file\('sha256'/,
    "Worker konversi harus memverifikasi checksum berkas sumber",
  ],
  [
    "backend/app/Services/DatasetWorkflowService.php",
    /processed_resource_required/,
    "Publikasi membutuhkan resource yang berhasil diproses",
  ],
  [
    "backend/app/Services/DatasetWorkflowService.php",
    /candidateMetadata[\s\S]*Lengkapi sebelum pemeriksaan/,
    "Pemeriksaan harus memvalidasi metadata penting pada snapshot versi yang diajukan",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    /Draf yang dapat ditelusuri harus mudah dibuat[\s\S]*'organization_id' => \['required'/,
    "Pembuatan draf hanya mewajibkan judul dan organisasi pengampu",
  ],
  [
    "backend/app/Http/Middleware/RequireSameOriginForMutations.php",
    /Origin|Referer/,
    "Permintaan API yang mengubah data harus memeriksa origin sumber",
  ],
  [
    "backend/app/Console/Commands/ImportLegacySupabase.php",
    /LEGACY_SUPABASE_DATABASE_URL/,
    "Impor legacy harus dijalankan secara eksplisit dari basis data sumber terpisah",
  ],
  [
    "backend/app/Console/Commands/ImportLegacySupabase.php",
    /dry-run/,
    "Impor legacy harus menyediakan mode simulasi (dry-run)",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    /hash_equals|token_hash/,
    "Unggahan biner harus memakai token kapabilitas yang di-hash dan kedaluwarsa",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /is_public/,
    "API publik harus mengecualikan resource privat",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /where\('dataset_resources\.is_source', false\)/,
    "API publik tidak boleh mengekspos berkas sumber unggahan",
  ],
  [
    "backend/app/Services/AccessService.php",
    /function organizationIdsWithPermission[\s\S]*hasPermission\(\$user, \$permissionCode\)/,
    "Cakupan izin harus membedakan izin global dari ketiadaan akses organisasi",
  ],
  [
    "backend/database/migrations/2026_10_26_000004_enforce_membership_scope_uniqueness.php",
    /membership_user_scope_role_strict_unique/,
    "Membership global harus unik meskipun organization_id bernilai NULL",
  ],
  [
    "backend/app/Console/Commands/ImportLegacySupabase.php",
    /'dataset_versions'[\s\S]*'dataset_resources'[\s\S]*'sdi_standard_registry'[\s\S]*'reference_code_systems'[\s\S]*'dataset_sdi_metadata'/,
    "Impor legacy harus memuat induk foreign key sebelum data yang bergantung padanya",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
    /Indikator yang sedang ditinjau atau telah diarsipkan tidak dapat diedit langsung/,
    "Indikator yang ditinjau atau diarsipkan tidak boleh diedit langsung",
  ],
  [
    "src/app/portal/(auth)/login/actions.js",
    /payload\?\.data\?\.expires_at[\s\S]*Math\.floor\(\(tokenExpiresAt - Date\.now\(\)\) \/ 1000\)/,
    "Masa berlaku cookie frontend harus mengikuti kedaluwarsa token Laravel",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /whereNotNull\('category'\)->where\('category', '<>', ''\)/,
    "Filter kategori harus mengecualikan kategori kosong dengan kondisi SQL yang valid",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /whereColumn\('dataset_resources\.dataset_version', 'd\.current_version'\)/,
    "Respons publik hanya boleh memuat resource versi aktif",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalSdiController.php",
    /currentPublicResourcesFor[\s\S]*currentSdiMetadataFor/,
    "Ekspor SDI hanya boleh mengambil resource dan metadata versi aktif dengan query terbatas",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
    /indicator\.observation_create[\s\S]*DB::transaction/,
    "Pembuatan observasi indikator dan audit harus tersimpan secara atomik",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
    /catalogRevision->bump\s*\(/,
    "Perubahan status indikator harus memperbarui revisi katalog melalui layanan khusus; kapan revisi berubah diuji oleh PHPUnit",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /use App\\Services\\DatasetPreviewBudget;/,
    "Worker konversi harus memakai pembatas ukuran pratinjau yang diuji langsung",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /shouldFlushBatch\(count\(\$batch\), \$batchBytes, \$estimatedBytes\)/,
    "Worker harus membatasi batch pratinjau berdasarkan jumlah baris dan ukuran byte",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /preview_enabled' => false/,
    "Jika proyeksi terlalu besar, pratinjau dimatikan tanpa menghapus berkas unduhan",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /assertOutputSize\('csv'[\s\S]*assertOutputSize\('geojson'/,
    "Konversi harus membatasi ukuran tiap keluaran sebelum membuat artefak berikutnya",
  ],
  [
    "backend/app/Jobs/ProcessDatasetConversion.php",
    /conversion_output_write_failed/,
    "Konversi harus memeriksa kegagalan penulisan penyimpanan objek",
  ],
  [
    "backend/app/Rules/MaxPasswordBytes.php",
    /strlen\(\$value\) > \$this->maxBytes/,
    "Kata sandi bcrypt harus dibatasi berdasarkan byte, bukan jumlah karakter Unicode",
  ],
  [
    "backend/config/hashing.php",
    /'limit' => 72/,
    "Batas byte bcrypt harus dinyatakan dalam konfigurasi hash aplikasi",
  ],
  [
    "backend/app/Providers/AppServiceProvider.php",
    /RateLimiter::for\('portal-user'[\s\S]*user:/,
    "Rute portal terautentikasi memerlukan pembatasan per pengguna selain per IP",
  ],
  [
    "deploy/edge-nginx.conf",
    /map \$http_cf_connecting_ip \$client_real_ip[\s\S]*limit_conn per_ip_conn 20/,
    "Edge proxy harus membatasi trafik berdasarkan IP pengunjung dan jumlah koneksi bersamaan",
  ],
  [
    "backend/.env.example",
    /PRIVATE_STORAGE_PATH/,
    "Berkas sumber yang diunggah harus disimpan secara privat",
  ],
  [
    "backend/config/filesystems.php",
    /PRIVATE_STORAGE_PREFIX/,
    "Object storage S3 tidak boleh memakai path filesystem lokal sebagai prefix objek",
  ],
  [
    "docker-compose.yml",
    /database-data:[\s\S]*app-storage:/,
    "Stack produksi harus menyimpan database dan berkas pada volume bernama",
  ],
  [
    "docker-compose.yml",
    /cloudflared:[\s\S]*profiles:\s*\[tunnel\]/,
    "Cloudflare Tunnel harus opsional, bukan syarat deployment standar",
  ],
  [
    "deploy/edge-nginx.conf",
    /limit_req_zone[\s\S]*api_auth[\s\S]*limit_req_status 429/,
    "Edge proxy harus membatasi trafik API dan autentikasi per IP",
  ],
  [
    "src/app/styles/admin-console.css",
    /prefers-reduced-motion/,
    "Konsol admin harus menghormati preferensi aksesibilitas reduced motion",
  ],
  [
    "src/app/styles/admin-design-system.css",
    /portal-page-heading/,
    "Halaman admin harus memakai gaya judul halaman bersama",
  ],
  [
    "src/components/portal-navigation.jsx",
    /portal-mobile-navigation-panel grid gap-3 border-t/,
    "Navigasi admin harus mempertahankan panel responsif langsung di JSX",
  ],
  [
    "src/components/portal-navigation.jsx",
    /item\.roles\.some/,
    "Navigasi admin harus menyembunyikan menu di luar peran akun aktif",
  ],
  [
    "src/components/portal-shell.jsx",
    /portal-topbar sticky top-0[\s\S]*lg:sticky lg:top-\[100px\]/,
    "Shell dan sidebar admin harus tetap persisten saat navigasi desktop",
  ],
  [
    "src/app/portal/(auth)/login/page.jsx",
    /sessionCheckError[\s\S]*if \(user && !sessionCheckError && !authUnavailable\) redirect\("\/portal"\)/,
    "Login hanya boleh mengarahkan pengguna setelah pemeriksaan sesi berhasil",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalAdminController.php",
    /auditLogs[\s\S]*'a\.request_id'/,
    "API riwayat audit harus mengirim ID permintaan yang tampil di tabel",
  ],
  [
    "src/components/admin/dataset-create-form.jsx",
    /Judul dataset[\s\S]*required[\s\S]*organization_id[\s\S]*Lengkapi informasi data[\s\S]*opsional saat membuat draf/,
    "Form draf dataset harus ringkas dan dapat dilengkapi bertahap",
  ],
  [
    "docker-compose.yml",
    /NEXT_PUBLIC_SITE_URL:[\s\S]*?NEXT_PUBLIC_GEOPORTAL_URL/,
    "Konfigurasi publik Next.js harus dikirim sebagai argumen build Docker",
  ],
  [
    "Dockerfile",
    /ARG NEXT_PUBLIC_SITE_URL[\s\S]*ENV BACKEND_API_URL=\$\{BACKEND_API_URL\}[\s\S]*NEXT_PUBLIC_SITE_URL=\$\{NEXT_PUBLIC_SITE_URL\}/,
    "Konfigurasi NEXT_PUBLIC harus tersedia saat build Next.js",
  ],
  [
    "backend/routes/api.php",
    /Route::get\('\/openapi\.yaml'/,
    "Laravel harus menyajikan OpenAPI YAML",
  ],
  [
    "src/components/dataset-resource-preview.jsx",
    /useQuery\(/,
    "Pratinjau publik berpaginasi harus memakai cache dan pembatalan React Query",
  ],
  [
    "src/components/dataset-resource-preview.jsx",
    /row\.row \?\? row\.values/,
    "Tabel pratinjau harus membaca payload baris Laravel dan tetap menerima bentuk lama",
  ],
  [
    "src/components/dataset-resource-preview.jsx",
    /typeof column === "string"/,
    "Tabel pratinjau harus menormalisasi kolom berbentuk string maupun objek",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /where\('resource_id', \$resourceId\)->count\(\)/,
    "Paginasi pratinjau harus menghitung baris yang benar-benar tersimpan",
  ],
  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /DB::table\('organizations'\)->where\('is_active', true\)->count\(\)/,
    "Jumlah organisasi aktif di beranda harus sama dengan direktori publik",
  ],

  [
    "backend/app/Http/Controllers/Api/PublicDataController.php",
    /page_out_of_range/,
    "API pratinjau harus menolak nomor halaman di luar jangkauan",
  ],
  [
    "src/app/(public)/api-data/page.jsx",
    /organizations\/\{slug\}/,
    "Dokumentasi API publik harus mencantumkan endpoint detail organisasi",
  ],
  [
    "src/app/(public)/api-data/page.jsx",
    /api\/openapi\.yaml/,
    "Dokumentasi API publik harus menjelaskan endpoint OpenAPI JSON dan YAML",
  ],
  [
    "src/lib/data/organizations.js",
    /rawLastPage[\s\S]*maxPages/,
    "Direktori organisasi harus mengikuti paginasi tanpa berhenti diam-diam pada 100 data",
  ],
  [
    "src/app/sitemap.js",
    /getSitemapIndicators[\s\S]*statistik\/\$\{item\.slug\}/,
    "Halaman detail indikator publik harus masuk sitemap",
  ],
  [
    "src/app/(public)/statistik/[slug]/page.jsx",
    /serializeJsonLd[\s\S]*GovernmentOrganization/,
    "Detail indikator publik harus memuat metadata terstruktur yang aman",
  ],
  [
    "src/app/layout.jsx",
    /wajo-hero-panorama\.webp/,
    "Metadata root harus mengatur gambar pratinjau sosial",
  ],
  [
    "src/components/portal-query-cache-guard.jsx",
    /removeQueries/,
    "Cache query privat harus dibersihkan saat logout atau kembali ke login",
  ],
  [
    "src/lib/backend/compat-server.js",
    /requestedLimit > 500/,
    "Komponen server legacy tidak boleh diam-diam memotong permintaan di atas 500 baris",
  ],
  [
    "src/lib/backend/compat-server.js",
    /table === "indicators"[\s\S]{0,120}get\("id"\)[\s\S]{0,180}api\/v1\/portal\/indicators\/\$\{encodeURIComponent\(indicatorId\)\}/,
    "Pencarian indikator berdasarkan ID harus memakai endpoint detail khusus",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalIndicatorController.php",
    /function show\(Request \$request, string \$id\)/,
    "Indikator portal harus memiliki endpoint detail yang terotorisasi",
  ],
  [
    "backend/app/Http/Controllers/Api/PortalDatasetController.php",
    /include_sdi_metadata[\s\S]*dataset_sdi_metadata/,
    "Halaman kesiapan SDI harus menerima metadata dan registri terkait dari backend",
  ],
  [
    "backend/database/migrations/2026_10_01_000003_create_indicator_sdi_audit_tables.php",
    /Schema::create\('reference_code_entries'[\s\S]*boolean\('is_active'\)/,
    "Entri kode referensi harus mempertahankan status aktif data legacy",
  ],
  [
    "backend/database/migrations/2026_10_26_000001_add_legacy_compatibility_columns.php",
    /reviewed_at[\s\S]*is_active/,
    "Instalasi MariaDB lama harus menerima kolom kompatibilitas tambahan",
  ],
  [
    "src/components/source-upload-form.jsx",
    /invalidateQueries\(\{ queryKey: portalQueryKeys\.datasets\(\) \}\)/,
    "Unggahan harus membatalkan cache daftar dataset dan detail",
  ],
];
for (const [file, pattern, message] of checks) {
  const text = await readFile(path.join(root, file), "utf8").catch(() => "");
  if (!pattern.test(text)) errors.push(message);
}

const workflowMigration = await readFile(
  path.join(
    root,
    "backend/database/migrations/2026_10_01_000002_create_dataset_workflow_tables.php",
  ),
  "utf8",
);
const validationIndex = workflowMigration.match(
  /\$table->index\(\['dataset_id', 'dataset_version', 'created_at'\], '([^']+)'\);/,
);
if (
  !validationIndex ||
  validationIndex[1].length > 64 ||
  validationIndex[1] !== "validation_run_ds_ver_created_idx"
) {
  errors.push(
    "Indeks riwayat validasi harus memakai nama eksplisit yang tidak melebihi batas 64 karakter MySQL/MariaDB",
  );
}
if (
  workflowMigration.includes(
    "dataset_validation_runs_dataset_id_dataset_version_created_at_index",
  )
) {
  errors.push(
    "Nama indeks riwayat validasi otomatis yang terlalu panjang masih ditemukan",
  );
}

const bootstrapSource = await readFile(
  path.join(root, "backend/bootstrap/app.php"),
  "utf8",
);
if (/\bconfig\s*\(/.test(bootstrapSource)) {
  errors.push(
    "bootstrap/app.php tidak boleh memanggil config() saat callback middleware dibangun",
  );
}
const workflowNames = (
  await readdir(path.join(root, ".github/workflows"))
).filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"));
if (workflowNames.length !== 1 || workflowNames[0] !== "ci.yml") {
  errors.push(
    "Semua pemeriksaan otomatis harus terpusat pada satu workflow .github/workflows/ci.yml",
  );
}
const conversionStatusSource = await readFile(
  path.join(root, "src/components/admin/conversion-job-status.jsx"),
  "utf8",
);
if (
  /initialDataUpdatedAt:\s*Date\.now\s*\(/.test(conversionStatusSource) ||
  /useState\(\s*\(\)\s*=>\s*Date\.now\s*\(\)\s*\)/.test(conversionStatusSource)
) {
  errors.push(
    "Status konversi harus memakai timestamp deterministik, bukan Date.now() saat render",
  );
}

const routesSource = await readFile(
  path.join(root, "backend/routes/api.php"),
  "utf8",
);
const canonicalRoutesSource =
  routesSource.split("// Canonical versioned API aliases.")[1] || "";
if (
  !/Route::get\('\/indicators\/\{id\}', \[PortalIndicatorController::class, 'show'\]\)/.test(
    canonicalRoutesSource,
  )
) {
  errors.push(
    "Endpoint detail indikator harus terdaftar pada grup rute kanonis v1",
  );
}
if (
  !/Route::post\('\/indicators\/\{id\}\/workflow', \[PortalIndicatorController::class, 'action'\]\)/.test(
    canonicalRoutesSource,
  )
) {
  errors.push("Aksi alur indikator harus memakai endpoint kanonis yang jelas");
}
if (
  !/Route::patch\('\/indicators\/\{id\}\/observations\/\{observationId\}', \[PortalIndicatorController::class, 'publishObservation'\]\)/.test(
    canonicalRoutesSource,
  )
) {
  errors.push("Publikasi observasi harus menunjuk resource observasi tertentu");
}

const manifest = JSON.parse(
  await readFile(path.join(root, "backend/openapi/openapi.json"), "utf8"),
);
if (manifest.openapi !== "3.1.0")
  errors.push("Manifest OpenAPI harus tetap menggunakan OpenAPI 3.1.0");
if (
  manifest.paths["/api/v1/portal/datasets"]?.post?.requestBody?.content?.[
    "application/json"
  ]?.schema?.$ref !== "#/components/schemas/DatasetDraftCreateRequest"
)
  errors.push(
    "Endpoint pembuatan draf harus menerbitkan kontrak request yang ringkas",
  );
if (
  JSON.stringify(
    manifest.components?.schemas?.DatasetDraftCreateRequest?.required || [],
  ) !== JSON.stringify(["title", "organization_id"])
)
  errors.push(
    "Skema pembuatan draf hanya boleh mewajibkan judul dan organisasi",
  );
if (!manifest.paths["/api/v1/organizations/{slug}"]?.get)
  errors.push("Kontrak OpenAPI belum memuat detail organisasi publik");
for (const path of ["/api/openapi", "/api/openapi.json", "/api/openapi.yaml"]) {
  if (!manifest.paths[path]?.get)
    errors.push(`Endpoint dokumen OpenAPI belum ada di spesifikasi: ${path}`);
}
if (
  !manifest.paths["/api/v1/datasets/{slug}/resources/{resourceId}/rows"]?.get
    ?.responses?.["400"]
)
  errors.push(
    "Endpoint pratinjau OpenAPI harus mendokumentasikan halaman di luar jangkauan",
  );

for (const [route, expectedParams] of Object.entries({
  "/api/v1/portal/datasets": [
    "q",
    "statuses",
    "organization_ids",
    "created_from",
    "created_to",
    "include_sdi_metadata",
    "limit",
    "offset",
    "sort",
  ],
  "/api/v1/portal/indicators": [
    "q",
    "statuses",
    "organization_ids",
    "limit",
    "offset",
    "sort",
  ],
})) {
  const queryParameters = new Set(
    (manifest.paths[route]?.get?.parameters || []).map(
      (parameter) => parameter.name,
    ),
  );
  for (const name of expectedParams)
    if (!queryParameters.has(name))
      errors.push(
        `Kontrak daftar OpenAPI belum memuat parameter ${name}: ${route}`,
      );
}
if (
  !manifest.components?.schemas?.PaginatedListResponse?.properties?.meta
    ?.properties?.total
)
  errors.push("Kontrak paginasi OpenAPI harus mendefinisikan meta.total");
if (manifest.paths["/api/v1/portal/indicators/{id}"]?.post?.deprecated !== true)
  errors.push("Alias alur indikator lama harus ditandai deprecated di OpenAPI");
if (
  manifest.paths["/api/v1/portal/indicators/{id}/observations"]?.patch
    ?.deprecated !== true
)
  errors.push(
    "Alias publikasi observasi lama harus ditandai deprecated di OpenAPI",
  );
for (const endpoint of [
  "/api/v1/datasets",
  "/api/v1/portal/datasets/{id}/uploads",
  "/api/v1/portal/audit-logs",
  "/api/v1/portal/data-quality/summary",
  "/api/v1/portal/sdi/registry/entries",
  "/api/v1/portal/integrations/preflight",
  "/api/v1/portal/indicators/{id}",
  "/api/v1/portal/indicators/{id}/workflow",
  "/api/v1/portal/indicators/{id}/observations/{observationId}",
]) {
  if (!manifest.paths[endpoint])
    errors.push(`Kontrak OpenAPI belum memuat endpoint kanonis: ${endpoint}`);
}
const operationIds = Object.entries(manifest.paths).flatMap(
  ([route, methods]) =>
    Object.entries(methods)
      .filter(([method]) =>
        ["get", "post", "put", "patch", "delete"].includes(method),
      )
      .map(([method, operation]) => ({
        route,
        method,
        id: operation.operationId,
      })),
);
const seenOperationIds = new Set();
for (const op of operationIds) {
  if (!op.id)
    errors.push(
      `operationId OpenAPI tidak ditemukan: ${op.method.toUpperCase()} ${op.route}`,
    );
  else if (seenOperationIds.has(op.id))
    errors.push(`operationId OpenAPI duplikat: ${op.id}`);
  else seenOperationIds.add(op.id);
}

const activeSourceFiles = [];
async function walkSource(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkSource(file);
    else if (/\.(js|jsx)$/.test(entry.name)) activeSourceFiles.push(file);
  }
}
await walkSource(path.join(root, "src"));
for (const file of activeSourceFiles) {
  const text = await readFile(file, "utf8");
  if (/from\s+["']@supabase\//.test(text))
    errors.push(
      `Impor SDK runtime Supabase masih ditemukan di frontend: ${path.relative(root, file)}`,
    );
  if (/from\s+["']@\/lib\/supabase\//.test(text))
    errors.push(
      `Impor runtime Supabase lama masih ditemukan di frontend: ${path.relative(root, file)}`,
    );
}

const backendPhpFiles = [];
async function walkBackendApp(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkBackendApp(file);
    else if (entry.name.endsWith(".php")) backendPhpFiles.push(file);
  }
}
await walkBackendApp(path.join(root, "backend/app"));
for (const file of backendPhpFiles) {
  const text = await readFile(file, "utf8");
  if (/\benv\s*\(/.test(text))
    errors.push(
      `Pemanggilan env() di luar konfigurasi runtime ditemukan: ${path.relative(root, file)}`,
    );
}
const portalAdminSource = await readFile(
  path.join(root, "backend/app/Http/Controllers/Api/PortalAdminController.php"),
  "utf8",
);
if (
  /password'\s*=>\s*Str::random\(/.test(portalAdminSource) &&
  !/'password'\s*=>\s*'hashed'/.test(
    await readFile(path.join(root, "backend/app/Models/User.php"), "utf8"),
  )
)
  errors.push(
    "Kata sandi undangan sementara harus di-hash melalui cast model User",
  );
const workflowService = await readFile(
  path.join(root, "backend/app/Services/DatasetWorkflowService.php"),
  "utf8",
);
if (
  !/lockForUpdate\(\)/.test(workflowService) ||
  !/permissionForAction/.test(workflowService) ||
  !/requirePermissionInOrganization/.test(workflowService)
)
  errors.push(
    "Workflow dataset harus memeriksa ulang izin dan status di dalam row lock",
  );

if (errors.length) {
  console.error("Pemeriksaan proyek gagal:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(
  "Pemeriksaan proyek lulus: dokumentasi inti tersedia, katalog akses dan kontrak Next.js/Laravel konsisten, serta tidak ada impor SDK Supabase aktif.",
);
