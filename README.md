# Portal Satu Data

Portal data publik yang dapat dikonfigurasi untuk kabupaten, kota, provinsi, atau instansi. **Laravel** menjadi sumber kebenaran untuk data, autentikasi, izin, dan alur publikasi; **Next.js** menangani UI admin dan portal publik. MariaDB menyimpan data, antrean Laravel memproses konversi, dan Docker Compose menjalankan layanan.

## Menyiapkan dan menjalankan

Butuh Node.js 22 atau 24, npm 10.9.2, PHP sesuai `backend/composer.json`, Composer, dan Docker Compose.

```bash
bash scripts/setup-env.sh https://data.domain-anda.go.id
docker compose config --quiet
bash scripts/deploy-vps.sh
```

Skrip setup tidak menimpa konfigurasi yang sudah ada. Atur `COMPOSE_PROJECT_NAME` bila perlu memisahkan beberapa deployment pada satu host. Periksa kedua berkas `.env` sebelum deploy: `NEXT_PUBLIC_SITE_URL` harus sama dengan `FRONTEND_URL`; `APP_URL` dan `API_PUBLIC_URL` harus memakai origin kanonis. Frontend menyematkan nilai `NEXT_PUBLIC_*` saat build, jadi perubahan branding atau domain perlu rebuild. Nama wilayah, nama aplikasi, nama organisasi, deskripsi, aset logo/ikon, gambar sosial, tautan GeoPortal dan kontak PPID dikonfigurasi melalui variabel `NEXT_PUBLIC_*` di `.env`. Nilai nama turunan mengikuti `NEXT_PUBLIC_REGION_NAME` jika override khusus dikosongkan. Untuk instansi selain Wajo, jangan gunakan tautan atau kontak PPID milik Wajo; isi nilai yang sesuai dan ganti aset logo/ikon bila diperlukan.

Untuk HTTPS, arahkan domain ke reverse proxy atau Cloudflare Tunnel. Jangan publikasikan port database, PHP-FPM, atau layanan internal. Isi token tunnel hanya di `.env`. Sesudah deploy, uji hostname HTTPS dan alur login dari luar VPS.

**Migrasi data:** sebelum menghubungkan data dari instalasi lama, uji proses impor pada salinan staging dan pastikan relasi, peran, serta riwayat audit tetap benar. Jangan menjalankan migrasi destruktif pada database produksi.

## Konfigurasi multi-instansi

Untuk memakai aplikasi bagi kabupaten/kota atau instansi lain, atur `NEXT_PUBLIC_REGION_NAME` pada `.env` root. Nama singkat, nama aplikasi, deskripsi, nama organisasi, logo, ikon PWA, gambar sosial, GeoPortal, dan kontak PPID dapat dioverride lewat variabel `NEXT_PUBLIC_*`; bila override turunan dikosongkan, nama akan mengikuti wilayah yang dikonfigurasi. Atur juga `PORTAL_REGION_NAME` dan `PORTAL_REGION_SHORT_NAME` di konfigurasi backend (atau samakan dengan variabel frontend), serta `PORTAL_ORGANIZATION_NAME`, bila diperlukan. Perubahan variabel `NEXT_PUBLIC_*` memerlukan rebuild frontend, sedangkan perubahan konfigurasi Laravel memerlukan rebuild cache konfigurasi/restart layanan API dan queue.

Tautan sumber awal yang khusus Wajo hanya ditampilkan pada deployment Wajo. Untuk instansi lain, tambahkan rujukan sumber yang sah untuk instansi tersebut; jangan memakai kontak PPID atau URL GeoPortal wilayah lain. `COMPOSE_PROJECT_NAME` dan `API_IMAGE_NAME` dapat digunakan untuk memisahkan beberapa deployment pada host yang sama.

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
