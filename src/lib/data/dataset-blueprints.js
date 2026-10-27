/**
 * Operator-oriented starter profiles. These are practical examples, not a
 * substitute for an approved Walidata data list or authoritative standards.
 */
export const DATASET_BLUEPRINTS = [
  {
    id: "statistik-wilayah",
    title: "Statistik menurut wilayah dan periode",
    description:
      "Untuk jumlah, persentase, produksi, layanan, atau capaian yang dibandingkan antarwilayah dan waktu.",
    useWhen:
      "Setiap baris mewakili satu ukuran pada satu wilayah dan satu periode.",
    columns: [
      "kode_data",
      "nama_data",
      "periode",
      "kode_wilayah",
      "nama_wilayah",
      "nilai",
      "satuan",
      "sumber_data",
    ],
    files: [
      {
        label: "Template Excel",
        href: "/templates/data-statistik-wilayah.xlsx",
      },
      { label: "Template CSV", href: "/templates/data-statistik-wilayah.csv" },
    ],
    note: "Simpan angka sebagai angka, bukan teks berformat ribuan. Pakai kode wilayah dari sumber resmi.",
  },
  {
    id: "deret-indikator",
    title: "Deret nilai indikator",
    description:
      "Untuk menyajikan satu indikator dari beberapa periode atau beberapa wilayah agar dapat dibuat grafik tren.",
    useWhen:
      "Satu baris mewakili satu indikator, satu periode, dan satu wilayah/dimensi.",
    columns: [
      "kode_indikator",
      "nama_indikator",
      "periode",
      "kode_wilayah",
      "nama_wilayah",
      "nilai",
      "satuan",
      "definisi",
      "sumber_data",
    ],
    files: [
      { label: "Template Excel", href: "/templates/data-deret-indikator.xlsx" },
      { label: "Template CSV", href: "/templates/data-deret-indikator.csv" },
    ],
    note: "Jangan mencampur satuan atau definisi berbeda dalam satu deret tanpa dimensi dan catatan yang jelas.",
  },
  {
    id: "register-fasilitas",
    title: "Daftar fasilitas atau objek layanan",
    description:
      "Untuk inventaris fasilitas pendidikan/kesehatan, layanan publik, aset, atau objek administratif yang punya identitas stabil.",
    useWhen:
      "Setiap baris mewakili satu objek; jangan memasukkan data pribadi yang tidak diperlukan.",
    columns: [
      "kode_objek",
      "nama_objek",
      "jenis_objek",
      "kode_wilayah",
      "nama_wilayah",
      "alamat",
      "status",
      "tanggal_pembaruan",
      "sumber_data",
    ],
    files: [
      {
        label: "Template Excel",
        href: "/templates/data-register-fasilitas.xlsx",
      },
      { label: "Template CSV", href: "/templates/data-register-fasilitas.csv" },
    ],
    note: "Jika lokasi perlu dipetakan, gunakan GeoJSON dan koordinat yang sudah diperiksa; jangan menebak titik.",
  },
  {
    id: "geospasial",
    title: "Data geospasial",
    description:
      "Untuk titik fasilitas, jalur jalan, batas, dan area tematik yang akan dipakai di GeoPortal Wajo.",
    useWhen:
      "Geometri dan atribut harus berasal dari sumber yang dapat dipertanggungjawabkan.",
    columns: [
      "GeoJSON FeatureCollection",
      "geometry",
      "properties.kode_objek",
      "properties.nama_objek",
      "properties.kode_wilayah",
      "properties.sumber_data",
    ],
    files: [
      { label: "Template GeoJSON", href: "/templates/data-spasial.geojson" },
      {
        label: "Contoh metadata dataset",
        href: "/templates/metadata-dataset.json",
      },
    ],
    note: "GeoJSON menggunakan koordinat longitude, latitude dalam WGS 84. Validasi geometri serta kode wilayah sebelum publikasi.",
  },
];

export const WAJO_DATA_THEMES = [
  {
    id: "wilayah-layanan",
    title: "Wilayah dan layanan dasar",
    examples:
      "Kode wilayah, fasilitas umum, cakupan layanan, dan lokasi pelayanan.",
    purpose: "Mendukung pencarian layanan dan pemetaan sebaran fasilitas.",
  },
  {
    id: "kependudukan-sosial",
    title: "Kependudukan dan kesejahteraan",
    examples:
      "Agregat penduduk, kemiskinan, bantuan sosial, dan kelompok rentan.",
    purpose:
      "Mendukung perencanaan berbasis kebutuhan wilayah; jangan membuka identitas pribadi.",
  },
  {
    id: "pendidikan-kesehatan",
    title: "Pendidikan dan kesehatan",
    examples:
      "Jumlah fasilitas, peserta didik, tenaga, cakupan layanan, dan indikator kesehatan agregat.",
    purpose:
      "Membandingkan ketersediaan serta jangkauan layanan per wilayah dan periode.",
  },
  {
    id: "pangan-perikanan-ekonomi",
    title: "Pangan, pertanian, perikanan, dan ekonomi lokal",
    examples:
      "Produksi per komoditas/periode, luas panen, kegiatan perikanan, koperasi, dan UMKM dalam bentuk agregat.",
    purpose:
      "Mendukung perencanaan sektor ekonomi lokal dengan satuan dan metodologi yang jelas.",
  },
  {
    id: "infrastruktur-lingkungan",
    title: "Infrastruktur, lingkungan, dan kebencanaan",
    examples:
      "Kondisi jalan, jaringan layanan, tutupan lahan, area rawan, sungai, dan kejadian kebencanaan.",
    purpose:
      "Menghubungkan data tabular dengan GeoPortal jika geometri dan sumbernya telah diverifikasi.",
  },
  {
    id: "pembangunan-keuangan",
    title: "Pembangunan dan keuangan daerah",
    examples:
      "Program, target, realisasi, keluaran layanan, serta indikator kinerja per periode.",
    purpose:
      "Mendukung pemantauan pembangunan dan analisis capaian secara terukur.",
  },
];

export const OPERATOR_START_STEPS = [
  {
    title: "Siapkan sumber",
    description:
      "Gunakan data dari produsen yang berwenang dan simpan rujukan atau dokumen sumbernya.",
  },
  {
    title: "Pilih pola file",
    description:
      "Unduh template yang sesuai; pertahankan nama kolom atau sesuaikan dengan kamus data yang terdokumentasi.",
  },
  {
    title: "Isi metadata dasar",
    description:
      "Judul, deskripsi, organisasi, periode, sumber, cakupan, lisensi, dan frekuensi pembaruan.",
  },
  {
    title: "Unggah dan periksa",
    description:
      "Tinjau hasil konversi, jumlah baris, nilai kosong, kode wilayah, dan contoh baris sebelum meminta review.",
  },
  {
    title: "Lengkapi standar",
    description:
      "Isi kode SDS/DDP hanya dari registri atau konfirmasi Walidata; jangan menebak kode standar.",
  },
];
