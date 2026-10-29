# Pengujian dan audit

## Perintah CI

Jalankan dari root dengan dependensi terpasang:

```bash
npm ci
npm run check       # struktur, kontrak API, import, namespace PHP
npm run lint        # ESLint
npm run test        # Vitest
npm run build       # build Next.js produksi
npx playwright install --with-deps chromium
npm run test:e2e    # browser

cd backend
composer install --no-interaction --prefer-dist
php artisan test    # PHPUnit + integrasi Laravel
php artisan migrate --force  # pada database uji kosong, bukan produksi
```

CI backend memakai MariaDB. Pertahankan engine yang sama untuk pengujian migration, foreign key komposit, transaksi, dan query integrasi.

## Cakupan saat ini

- **Vitest:** 35 berkas test terkait validasi, kontrak API, cache, form, dashboard, aksesibilitas, UI publik, alur dataset bertahap, upload sumber, dan panduan workflow admin. Perbarui angka jumlah kasus dengan output `vitest run` ketika runner tersedia.
- **Playwright:** 1 berkas / 16 skenario navigasi, pencarian, login portal, filter, statistik, pratinjau, CRUD organisasi, dan viewport mobile. Satu skenario bisa ditandai skipped berdasarkan kondisi fixture.
- **PHPUnit:** 14 kelas test backend mencakup izin, katalog role, workflow indikator, draf progresif, API publik, autentikasi cookie, batas kata sandi, anggaran pratinjau konversi, dan konfigurasi proxy tepercaya.
- **Pemeriksaan statis:** kontrak Next.js/Laravel dan OpenAPI, import relatif/alias, namespace serta method rute PHP.

Sebagian test frontend memeriksa struktur source untuk mencegah regresi tampilan. Test seperti ini berguna untuk aturan UI yang eksplisit, tetapi tidak membuktikan perilaku runtime. Aturan bisnis kritis harus diuji pada service/API atau melalui test integrasi; jangan hanya mengandalkan pola teks di source.

## Regresi workflow admin terbaru

- `dataset-workflow-ux.test.js`: memastikan alur lima langkah konsisten, metadata draf dapat disimpan bertahap, upload memvalidasi ekstensi/ukuran sebelum request, dan kontrak API tidak mewajibkan metadata kepatuhan saat setiap penyimpanan draf.
- `admin-workflow-guidance.test.js`: memastikan form indikator dikelompokkan menurut identitas/definisi/nilai, identitas organisasi dibedakan dari kontak opsional, dan form pengguna hanya menampilkan satu alur (undang pengguna baru atau tambahkan akses untuk akun yang sudah ada).
- `loading-static-shell-parity.test.js`: memastikan label dan contoh tetap sama antara loading shell dan halaman resolved agar transisi loading tidak menyesatkan.
- `admin-form-consistency.test.js`: memeriksa pola visual kontrol/form.
- `dataset-management-architecture.test.js`: memeriksa metadata lebih dahulu, pemisahan sumber dan distribusi, paritas loading shell, statistik indikator tanpa fetch tambahan, profil branding generik, dan urutan middleware autentikasi.
- `tenant-branding.test.js`: memeriksa brand generik, wilayah terkonfigurasi, dan aset Wajo yang hanya aktif lewat profil eksplisit.
- `FrontendCookieAuthenticationTest.php`: memastikan verifikasi sesi berulang dan perubahan profil lewat cookie frontend terautentikasi; `AttachFrontendTokenTest.php` juga mencakup cookie legacy. Tes request JSON secara eksplisit memanggil `withCredentials()`, sebab helper JSON Laravel mengosongkan cookie secara default jika opsi credentials tidak diaktifkan.
- `ProgressiveDatasetDraftTest.php`: mencakup penyimpanan metadata bertahap dan menolak pengajuan review sampai metadata penting lengkap.

## Perbaikan build Docker PHP

Build backend membutuhkan paket sistem `libxml2-dev` untuk menyediakan `libxml-2.0.pc` saat mengompilasi ekstensi PHP `dom`, `xml`, dan `xmlwriter`. Paket ini sudah ditambahkan ke `backend/Dockerfile`. Jika build sebelumnya gagal dengan pesan `Package 'libxml-2.0' ... not found`, bangun ulang image API. Peringatan `mbstring ... is already loaded` pada log yang sama bukan penyebab kegagalan fatal; bila tetap muncul setelah build berhasil, periksa apakah ekstensi dimuat lebih dari sekali.

## Temuan yang sudah diperbaiki

