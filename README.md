# Satu Data Wajo v6

Portal katalog data dan administrasi Satu Data Kabupaten Wajo. Rilis ini merancang ulang domain dan backend; halaman serta rute publik Next.js dipertahankan sebisa mungkin, sedangkan API Laravel menjadi satu-satunya sumber kebenaran.

## Teknologi

- Next.js dengan keluaran produksi standalone.
- Laravel API dengan autentikasi token Sanctum.
- MariaDB sebagai basis data relasional persisten.
- Laravel queue worker untuk konversi data dan pekerjaan berdurasi panjang.
- Abstraksi Laravel Storage privat (volume lokal atau penyimpanan kompatibel S3).
- Docker Compose untuk deployment layanan terisolasi.
- OpenAPI 3.1 di `backend/openapi/openapi.json` dan `backend/openapi/openapi.yaml`.

## Instalasi baru dan konfigurasi domain

Untuk instalasi baru, buat kredensial unik dan samakan origin aplikasi dengan satu domain HTTPS publik:

```bash
bash scripts/setup-env.sh https://data.domain-anda.go.id
```

Skrip membuat `.env` dan `backend/.env` hanya jika belum tersedia, membuat kredensial database dan `APP_KEY` Laravel, membatasi izin berkas, serta menampilkan langkah lanjutan. Skrip menolak menimpa konfigurasi yang sudah ada. Jika berkas environment telah tersedia, buat cadangan dan ubah nilainya dengan sengaja.

1. Arahkan DNS domain ke VPS atau siapkan hostname publik Cloudflare Tunnel.
2. Untuk Nginx/Caddy di host, akhiri TLS di reverse proxy host dan teruskan trafik ke edge yang terikat pada `127.0.0.1:8080`. Gunakan `deploy/vps-host-nginx.example.conf` sebagai contoh, ganti domain dan jalur sertifikat, lalu uji konfigurasi sebelum reload. Jangan membuka PHP-FPM atau gateway API internal langsung ke Internet.
3. Pastikan `NEXT_PUBLIC_SITE_URL` pada `.env` root sama persis dengan `FRONTEND_URL` pada `backend/.env`. Samakan juga `APP_URL` dan `API_PUBLIC_URL` dengan origin kanonis. Atur SMTP sebelum mengandalkan fitur reset kata sandi.
4. Untuk Cloudflare Tunnel, masukkan token tunnel yang sebenarnya ke `.env`, buat rute hostname menuju `http://edge:80` di Cloudflare, lalu jalankan `docker compose --profile tunnel up -d cloudflared`. Jangan pernah commit token.
5. Instalasi v6 baru harus memakai volume database kosong. Skema awal versi ini bukan upgrade langsung dari riwayat migrasi v5. Uji impor legacy pada salinan staging sebelum memindahkan data.
6. Deploy melalui skrip rilis yang memvalidasi konfigurasi, membangun kedua image, dan menunggu endpoint health Laravel serta frontend merespons:

```bash
bash scripts/deploy-vps.sh
```

Frontend menyematkan `NEXT_PUBLIC_SITE_URL` saat proses build. Jika domain kanonis berubah, ubah kedua berkas environment dan jalankan ulang skrip deploy agar image frontend dibangun kembali. Skrip memeriksa kesiapan layanan melalui edge secara lokal; setelah DNS/TLS siap, uji hostname HTTPS eksternal dan alur login.

Jika lingkungan memang boleh dihapus dan Anda sengaja ingin membuang database lokal beserta unggahan, hentikan stack lalu hapus volume:

```bash
docker compose down -v
```

**Peringatan:** `down -v` menghapus permanen volume bernama yang digunakan proyek ini. Jangan jalankan pada produksi atau lingkungan yang datanya harus dipertahankan.

## Membuat administrator pertama

Buat administrator pertama di lingkungan baru:

```bash
docker compose exec api php artisan app:create-admin admin@example.go.id --name="Administrator Satu Data"
```

Gunakan alamat email administrator yang benar dan batasi akses shell selama proses bootstrap. Jangan menyimpan kata sandi produksi, token akses, atau secret ke repositori. Rotasi kredensial setelah login pertama.

## Dokumentasi proyek

- `ARCHITECTURE.md`: batas domain, invariant database, otorisasi, cache, dan kebijakan migrasi.
- `API-CONTRACTS.md`: endpoint kanonis, paginasi, dan aturan perubahan kontrak API.
- `BACKEND-REWRITE-AUDIT.md`: area risiko dan gerbang rilis.
- `SDI-COMPLIANCE-MATRIX.md`: pemetaan dukungan teknis ke prinsip Satu Data Indonesia; bukan pengganti pengesahan kelembagaan.
- `TEST-AUDIT.md`: inventaris pengujian, perbaikan checker, dan batas verifikasi rilis.

## Menjalankan pengujian

Frontend, dari direktori root:

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

Jalankan tes migrasi dan workflow pada MariaDB dengan versi yang sama seperti Docker Compose. SQLite dapat membantu tes unit, tetapi tidak menggantikan pemeriksaan foreign key komposit, collation, perilaku JSON, dan rencana query pada MariaDB.

Lulus pemeriksaan sintaks tidak sama dengan lulus tes runtime atau bukti siap produksi. Semua perintah tes dan build harus dijalankan pada CI/staging dengan dependensi lengkap sebelum rilis.
