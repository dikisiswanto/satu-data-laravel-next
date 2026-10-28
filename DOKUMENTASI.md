# Dokumentasi teknis

## Arsitektur

- **Next.js** menyajikan portal publik dan dashboard admin. UI tidak menjadi sumber kebenaran izin atau status data.
- **Laravel API + Sanctum** mengelola login, role/permission, membership organisasi, data, audit, workflow, dan publikasi.
- **MariaDB** menyimpan data relasional. Foreign key, batas unik, transaksi, dan row lock melindungi integritas saat perubahan bersamaan.
- **Laravel queue** memproses konversi file di luar request. File sumber disimpan privat; hanya resource yang lolos pemeriksaan dan dipublikasikan yang dapat diakses publik.
- **Docker Compose** menjalankan frontend, API, worker, database, dan edge proxy. Cloudflare Tunnel opsional.

## Alur data

1. Admin membuat draf dengan judul dan organisasi pengampu, lalu menyimpan metadata deskriptif bertahap.
2. Halaman detail menempatkan metadata dataset di depan, lalu memisahkan berkas sumber/unggahan, distribusi hasil olahan, riwayat versi, dan panel kelengkapan/publikasi. Loading shell mengikuti urutan yang sama.
3. File CSV, XLSX, JSON, atau GeoJSON (maksimal 25 MiB per unggahan UI) diunggah ke penyimpanan privat. UI menjelaskan status menunggu, validasi, gagal, dan berhasil, lalu menyediakan unggah ulang bila diperlukan. Batas serta validasi server tetap menjadi otoritas akhir.
4. Metadata deskriptif (judul, organisasi pengampu, kategori, kata kunci, penerbit/sumber, URL sumber, cakupan, lisensi, frekuensi dan periode) dibedakan dari metadata standar/kepatuhan SDI. Form menandai persyaratan yang wajib sebelum pemeriksaan; admin tidak perlu mengarang kode atau klasifikasi resmi yang belum punya rujukan.
5. Saat diajukan untuk ditinjau, backend memeriksa metadata serta resource pada versi yang sedang diajukan.
6. Hanya versi yang disetujui dan dipublikasikan yang tersedia untuk API/portal publik. Perubahan versi tidak boleh membuat resource lama atau berkas sumber ikut terbuka.

Kelengkapan metadata untuk draf **tidak sama** dengan persyaratan pemeriksaan, publikasi, atau interoperabilitas. Sistem tidak boleh memaksa admin mengarang kode resmi. Status kesiapan lokal juga bukan pengesahan dari Pembina Data atau Walidata.

## Prinsip workflow UX admin

- **Selesaikan tugas utama dulu:** form draf menampilkan identitas inti terlebih dahulu; metadata kepatuhan lanjutan dikelompokkan dan dapat diselesaikan setelah draf tersimpan.
- **Tampilkan prasyarat pada tahap yang tepat:** sistem menjelaskan apa yang diperlukan sekarang dan apa yang wajib sebelum pengajuan/publikasi. Backend tetap memvalidasi transisi workflow; penyederhanaan UI tidak menghilangkan aturan bisnis.
- **Satu keputusan per panel:** indikator dikelompokkan menjadi identitas, definisi/pengampu, dan periode/nilai awal; organisasi memisahkan identitas wajib dari kontak opsional; pengelolaan pengguna menawarkan satu mode aktif untuk mengundang akun baru atau menambahkan akses akun yang sudah ada.
- **Loading shell sejalan dengan halaman:** label, urutan, dan contoh tetap konsisten selama pemuatan agar elemen tidak berubah makna ketika data selesai dimuat. Test source menjaga konsistensi ini, tetapi alur kritis tetap membutuhkan test browser dan API.

## Dataset: acuan SDI dan pola CKAN