- Source memakai `import "server-only"` di beberapa modul server, tetapi paketnya tidak tercatat di `package.json` maupun lockfile. Dependensi `server-only@0.0.1` sekarang dinyatakan langsung agar instalasi bersih tidak bergantung pada paket transitif (paket resmi: `npmjs.com/package/server-only`).
- Pemeriksaan import kini meliputi impor default/bernama, target re-ekspor, impor dinamis, impor tanpa binding, modul dari test dan skrip, serta dependensi eksternal yang wajib ada di `package.json`.
- Pemeriksaan namespace PHP kini juga memeriksa migration dan melaporkan controller rute yang tidak ditemukan, bukan hanya method yang hilang.
- Test alur indikator menegaskan bahwa revisi katalog berubah saat indikator publik diterbitkan, ditarik ke draf, atau diarsipkan; mengedit draf atau mengarsipkan indikator yang tidak pernah publik tidak boleh mengubah revisi publik.
- Utilitas proyeksi JavaScript yang hanya dipakai oleh test dihapus. Batas ukuran pratinjau kini diterapkan oleh service PHP yang benar-benar dipakai worker, dengan batas satu baris, total proyeksi, ukuran batch, dan jumlah baris per batch. Bila terlalu besar, pratinjau dimatikan tetapi berkas CSV tetap bisa diunduh.
- Dokumentasi digabung dari enam file menjadi tiga: `README.md`, `DOKUMENTASI.md`, dan `PENGUJIAN.md`.

## Celah cakupan yang masih penting

- Belum ada test integrasi penuh untuk konversi file dari unggah sampai hasil tersimpan, retry/lease worker, serta verifikasi bahwa berkas sumber tetap privat setelah publikasi.
- E2E browser saat ini berfokus pada halaman publik dan navigasi ke login; belum mencakup alur admin lengkap dari membuat draf hingga terbit, termasuk penolakan akses lintas organisasi.
- Impor data legacy dan pemulihan dari backup perlu uji migrasi terpisah menggunakan salinan database sumber. Pemeriksaan statis tidak membuktikan data lama bebas orphan atau duplikasi.
- Pengujian domain, HTTPS, cache setelah logout, dan konfigurasi Cloudflare tetap memerlukan staging; tidak dapat disimpulkan dari build lokal.

## Aturan pemeliharaan test

1. Jangan menghapus assertion atau menonaktifkan test hanya untuk membuat CI hijau.
2. Perbaiki penyebab kegagalan; tambahkan regresi untuk bug yang ditemukan, terutama izin, batas organisasi, perubahan status, cache/revisi katalog, dan kontrak data.
3. Periksa duplikasi bila dua test memverifikasi perilaku identik, tetapi pertahankan cakupan berbeda.
4. Perbarui OpenAPI dan test kontrak saat mengubah endpoint atau bentuk respons.
5. Catat hasil aktual. Sintaks lulus tidak sama dengan test, build, migrasi, atau deployment lulus.

## Status audit terakhir

Pada audit UX workflow admin terbaru, `npm run check`, pemeriksaan sintaks 86 berkas JavaScript/MJS/CJS yang dapat diparse langsung Node, `php -l` untuk 80 berkas PHP, kesetaraan OpenAPI YAML/JSON (68 path dan 261 referensi tanpa unresolved refs), dan pemeriksaan referensi lokal lulus. Empat kelompok assertion source-level yang dijalankan lewat harness lokal sederhana juga lulus (29 assertion), tetapi ini **bukan pengganti Vitest resmi**.

`npm ci --ignore-scripts --no-audit --no-fund` mengalami timeout; `node_modules` hasil percobaan tidak lengkap dan tidak dibundel. Karena itu `npm run test`, ESLint, build Next.js, PHPUnit, migration runtime, dan Playwright E2E belum dijalankan ulang setelah perubahan UX ini. Jalankan seluruh perintah CI di atas dengan dependensi lengkap untuk verifikasi runtime. Jangan menyimpulkan rilis bebas regresi hanya dari pemeriksaan statis.

## CI GitHub Actions

Seluruh pemeriksaan berjalan pada satu workflow, `.github/workflows/ci.yml`, dengan tiga job: frontend, backend Laravel + MariaDB, dan build image Docker. Job image hanya berjalan setelah frontend dan backend lulus. Workflow backend terpisah dihapus agar migration dan PHPUnit tidak dijalankan dua kali pada commit yang sama.

