# Dokumentasi teknis

## Arsitektur

- **Next.js** menyajikan portal publik dan dashboard admin. UI tidak menjadi sumber kebenaran izin atau status data.
- **Laravel API + Sanctum** mengelola login, role/permission, membership organisasi, data, audit, workflow, dan publikasi.
- **MariaDB** menyimpan data relasional. Foreign key, batas unik, transaksi, dan row lock melindungi integritas saat perubahan bersamaan.
- **Laravel queue** memproses konversi file di luar request. File sumber disimpan privat; hanya resource yang lolos pemeriksaan dan dipublikasikan yang dapat diakses publik.
- **Docker Compose** menjalankan frontend, API, worker, database, dan edge proxy. Cloudflare Tunnel opsional.

## Alur data

1. Admin membuat draf dengan judul dan organisasi pengampu.
2. Detail, sumber, cakupan, lisensi, periode, dan metadata SDI dilengkapi ketika tersedia.
3. File diunggah ke penyimpanan privat, lalu worker memeriksa checksum, format, batas ukuran/kompleksitas, dan menyiapkan resource.
4. Saat diajukan untuk ditinjau, backend memeriksa metadata serta resource pada versi yang sedang diajukan.
5. Hanya versi yang disetujui dan dipublikasikan yang tersedia untuk API/portal publik. Perubahan versi tidak boleh membuat resource lama atau berkas sumber ikut terbuka.

Kelengkapan metadata untuk draf **tidak sama** dengan persyaratan pemeriksaan, publikasi, atau interoperabilitas. Sistem tidak boleh memaksa admin mengarang kode resmi. Status kesiapan lokal juga bukan pengesahan dari Pembina Data atau Walidata.

## Kontrak API dan frontend

- Kontrak utama tersedia di `backend/openapi/openapi.json` dan `backend/openapi/openapi.yaml` (OpenAPI 3.1).
- Endpoint versi `/api/v1` merupakan kontrak kanonis. Alias lama dipertahankan hanya untuk kompatibilitas dan ditandai deprecated.
- Laravel adalah sumber kebenaran untuk izin, paginasi, status workflow, dan data publik. Next.js boleh menyajikan cache, tetapi cache privat harus dibersihkan saat logout atau pergantian akun.
- Perubahan respons/field harus memperbarui OpenAPI, implementasi Laravel, dan test kontrak frontend dalam perubahan yang sama.

## Keamanan dan operasi

- Seluruh operasi tulis wajib memeriksa autentikasi, izin, cakupan organisasi, validasi payload, dan origin sumber.
- UI yang menyembunyikan tombol bukan kontrol keamanan; backend selalu memutuskan izin.
- Token, kata sandi, dan kunci API hanya berada pada environment/secret manager. Jangan mencatatnya di log atau repositori.
- Backup database dan object storage harus diuji pemulihannya. Uji impor legacy pada staging dan cocokkan jumlah baris, foreign key, metadata, serta file sebelum cutover.
- Setelah perubahan domain, samakan konfigurasi origin dan bangun ulang image Next.js. Periksa health endpoint API dan frontend, lalu uji HTTPS eksternal.

## Acuan SDI

Pemetaan teknis mengikuti prinsip Satu Data Indonesia: standar data, metadata, interoperabilitas, serta kode referensi dan data induk; lihat Perpres 39/2019 dan Permenkominfo 1/2023. Kesesuaian perangkat lunak tidak otomatis menyatakan suatu dataset telah memenuhi standar sektoral atau mendapat pengesahan kelembagaan.