Prinsip desain metadata mengikuti Perpres 39/2019: standar data, metadata, interoperabilitas, dan kode referensi/data induk. Standar statistik tidak cukup berupa judul dan kategori; konsep, definisi, klasifikasi, ukuran, dan satuan harus terdokumentasi ketika relevan. Ini merupakan panduan kesiapan aplikasi, bukan klaim bahwa dataset otomatis disahkan oleh Pembina Data/Walidata.

UI detail mengikuti pemisahan konsep CKAN antara **dataset metadata** dan **resources**: metadata berada di bagian awal; unggahan sumber tidak dicampur dengan metadata penerbit/URL rujukan; file hasil konversi ditampilkan sebagai distribusi; riwayat versi serta kesiapan review/publikasi tetap terlihat terpisah. Kategori bawaan merupakan controlled suggestions dan filter memakai kategori yang benar-benar ada pada dataset yang dapat diakses. `NEXT_PUBLIC_DATASET_CATEGORIES` dapat mengganti saran untuk tenant tertentu.

Batas arsitektur yang perlu diketahui: model saat ini mengaitkan satu berkas sumber utama ke setiap versi melalui `dataset_versions.source_resource_id`; distribusi bisa banyak dan file sumber disimpan terpisah, tetapi UI belum menjadi resource manager CKAN penuh untuk banyak sumber/tautan eksternal bebas pada satu dataset. Untuk kebutuhan itu, perlu perluasan skema resource (jenis resource, URL eksternal, nama/deskripsi, lisensi/visibility per resource) dan endpoint CRUD beserta tes integritas/storage. Jangan menyamakan dukungan distribusi hasil konversi dengan dukungan penuh resource multi-sumber CKAN.

