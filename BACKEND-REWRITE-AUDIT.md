# Catatan Audit dan Rilis Backend

## Sasaran refactor

Refactor memisahkan tanggung jawab backend Laravel dari tampilan Next.js. Backend menjadi sumber kebenaran data dan kebijakan akses; UI publik dipertahankan sejauh mungkin agar perubahan arsitektur tidak memaksa desain ulang halaman publik.

## Area yang harus dijaga

- Autentikasi Sanctum, masa berlaku token, status akun aktif, dan perlindungan same-origin untuk operasi mutasi.
- Permission berbasis operasi dan organisasi, bukan hanya penyembunyian menu di frontend.
- Constraint relasional dan urutan impor data legacy yang mengikuti dependensi foreign key.
- Validasi versi kandidat saat pengajuan dan publikasi dataset.
- Pemisahan file sumber privat dari distribusi publik.
- Keluaran konversi yang dibatasi ukuran/kompleksitasnya serta kegagalan penulisan storage yang ditangani.
- Kontrak OpenAPI yang sinkron dengan implementasi Laravel dan adapter Next.js.

## Perintah pemeriksaan

Dari root proyek:

```bash
npm ci
npm run check
npm run lint
npm run test
npm run build
npm run test:e2e
```

Backend:

```bash
cd backend
composer install --no-interaction --prefer-dist
php artisan test
```

Tes migrasi dan workflow harus dijalankan terhadap MariaDB versi yang sama dengan Compose. SQLite dapat membantu tes unit, tetapi tidak menggantikan verifikasi foreign key komposit, collation, JSON, serta perilaku query MariaDB.

## Gerbang rilis

Jangan menyatakan rilis aman hanya berdasarkan pemeriksaan sintaks. Semua gerbang berikut perlu lulus di CI/staging:

- pemeriksaan struktur, import, namespace, dan kontrak API;
- tes unit frontend dan feature test Laravel;
- migrasi database kosong dan pemeriksaan impor data staging;
- build produksi Next.js dan kedua image Docker;
- smoke test login, izin peran, pembuatan draf, unggah, konversi, pemeriksaan, publikasi, dan akses publik;
- pemeriksaan domain HTTPS, cookie sesi, health endpoint, serta persistence database/object storage.

## Batas klaim

Status lulus dari skrip statis hanya membuktikan aturan yang diperiksa skrip tersebut. Status itu bukan bukti bahwa seluruh aplikasi bebas bug, aman dari semua serangan, atau siap produksi tanpa pengujian runtime.
