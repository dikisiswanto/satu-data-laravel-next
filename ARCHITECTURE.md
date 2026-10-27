# Arsitektur Satu Data Wajo v6

## Prinsip utama

- **Laravel adalah sumber kebenaran** untuk autentikasi, otorisasi, aturan bisnis, workflow, dan persistensi.
- **Next.js adalah lapisan presentasi**. Komponen publik dan admin memakai adapter API; komponen React tidak mengakses tabel atau database secara langsung.
- **MariaDB adalah penyimpanan relasional utama**. Constraint, transaksi, foreign key, dan unique index menjaga konsistensi lintas permintaan.
- **Pekerjaan berat berjalan melalui antrean**. Konversi file tidak boleh dianggap berhasil sebelum keluaran ditulis dan diverifikasi.
- **Data privat tidak boleh menjadi publik hanya karena berhasil diunggah atau dikonversi**.

## Batas domain

- Identitas dan akses: pengguna, profil, peran, permission, membership organisasi, serta status akun.
- Katalog dataset: metadata dataset, versi, resource, dan baris pratinjau hasil konversi.
- Workflow dataset: draf, pengajuan pemeriksaan, pengembalian untuk perbaikan, publikasi, dan pengarsipan.
- Statistik/indikator: definisi indikator, observasi berversi, status publikasi, dan riwayat audit.
- Tata kelola SDI: metadata standar, kode referensi, pemeriksaan kualitas, serta kesiapan ekspor.
- API publik: pencarian, detail, statistik, unduhan, pratinjau, dan spesifikasi OpenAPI.

## Aturan integritas

1. Setiap dataset memiliki organisasi pengampu dan versi aktif yang eksplisit.
2. Resource publik harus terkait dengan versi dataset aktif, berstatus publik, selesai diproses, dan bukan berkas sumber internal.
3. Pengajuan/publikasi harus memvalidasi snapshot versi yang akan dipublikasikan, bukan versi historis yang berbeda.
4. Perubahan workflow mengunci baris yang relevan, memeriksa permission dalam organisasi, dan menulis audit dalam transaksi.
5. Membership lokal tidak otomatis menjadi akses lintas organisasi hanya karena kode perannya bernama global.
6. Draf boleh belum lengkap. Persyaratan yang dibutuhkan untuk pemeriksaan, publikasi, atau ekspor dinilai pada tahap yang sesuai.
7. Token unggahan harus terbatas waktu, disimpan dalam bentuk hash, dan hanya berlaku untuk resource yang dituju.

## Kontrak frontend dan cache

- Endpoint kanonis dicatat dalam `backend/openapi/openapi.json` dan `.yaml`.
- Perubahan bentuk respons harus memperbarui kedua spesifikasi, adapter frontend, serta pengujian kontrak.
- Cache privat harus dibersihkan ketika sesi portal berakhir atau pengguna berpindah ke layar login.
- Data publik harus mencerminkan status publikasi terkini; kegagalan API tidak boleh disamarkan sebagai jumlah nol.

## Kebijakan migrasi dan rilis

- Migrasi v6 bukan upgrade langsung dari seluruh riwayat skema v5. Gunakan database kosong untuk instalasi baru.
- Impor legacy harus dijalankan secara eksplisit, idealnya dengan `--dry-run`, pada salinan staging sebelum data produksi dipindahkan.
- Backup database dan object storage sebelum migrasi atau impor.
- Rilis hanya setelah pemeriksaan statis, tes unit, tes backend pada MariaDB, build Next.js, dan smoke test deployment lulus.
