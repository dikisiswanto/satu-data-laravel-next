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

- **Vitest:** 24 berkas / 132 kasus terkait validasi, kontrak API, cache, form, dashboard, aksesibilitas, dan UI publik.
- **Playwright:** 1 berkas / 9 skenario navigasi, pencarian, login portal, filter, statistik, pratinjau, dan viewport mobile.
- **PHPUnit:** 8 berkas suite / 30 kasus untuk izin, katalog role, workflow indikator, draf progresif, API publik, batas kata sandi, anggaran pratinjau konversi, dan konfigurasi proxy tepercaya (di luar kelas dasar `TestCase`).
- **Pemeriksaan statis:** kontrak Next.js/Laravel dan OpenAPI, import relatif/alias, namespace serta method rute PHP.

Sebagian test frontend memeriksa struktur source untuk mencegah regresi tampilan. Test seperti ini berguna untuk aturan UI yang eksplisit, tetapi tidak membuktikan perilaku runtime. Aturan bisnis kritis harus diuji pada service/API atau melalui test integrasi; jangan hanya mengandalkan pola teks di source.

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

Di lingkungan audit, `npm run check`, `node --check` untuk skrip/test JS, `php -l` untuk seluruh file PHP, smoke test langsung service anggaran pratinjau, sinkronisasi `package.json`/lockfile, kesetaraan OpenAPI JSON/YAML, dan parsing YAML CI/Compose lulus. **Vitest, ESLint, dan build Next.js belum berjalan** karena executable `vitest`/`eslint`/`next` tidak tersedia; pemasangan dependensi `npm ci` mengalami timeout. Composer/vendor tidak tersedia, sehingga PHPUnit dan migration MariaDB belum dijalankan lokal; job `backend-tests` sekarang menjalankannya di CI dengan MariaDB 11.4. Perintah Playwright lokal memanggil CLI global yang tidak memiliki perintah `test`, sehingga tidak ada skenario E2E yang berjalan. Playwright lokal juga belum tersedia dari instalasi proyek; jalankan kembali setelah `npm ci` bersih atau melalui CI. Jangan menyebut rilis bebas bug sampai semua langkah tersebut lulus.


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

Validasi statis terbaru: `npm run check`, pemeriksaan sintaks seluruh test/helper JavaScript, lint sintaks PHP, parsing OpenAPI JSON, serta parsing YAML CI dan Docker Compose telah lulus. Test Vitest, ESLint, build Next.js, PHPUnit, dan migration runtime belum dapat dijalankan di lingkungan audit ini karena paket npm/Composer tidak tersedia lengkap dan akses npm registry mengalami kegagalan DNS (`EAI_AGAIN`). Jalankan pipeline CI untuk verifikasi runtime final.
