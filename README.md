# Portal Satu Data

Portal data publik yang dapat dikonfigurasi untuk kabupaten, kota, provinsi, atau instansi. **Laravel** menjadi sumber kebenaran untuk data, autentikasi, izin, dan alur publikasi; **Next.js** menangani UI admin dan portal publik. MariaDB menyimpan data, antrean Laravel memproses konversi, dan Docker Compose menjalankan layanan.

## Menyiapkan dan menjalankan

Butuh Node.js 22 atau 24, npm 10.9.2, PHP sesuai `backend/composer.json`, Composer, dan Docker Compose.

```bash
bash scripts/setup-env.sh https://data.domain-anda.go.id
docker compose config --quiet
bash scripts/deploy-vps.sh
```

Skrip setup tidak menimpa konfigurasi yang sudah ada. Atur `COMPOSE_PROJECT_NAME` bila perlu memisahkan beberapa deployment pada satu host. Periksa kedua berkas `.env` sebelum deploy: `NEXT_PUBLIC_SITE_URL` harus sama dengan `FRONTEND_URL`; `APP_URL` dan `API_PUBLIC_URL` harus memakai origin kanonis. Frontend menyematkan nilai `NEXT_PUBLIC_*` saat build, jadi perubahan branding atau domain perlu rebuild. Nama wilayah, nama aplikasi, nama organisasi, deskripsi, aset logo/ikon, gambar sosial, tautan GeoPortal dan kontak PPID dikonfigurasi melalui variabel `NEXT_PUBLIC_*` di `.env`. Nilai nama turunan mengikuti `NEXT_PUBLIC_REGION_NAME` jika override khusus dikosongkan. Default kode, Docker build, dan `.env.example` menggunakan profil Kabupaten Wajo, termasuk logo, hero, ikon, dan kontak PPID Wajo. Identitas tetap dapat diganti: isi `NEXT_PUBLIC_REGION_NAME` dengan wilayah lain dan pilih `NEXT_PUBLIC_BRAND_PROFILE=generic` kecuali tersedia profil aset khusus. Untuk menonaktifkan identitas PPID atau mengganti aset, set override `NEXT_PUBLIC_PPID_*`, `NEXT_PUBLIC_LOGO_PATH`, `NEXT_PUBLIC_HERO_IMAGE`, dan variabel ikon secara eksplisit. File `.env` yang sudah ada tidak ditimpa oleh paket source; perubahan branding perlu diterapkan di `.env` root dan `backend/.env`, lalu rebuild frontend karena `NEXT_PUBLIC_*` tertanam saat build.

Untuk HTTPS, arahkan domain ke reverse proxy atau Cloudflare Tunnel. Jangan publikasikan port database, PHP-FPM, atau layanan internal. Isi token tunnel hanya di `.env`. Sesudah deploy, uji hostname HTTPS dan alur login dari luar VPS.

**Migrasi data:** sebelum menghubungkan data dari instalasi lama, uji proses impor pada salinan staging dan pastikan relasi, peran, serta riwayat audit tetap benar. Jangan menjalankan migrasi destruktif pada database produksi.

## Konfigurasi multi-instansi

Untuk memakai aplikasi bagi kabupaten/kota atau instansi lain, isi `NEXT_PUBLIC_REGION_NAME` pada `.env` root dan pilih `NEXT_PUBLIC_BRAND_PROFILE=generic` atau profil aset yang memang tersedia. Bila tidak ada konfigurasi tenant, judul default adalah “Portal Satu Data Kabupaten Wajo”. Nama singkat, nama aplikasi, deskripsi, nama organisasi, logo, ikon PWA, gambar sosial, GeoPortal, dan kontak PPID dapat dioverride lewat variabel `NEXT_PUBLIC_*`; bila override turunan dikosongkan, nama akan mengikuti wilayah yang dikonfigurasi. Nilai branding tidak ditentukan dari nama folder/repo atau `COMPOSE_PROJECT_NAME`.
Atur juga `PORTAL_REGION_NAME` dan `PORTAL_REGION_SHORT_NAME` di konfigurasi backend (atau samakan dengan variabel frontend), serta `PORTAL_ORGANIZATION_NAME`, bila diperlukan. Perubahan variabel `NEXT_PUBLIC_*` memerlukan rebuild frontend, sedangkan perubahan konfigurasi Laravel memerlukan rebuild cache konfigurasi/restart layanan API dan queue.

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

### Jika nama aplikasi kembali menjadi Kabupaten Wajo

Paket source menggunakan Kabupaten Wajo sebagai profil bawaan. File `.env` yang sudah ada di server tidak ditimpa ketika ZIP diekstrak; periksa `.env` root dan `backend/.env` jika ingin mengganti wilayah. Untuk tenant lain, set `NEXT_PUBLIC_REGION_NAME`, `NEXT_PUBLIC_REGION_SHORT_NAME`, nama aplikasi/organisasi, `NEXT_PUBLIC_BRAND_PROFILE=generic`, serta override logo, hero, ikon, dan kontak PPID yang sesuai. Setelah mengubah `NEXT_PUBLIC_*`, rebuild frontend (`docker compose build --no-cache frontend && docker compose up -d --force-recreate frontend`).

### Pencarian katalog yang fleksibel

Pencarian publik menerima multi-kata dengan logika OR: satu istilah bermakna yang cocok dapat membawa dataset ke hasil, bukan mensyaratkan semua kata hadir. Kata-kata asli query tetap menjadi prioritas, lalu sinonim/topik Bahasa Indonesia ditambahkan secara round-robin supaya query multi-topik seperti `sekolah kesehatan anggaran` tetap mewakili ketiganya. Relevansi mengutamakan istilah asli dan field penting (judul, kategori, kata kunci), tetapi juga menelusuri deskripsi, sumber, organisasi, cakupan wilayah, metodologi, dan metadata SDI. Ada fallback typo satu-edit terbatas untuk sebagian token panjang; hasil typo tetap berada di bawah kecocokan langsung.

Backend saat ini masih memakai pencarian SQL pada database aplikasi, bukan instance Supabase atau Elasticsearch. Pendekatan Supabase/PostgreSQL seperti `websearch_to_tsquery`, `ts_rank`, dan indeks GIN menjadi referensi konseptual, tetapi tidak dapat dipakai langsung karena koneksi database proyek adalah MariaDB/MySQL. Untuk katalog sangat besar, pertimbangkan Meilisearch sebagai search index terpisah dengan typo tolerance, prefix search, synonyms, dan ranking rules; Laravel tetap harus menjadi otoritas izin dan status publikasi. Lihat [Supabase Full Text Search](https://supabase.com/docs/guides/database/full-text-search) dan [Meilisearch typo tolerance](https://github.com/meilisearch/documentation/blob/main/resources/internals/typo_tolerance.mdx).