Acuan: [Perpres Nomor 39 Tahun 2019 tentang Satu Data Indonesia](https://peraturan.bpk.go.id/Details/108813/perpres-no-39-tahun-2019) dan [CKAN User Guide — datasets and resources](https://docs.ckan.org/en/2.11/user-guide.html).

## Kontrak API dan frontend

- Kontrak utama tersedia di `backend/openapi/openapi.json` dan `backend/openapi/openapi.yaml` (OpenAPI 3.1).
- Endpoint versi `/api/v1` merupakan kontrak kanonis. Alias lama dipertahankan hanya untuk kompatibilitas dan ditandai deprecated.
- Laravel adalah sumber kebenaran untuk izin, paginasi, status workflow, dan data publik. Next.js boleh menyajikan cache, tetapi cache privat harus dibersihkan saat logout atau pergantian akun.
- Perubahan respons/field harus memperbarui OpenAPI, implementasi Laravel, dan test kontrak frontend dalam perubahan yang sama.

## Identitas tenant dan autentikasi cookie

Default branding source adalah `Portal Satu Data` dan `NEXT_PUBLIC_BRAND_PROFILE=generic`; aset/kontak Wajo hanya aktif dengan profil `wajo` dan wilayah yang cocok. `.env` asli sengaja tidak dibundel atau ditimpa ketika source diekstrak, jadi branding lama di `.env` harus diubah secara eksplisit. Setelah mengubah `NEXT_PUBLIC_*`, rebuild frontend.

Token sesi frontend diteruskan menjadi Bearer hanya untuk endpoint sesi/portal. `AttachFrontendToken` didaftarkan sebelum auth/throttle dalam prioritas middleware dan disebut eksplisit pada grup endpoint terlindungi. Tes `FrontendCookieAuthenticationTest` menggunakan nama cookie kanonis `portal_session_token`, sedangkan penerimaan cookie legacy Wajo dipisahkan menjadi tes middleware unit. Pada test Laravel untuk request JSON, gunakan `withCredentials()` agar cookie benar-benar dikirim; secara default helper `json()` tidak menyertakan cookie kecuali opsi tersebut diaktifkan.

## Keamanan dan operasi

- Seluruh operasi tulis wajib memeriksa autentikasi, izin, cakupan organisasi, validasi payload, dan origin sumber.
- UI yang menyembunyikan tombol bukan kontrol keamanan; backend selalu memutuskan izin.
- Token, kata sandi, dan kunci API hanya berada pada environment/secret manager. Jangan mencatatnya di log atau repositori.
- Backup database dan object storage harus diuji pemulihannya. Uji impor legacy pada staging dan cocokkan jumlah baris, foreign key, metadata, serta file sebelum cutover.
- Setelah perubahan domain, samakan konfigurasi origin dan bangun ulang image Next.js. Periksa health endpoint API dan frontend, lalu uji HTTPS eksternal.

## Acuan SDI

Pemetaan teknis mengikuti prinsip Satu Data Indonesia: standar data, metadata, interoperabilitas, serta kode referensi dan data induk; lihat Perpres 39/2019 dan Permenkominfo 1/2023. Kesesuaian perangkat lunak tidak otomatis menyatakan suatu dataset telah memenuhi standar sektoral atau mendapat pengesahan kelembagaan.

## UX formulir admin dan kategori dataset

- Penambahan akses pengguna memakai email akun aktif, bukan UUID; endpoint tetap menerima `user_id` untuk kompatibilitas klien API lama. Jika hanya ada satu organisasi, pilihan itu otomatis diisi.
- Perpindahan antara “Undang akun baru” dan “Akun terdaftar” meminta konfirmasi hanya jika pengguna mengubah formulir, bukan karena pilihan awal seperti organisasi otomatis telah terisi.
- Kategori dataset memakai saran dari `NEXT_PUBLIC_DATASET_CATEGORIES` (pisahkan daftar dengan `|`) atau daftar bawaan. Admin tetap boleh mengetik kategori lain. Filter kategori pada daftar dataset memakai kategori yang benar-benar tersimpan dan dibatasi pada dataset yang boleh dibaca pengguna. Daftar saran bukan master kategori yang tersimpan di database; sesuaikan daftar saran pada `.env` per instansi lalu rebuild image frontend jika ingin menyeragamkan pilihan. Contoh: `NEXT_PUBLIC_DATASET_CATEGORIES="Ekonomi dan Keuangan|Pendidikan|Kesehatan"`; setelah mengubahnya, jalankan `docker compose build --no-cache frontend && docker compose up -d --force-recreate frontend`.
- Form kesiapan SDI menyesuaikan tinggi, padding, dan `line-height` select konektor supaya nilai terpilih tidak terpotong pada ukuran font/browser yang berbeda.
- Saat menyunting draf, metadata boleh disimpan bertahap. Persyaratan yang wajib sebelum pemeriksaan/publikasi tetap divalidasi oleh backend. Loading shell dan test UI harus mengikuti label dan urutan form yang sama.

## Pencarian dataset publik berbasis intent dan relevansi

Pencarian katalog publik tidak hanya memeriksa kecocokan literal judul. Query diperluas dengan kelompok sinonim/topik berbahasa Indonesia (misalnya pendidikan ↔ sekolah/siswa/guru/madrasah; kesehatan ↔ puskesmas/rumah sakit; penduduk ↔ populasi/kependudukan) dan dicocokkan terhadap judul, deskripsi, kode/slug, kategori, kata kunci JSON, nama/URL sumber, cakupan geografis, metodologi, satuan, lisensi, organisasi pengampu, serta metadata Satu Data pada versi yang sedang dipublikasikan. Urutan hasil memakai bobot relevansi metadata, lalu tanggal publikasi dan judul sebagai pemutus seri. Status publikasi, organisasi aktif, versi berjalan, dan distribusi publik yang berhasil tetap menjadi syarat dasar hasil pencarian.

Implementasi ini memberikan pola relevance ranking bergaya mesin pencari tanpa ketergantungan layanan Elasticsearch eksternal dan tanpa mengubah kontrak paginasi API. Kamus intent dikelola pada layanan `PublicDatasetSearch`; cakupannya adalah sinonim yang didefinisikan aplikasi, bukan pemahaman bahasa alami tak terbatas atau dukungan kompatibilitas Elasticsearch. Untuk katalog berskala sangat besar, ukur query pada basis data produksi dan pertimbangkan indeks full-text atau backend search khusus sebelum mengklaim latensi/skalabilitas setara Elasticsearch.

## Pengelolaan dataset dan indikator (pendekatan CKAN/Satu Data)

Detail dataset diperlakukan sebagai ruang kerja satu paket data: metadata deskriptif (judul, organisasi pengampu, topik/kategori, kata kunci, sumber/provenance, lisensi, cakupan, periode), berkas sumber asli, distribusi hasil olah, riwayat versi, dan pemeriksaan/publikasi dipisahkan agar file input tidak tertukar dengan unduhan publik. Aksi utama di bagian atas mengarahkan admin langsung ke edit metadata, unggah sumber, atau distribusi. Draf boleh dilengkapi bertahap; syarat pemeriksaan/publikasi tetap divalidasi backend. Indikator dikelola terpisah dari observasi nilai berkala, sehingga perubahan definisi tidak tercampur dengan input/publikasi nilai.

Ini mengikuti pola paket-dataset/resource CKAN dan prinsip metadata/provenance Satu Data, tetapi bukan klaim kompatibilitas penuh dengan CKAN API. Taksonomi kategori saat ini berupa daftar saran konfigurasi + nilai kategori tersimpan, belum master kategori database dengan CRUD, sinonim, dan audit perubahan. Untuk tata kelola multi-instansi skala besar, tahap lanjutan yang disarankan adalah master topik/kategori terkelola dan pemetaan ke `groups/tags` atau profil DCAT yang disepakati.

## Autentikasi cookie browser

`AttachFrontendToken` didaftarkan sebagai global middleware sebelum router dispatch, lalu hanya mempromosikan cookie menjadi Bearer token untuk endpoint sesi/portal yang diizinkan. Route-level middleware tetap idempoten. Endpoint API publik tidak memperoleh autentikasi dari cookie browser. Tes integrasi `FrontendCookieAuthenticationTest` harus membuktikan `/api/v1/auth/me` dan mutasi profil memakai cookie kanonis tanpa header Bearer manual.

## Alur admin indikator statistik dan publikasi tren

Pengelolaan statistik memisahkan dua objek: **definisi indikator** (nama, definisi, satuan, organisasi, dan sumber) serta **observasi** (nilai untuk periode/wilayah/dimensi tertentu). Di halaman indikator, ringkasan draf, antrean pemeriksaan, dan definisi terbit membantu admin menentukan pekerjaan berikutnya. Pada halaman observasi, ringkasan nilai draf, nilai aktif yang tampil ke publik, dan riwayat revisi membantu memeriksa apa yang membentuk tren. Tautan tren publik hanya ditampilkan ketika definisi indikator sudah terbit.

Aturan alur: definisi indikator harus diterbitkan sebelum observasi diterbitkan; nilai yang disimpan tanpa publikasi tetap menjadi draf. Saat indikator sedang diperiksa, perubahan definisi dilakukan setelah peninjau mengembalikannya ke draf. Indikator yang diarsipkan menjadi baca-saja untuk penambahan observasi; data historis tetap dapat dilihat.

## Aksi workflow dataset

Detail dataset memusatkan aksi sesuai status dan prasyarat: edit metadata untuk draf/versi kerja, unggah sumber saat versi kerja siap menerima file, buat versi baru untuk dataset terbit, ajukan pemeriksaan setelah metadata wajib lengkap + file sumber selesai diproses + validasi berstatus lulus untuk checksum file yang sama, terbitkan setelah pemeriksaan, serta arsipkan hanya pada status yang diizinkan. Tombol di UI membantu mencegah tindakan yang belum valid, tetapi Laravel tetap menjadi sumber kebenaran untuk izin dan transisi status.