Pemeriksaan inti: `npm run check`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`, `php artisan migrate --force`, `php artisan test`, serta build kedua image produksi. Versi Node.js berasal dari `.nvmrc` (22.16.0) dan npm harus 10.9.2.

## Prasyarat runtime Laravel di CI dan Docker

Sebelum Composer menjalankan penemuan paket atau Artisan menjalankan migration, pastikan direktori berikut tersedia dan dapat ditulis: `bootstrap/cache`, `storage/framework/cache/data`, `storage/framework/sessions`, `storage/framework/views`, dan `storage/logs`. Direktori cache dipertahankan di Git melalui `backend/bootstrap/cache/.gitignore`; job CI juga membuat dan memberi izin tulis pada direktori runtime sebelum `composer install`. Dockerfile membuat direktori sebelum `composer dump-autoload`, sehingga package discovery tidak dijalankan dengan direktori yang hilang.

## Perbaikan regresi dari log CI terbaru

- `backend/bootstrap/cache/.gitignore` menjaga direktori cache tetap ada di checkout. Job CI membuat direktori runtime Laravel dan memberi izin tulis sebelum Composer/Artisan berjalan; Dockerfile juga membuatnya sebelum `composer dump-autoload`.
- Test UI menormalkan spasi sumber JSX sebelum membandingkan teks, sehingga pemenggalan baris pada kode tidak dianggap sebagai perubahan tampilan. Label katalog diuji sesuai teks yang benar-benar dipakai UI.
- Metadata SDI lanjutan tetap tertutup secara default; jumlah metadata yang tersimpan tetap terlihat. Test tidak lagi mengharapkan atribut `open` otomatis yang berlawanan dengan perilaku ini.
- Riwayat audit membatasi catatan pengguna lokal ke organisasi yang dapat diakses dan mengirim `request_id` agar kolom permintaan tidak kosong.
- Login hanya mengarahkan sesi yang telah terverifikasi; stylesheet keselamatan teks formulir dimuat sesudah seluruh stylesheet halaman.
- Nama indeks gabungan pada `dataset_validation_runs` kini ditetapkan eksplisit sebagai `validation_run_ds_ver_created_idx` (di bawah batas 64 karakter MySQL/MariaDB). Test regresi memeriksa agar nama default yang terlalu panjang tidak kembali.
- Berkas contoh `.env.example` di root dan `backend/.env.example` dipulihkan. Keduanya diperlukan oleh pemeriksaan konfigurasi Docker Compose, CI, serta `scripts/setup-env.sh`; `.env` hasil setup tetap harus berisi rahasia unik dan tidak boleh dikomit.
- Test keamanan teks formulir menormalkan spasi selector CSS sebelum memeriksa `.login-form .field`, karena pemisahan selector ke beberapa baris adalah format CSS yang valid dan tidak mengubah perilaku.

Validasi statis terbaru: `npm run check`, pemeriksaan sintaks seluruh test/helper JavaScript, lint sintaks PHP, parsing OpenAPI JSON, serta parsing YAML CI dan Docker Compose telah lulus. Test Vitest, ESLint, build Next.js, PHPUnit, dan migration runtime belum dapat dijalankan di lingkungan audit ini karena paket npm/Composer tidak tersedia lengkap dan akses npm registry mengalami kegagalan DNS (`EAI_AGAIN`). Jalankan pipeline CI untuk verifikasi runtime final.

### Regresi UX admin: pengguna, kategori, dan kesiapan SDI

- `tests/unit/admin-workflow-guidance.test.js`: alur undangan vs akun terdaftar, input email (bukan UUID teknis), organisasi otomatis jika hanya ada satu, dan peringatan ketika berpindah formulir yang sudah diubah.
- `tests/unit/dataset-category-management.test.js`: saran kategori yang bisa dikonfigurasi, filter kategori dari data backend tanpa request tambahan di browser, batas 120 karakter, serta wiring variable kategori pada Compose/Dockerfile. Opsi di form adalah saran, bukan tabel taksonomi terpisah; kategori baru masih boleh dibuat dengan mengetik nama.
- `tests/unit/form-vertical-text-safety.test.js`: select konektor SDI harus memiliki `height: auto`, `min-height: 44px`, dan `line-height` aman.
- `tests/unit/loading-static-shell-parity.test.js`: kategori dataset tampil pada loading shell agar struktur tidak berubah setelah halaman selesai dimuat.
- `backend/tests/Feature/PortalMembershipByEmailTest.php`: API menerima email akun aktif secara case-insensitive dan tetap kompatibel dengan klien lama yang mengirim UUID.

Jalankan `npm run test`, `npm run test:e2e`, dan `cd backend && php artisan test` pada lingkungan lengkap. Pemeriksaan sintaks/statis tidak menggantikan tes runtime ini.

## Catatan branding dan resource model

- Nilai `NEXT_PUBLIC_*` ditanam saat build Next.js; mengubah `.env` tanpa rebuild tidak memperbarui title/ikon/hero pada bundle yang sedang berjalan.
- `.env` real dan `backend/.env` tidak dibundel dalam ZIP source. Gunakan `.env.example` generik sebagai referensi, tetapi jangan menimpa secret dan konfigurasi deployment tanpa backup.
- Kontrak dataset saat ini memiliki satu `source_resource_id` utama per versi. Tests mengawasi pemisahan berkas sumber dan distribusi, tetapi tidak mengklaim dukungan resource manager CKAN penuh (banyak file/URL eksternal bebas) sebelum skema dan API tersebut benar-benar dibangun.
- `php artisan test` belum dijalankan dalam lingkungan audit ini karena `backend/vendor` tidak tersedia; lulus `php -l` tidak membuktikan kedua tes cookie-auth lulus runtime. Jalankan dua tes tersebut terlebih dahulu pada CI setelah Composer install.

### Regresi alur dataset, indikator, branding, dan cookie

- `tests/unit/dataset-management-architecture.test.js`: urutan metadata → sumber → distribusi → versi → pemeriksaan; akses cepat; sumber asli dan distribusi terpisah; loading shell sejalan.
- `tests/e2e/public-home.spec.js`: smoke test harus menggunakan nama aplikasi generik dan cookie kanonis `portal_session_token`, bukan mengasumsikan deployment Wajo.
- `backend/tests/Feature/FrontendCookieAuthenticationTest.php`: verifikasi sesi berulang dan mutasi profil harus berhasil dari cookie frontend; jalankan `php artisan test` setelah perubahan bootstrap middleware.
- Branding default dibaca dari `.env.example`; `.env` server yang sudah ada tidak ditimpa saat ekstraksi ZIP. Setelah perubahan `NEXT_PUBLIC_*`, rebuild image frontend.

### Pencarian katalog berbasis intent

- `tests/unit/public-dataset-intent-search.test.js`: kontrak pencarian public catalog, cakupan metadata, ranking, dan contoh intent yang terlihat pada UI.
- `backend/tests/Unit/PublicDatasetSearchTest.php`: ekspansi sinonim topik (pendidikan, kesehatan, penduduk, ekonomi), pembuangan kata hubung, dan batas jumlah istilah untuk query bahasa alami.
- Query tetap melewati `publishedDatasetQuery()` sehingga pencarian tidak memperlihatkan draf, organisasi nonaktif, resource nonpublik, konversi gagal, atau versi lama. Kasus penting: `jumlah sekolah di Kabupaten Wajo` harus mempertahankan kata `jumlah`, `sekolah`, dan `wajo` sebagai istilah asli sebelum ekspansi; `pendidikan kesehatan` harus menyertakan alias dari kedua topik; typo seperti `sekolh` harus membentuk pola terbatas yang bisa mencocokkan `sekolah`. Runner Vitest dan PHPUnit perlu dijalankan pada lingkungan yang sudah memasang dependency proyek; tidak ada hasil runtime test yang boleh disimpulkan hanya dari lint/static checks.

## Regresi UX statistik dan tindakan dataset — 28 Oktober 2026

Perubahan alur admin baru menambahkan/menegaskan pemeriksaan berikut:

- `dataset-management-architecture.test.js`: aksi detail dataset mengikuti workflow backend; pengajuan pemeriksaan baru aktif jika metadata wajib lengkap, sumber versi yang sedang diproses siap, dan validasi untuk checksum sumber tersebut berstatus `passed`; pengarsipan tidak ditawarkan saat pemeriksaan; pengembalian untuk perbaikan dan pembuatan versi baru ditampilkan pada status yang sesuai.
- `dataset-management-architecture.test.js`: halaman statistik membedakan definisi indikator dari observasi berkala, menampilkan antrean draf/pemeriksaan/terbit, memberi tautan untuk nilai/tren, dan mencegah tautan edit menjadi jalan buntu saat indikator masih diperiksa atau diarsipkan.
- `PortalIndicatorWorkflowTest.php`: publikasi observasi ditolak sebelum definisi indikator terbit; indikator yang telah diarsipkan juga bersifat baca-saja untuk penambahan observasi baru.
- `PortalIndicatorController`: pemeriksaan status dilakukan lagi di dalam transaksi saat observasi disimpan, sehingga pengarsipan yang terjadi bersamaan tidak dapat dilewati dari form atau permintaan API.

Hasil validasi yang benar-benar dijalankan setelah perubahan ini:

- `npm run check` — lulus; cek proyek/kontrak, 235 modul JS/JSX, serta namespace dan referensi method route PHP.
- Pemeriksaan parser TypeScript terhadap sumber JS/JSX — 225/225 berkas lulus.
- `php -l` — 75 berkas PHP lulus pemeriksaan sintaks.
- `node --check tests/unit/dataset-management-architecture.test.js` — lulus.
- `node --check tests/e2e/public-home.spec.js` — lulus.
- 11 pemeriksaan manual source-level atas prasyarat tombol, status indikator, dan guard backend — lulus; ini bukan pengganti test runner resmi.

Batasan penting: `npm run test -- --run` belum dapat dijalankan karena executable `vitest` tidak terpasang (`vitest: not found`). `php artisan test` belum dapat dijalankan karena `backend/vendor/autoload.php` tidak tersedia. Percobaan `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` timeout dan tidak menghasilkan instalasi dependency yang dapat dipakai. Karena itu, hasil di atas adalah validasi statis/sintaks, **bukan** klaim bahwa suite Vitest, PHPUnit, Next build, atau Playwright lulus. Jalankan suite penuh pada lingkungan dengan dependency lengkap sebelum deploy.

### Audit kontrak kelola observasi dan konsistensi visual aksi — 28 Oktober 2026

- `tests/unit/indicator-observation-api-contract.test.js`: memeriksa impor tenant config yang digunakan form observasi; path halaman dan rute GET/POST/PATCH; envelope respons; pemisahan izin `indicators.review` dan `indicators.publish`; serta ukuran/focus/wrapping tombol aksi.
- `tests/unit/dataset-management-architecture.test.js`: ekspektasi teks deskripsi state review diselaraskan dengan copy UI terbaru (“Definisi sedang diperiksa. Anda dapat menyiapkan nilai sebagai draf”). Ini memperbaiki ekspektasi regresi lama, bukan mengubah aturan workflow.
- Validasi saat ini: `npm run check` lulus (236 modul JS/JSX dan 69 namespace/reference PHP); parser TypeScript memeriksa 231 file JS/JSX/MJS/CJS tanpa syntax diagnostics; `php -l` lulus untuk 60 file; harness assertion source-level menjalankan 16 kasus regresi terkait dataset/statistik/kontrak dan semuanya lulus.
- Batasan runtime tetap berlaku: `npm run test` berhenti karena `vitest: not found`; `cd backend && php artisan test` berhenti karena `backend/vendor/autoload.php` tidak ada. Hasil harness source-level bukan pengganti Vitest/PHPUnit, dan build Next.js/Playwright belum dijalankan di lingkungan ini.

## Pencarian dataset publik

Pencarian publik menggunakan OR matching atas token query bermakna, ekspansi sinonim/topik Bahasa Indonesia, dan pemeringkatan berbobot yang mengutamakan istilah asli pengguna serta judul/kategori/kata kunci dibanding metadata penjelas. Kata yang salah ketik dapat memperoleh fallback satu-edit terbatas pada maksimal tiga token panjang dan field dengan sinyal tinggi. Ini adalah fallback SQL, bukan jaminan fuzzy matching penuh seperti mesin pencari khusus. Uji query multi-topik, lokasi Wajo, kata umum, prefiks, typo, dan hasil kosong sebelum rilis.

## Regresi laman observasi indikator (2026-10-29)

- Halaman memuat definisi indikator terlebih dahulu dan daftar observasi secara terpisah. Kegagalan endpoint observasi tidak lagi menjatuhkan seluruh halaman melalui `Promise.all`.
- Kegagalan pemuatan daftar observasi menampilkan status HTTP, kode error aman, dan request ID jika tersedia; form simpan/publikasi dinonaktifkan sementara agar tidak mendorong pembuatan nilai ganda ketika riwayat belum bisa dibaca.
- Ditambahkan test kontrak frontend untuk keadaan pemuatan gagal dan test fitur Laravel agar anggota organisasi yang berwenang bisa membaca daftar observasi dalam envelope `data`, serta anggota organisasi lain ditolak.
- Validasi sintaks/kontrak source lulus. Vitest/PHPUnit masih harus dijalankan di lingkungan dependency lengkap; executable `vitest` dan `backend/vendor/autoload.php` tidak tersedia pada lingkungan pembuatan paket.
