# Matriks Dukungan Teknis Satu Data Indonesia

Dokumen ini memetakan dukungan teknis aplikasi, bukan menggantikan pengesahan Pembina Data, Walidata, atau aturan sektoral. Rujukan utama adalah Perpres Nomor 39 Tahun 2019 tentang Satu Data Indonesia serta aturan interoperabilitas data yang berlaku.

| Prinsip SDI | Dukungan teknis yang relevan | Batasan |
|---|---|---|
| Standar data | Metadata dataset dan indikator, unit, periode, cakupan, dan validasi | Kesesuaian standar sektoral perlu dikonfirmasi dengan Pembina Data |
| Metadata | Metadata katalog, sumber, organisasi pengampu, lisensi, dan informasi versi | Draf tidak wajib lengkap; kelengkapan dinilai sesuai tahap workflow |
| Interoperabilitas | API terdokumentasi dengan OpenAPI, format distribusi, kode status, dan paginasi | Ketersediaan endpoint tidak otomatis membuktikan kesesuaian proses bisnis antar sistem |
| Kode referensi dan data induk | Registry standar dan sistem kode referensi | Kode resmi tidak boleh dibuat-buat; perlu sumber otoritatif dan tata kelola pemutakhiran |

## Tahapan kelengkapan

- **Draf:** informasi minimum untuk membuat catatan data, termasuk judul dan organisasi pengampu.
- **Pemeriksaan/publikasi:** informasi yang dibutuhkan untuk memahami, menilai, dan mempertanggungjawabkan dataset harus divalidasi.
- **Ekspor/interoperabilitas:** distribusi harus memenuhi syarat teknis endpoint, versi, format, akses, dan metadata yang relevan.

Aplikasi harus memberi tahu admin apa yang belum tersedia dan mengapa hal itu diperlukan pada tahap tertentu. Sistem tidak boleh memaksa pengisian semua kolom sejak awal atau meminta admin mengarang nilai kode resmi.
