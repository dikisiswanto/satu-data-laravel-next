# Satu Data Wajo v2

Portal data Kabupaten Wajo. **Laravel** menjadi sumber kebenaran untuk data, autentikasi, izin, dan alur publikasi; **Next.js** menangani UI admin dan portal publik. MariaDB menyimpan data, antrean Laravel memproses konversi, dan Docker Compose menjalankan layanan.

## Menyiapkan dan menjalankan

Butuh Node.js 22 atau 24, npm 10.9.2, PHP sesuai `backend/composer.json`, Composer, dan Docker Compose.

```bash
bash scripts/setup-env.sh https://data.domain-anda.go.id
docker compose config --quiet
bash scripts/deploy-vps.sh
```

Skrip setup tidak menimpa konfigurasi yang sudah ada. Periksa kedua berkas `.env` sebelum deploy: `NEXT_PUBLIC_SITE_URL` harus sama dengan `FRONTEND_URL`; `APP_URL` dan `API_PUBLIC_URL` harus memakai origin kanonis. Frontend menyematkan `NEXT_PUBLIC_SITE_URL` saat build, jadi perubahan domain perlu rebuild.

Untuk HTTPS, arahkan domain ke reverse proxy atau Cloudflare Tunnel. Jangan publikasikan port database, PHP-FPM, atau layanan internal. Isi token tunnel hanya di `.env`. Sesudah deploy, uji hostname HTTPS dan alur login dari luar VPS.

**Penting:** instalasi v6 baru memakai volume database kosong; jangan anggap migrasi ini sebagai upgrade langsung dari v5. Impor data lama harus diuji lebih dahulu pada salinan staging.

## Administrator pertama

```bash
docker compose exec api php artisan app:create-admin admin@example.go.id --name="Administrator Satu Data"
```

Gunakan email sebenarnya, batasi akses shell, dan jangan commit rahasia. Untuk membuang database lokal beserta unggahan, `docker compose down -v` menghapus volume secara permanen—jangan jalankan pada produksi.

## Pemeriksaan sebelum rilis

GitHub Actions menjalankan frontend, E2E, build Docker, serta job backend pada MariaDB 11.4. Image hanya dibuat setelah pemeriksaan frontend dan backend lulus.

```bash
npm ci
npm run check
npm run lint
npm run test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e

cd backend
composer install --no-interaction --prefer-dist
php artisan test
```

Pengujian migration dan alur data wajib dijalankan pada MariaDB yang sama versinya dengan deployment. Pemeriksaan statis atau tes SQLite tidak menggantikan tes integrasi MariaDB. Baca `DOKUMENTASI.md` untuk gambaran sistem dan `PENGUJIAN.md` untuk cakupan serta status verifikasi.
