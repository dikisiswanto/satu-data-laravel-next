# Kontrak API Satu Data Wajo

## Sumber kontrak

Spesifikasi OpenAPI kanonis berada di:

- `backend/openapi/openapi.json`
- `backend/openapi/openapi.yaml`

Laravel menyajikan spesifikasi melalui endpoint dokumentasi yang didaftarkan di `backend/routes/api.php`. Jangan membuat kontrak frontend baru hanya berdasarkan asumsi dari komponen lama.

## Pembagian endpoint

- Endpoint publik `/api/v1/*` menyediakan katalog dataset, organisasi, indikator, statistik, unduhan, dan pratinjau.
- Endpoint `/api/v1/portal/*` memerlukan autentikasi dan permission yang sesuai.
- Alias kompatibilitas lama dipertahankan hanya selama masih diperlukan; gunakan endpoint kanonis untuk fitur baru.
- Endpoint health dipakai untuk readiness deployment, bukan sebagai pengganti pemeriksaan integrasi.

## Aturan respons dan paginasi

- Respons koleksi menyertakan `data` dan metadata paginasi seperti `meta.total`, `meta.limit`, serta offset/halaman sesuai endpoint.
- Frontend harus menangani respons kosong, gagal, dan tidak tersedia sebagai keadaan berbeda.
- Pratinjau harus menggunakan jumlah baris hasil konversi yang benar, bukan jumlah baris sumber yang belum tentu tersedia.
- Jangan mengembalikan resource privat, resource dari versi lama, atau berkas sumber internal melalui API publik.

## Perubahan kontrak

Saat endpoint atau payload berubah:

1. Ubah implementasi Laravel.
2. Perbarui JSON dan YAML OpenAPI secara konsisten.
3. Perbarui adapter data Next.js dan tipe/validasi payload terkait.
4. Tambahkan atau perbarui tes kontrak yang menguji perilaku, bukan hanya teks implementasi.
5. Jalankan `npm run check`, `npm run test`, `npm run lint`, `npm run build`, dan `cd backend && composer test`.
