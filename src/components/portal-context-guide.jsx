"use client";

import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileClock,
  Info,
  KeyRound,
  Users,
} from "lucide-react";

const guides = [
  {
    match: (path) => path === "/portal",
    title: "Mulai dari pekerjaan yang perlu ditindaklanjuti",
    description:
      "Ringkasan ini menunjukkan dataset dan pekerjaan yang dapat Anda akses. Tanda pisah (—) berarti angka belum berhasil dimuat, bukan berarti jumlahnya nol.",
    steps: [
      "Buka dataset terbaru atau cari di katalog lengkap.",
      "Simpan draf lebih dulu; lengkapi sumber, cakupan, dan lisensi saat informasinya tersedia.",
      "Ajukan pemeriksaan setelah metadata penting dilengkapi dan berkas sumber lolos validasi.",
    ],
    icon: BookOpenCheck,
  },
  {
    match: (path) => path === "/portal/dataset/new",
    title: "Alur membuat dataset",
    description:
      "Mulai dari informasi inti. Panduan dan template tersedia bila Anda membutuhkannya.",
    steps: [
      "Mulai dengan judul dan organisasi pengampu; deskripsi boleh ditambahkan nanti.",
      "Simpan draf, lalu tambahkan sumber, cakupan, lisensi, dan periode saat sudah diketahui.",
      "Lengkapi informasi penting dan validasi berkas sebelum mengajukan pemeriksaan.",
    ],
    note: "Menyimpan atau mengunggah berkas tidak otomatis menerbitkan dataset.",
    icon: Database,
  },
  {
    match: (path) => /^\/portal\/dataset\/[^/]+\/edit$/.test(path),
    title: "Perbarui metadata dataset",
    description:
      "Halaman ini digunakan untuk mengubah dataset berstatus Draf. Cocokkan setiap perubahan dengan sumber dan periode data.",
    steps: [
      "Periksa judul, deskripsi, periode, dan cakupan.",
      "Cantumkan sumber, lisensi, dan cara data dikumpulkan atau dihitung.",
      "Simpan perubahan sebelum melanjutkan ke pemeriksaan.",
    ],
    icon: Database,
  },
  {
    match: (path) => /^\/portal\/dataset\/[^/]+$/.test(path),
    title: "Periksa kelengkapan dataset",
    description:
      "Halaman ini merangkum informasi dataset, berkas sumber, status konversi, dan tahapan publikasi.",
    steps: [
      "Periksa informasi dataset dan organisasi pengampu.",
      "Cocokkan hasil pengolahan dan pratinjau dengan berkas sumber.",
      "Pilih tindakan yang tersedia sesuai status data dan akses akun.",
    ],
    note: "Jika pemrosesan masih berjalan, periksa statusnya sebelum mengunggah ulang.",
    icon: Database,
  },
  {
    match: (path) => path === "/portal/dataset",
    title: "Kelola katalog dataset",
    description:
      "Gunakan pencarian dan filter untuk menemukan dataset. Isi data tetap perlu diperiksa sebelum digunakan.",
    steps: [
      "Cari dataset berdasarkan judul atau status.",
      "Buka detail untuk memeriksa informasi dan berkas.",
      "Buat dataset baru bila data belum tercatat.",
    ],
    icon: Database,
  },
  {
    match: (path) => path === "/portal/review" || path === "/portal/publikasi",
    title: "Pemeriksaan sebelum publikasi",
    description:
      "Tinjau informasi, sumber, periode, lisensi, dan hasil pengolahan berkas sebelum mengambil keputusan.",
    steps: [
      "Buka detail dataset dan periksa sumbernya.",
      "Pastikan definisi serta cakupan data jelas bagi pengguna.",
      "Setujui jika sesuai, atau kembalikan dengan catatan yang spesifik.",
    ],
    note: "Unggahan yang berhasil belum berarti data siap diterbitkan.",
    icon: ClipboardCheck,
  },
  {
    match: (path) => path === "/portal/statistik/baru",
    title: "Tambahkan indikator yang terdefinisi jelas",
    description:
      "Indikator perlu dapat ditafsirkan secara konsisten dan ditelusuri ke sumber serta periode rujukannya.",
    steps: [
      "Tulis nama dan definisi yang tidak ambigu.",
      "Tetapkan satuan, periode, dan sumber.",
      "Periksa nilai sebelum menyimpan atau mengajukan.",
    ],
    icon: BarChart3,
  },
  {
    match: (path) => /^\/portal\/statistik\/[^/]+\/edit$/.test(path),
    title: "Perbarui definisi indikator",
    description:
      "Gunakan definisi, satuan, dan periode yang konsisten supaya nilainya dapat dibandingkan.",
    steps: [
      "Periksa kode dan definisi indikator.",
      "Cocokkan satuan dan periode dengan sumber data.",
      "Simpan perubahan dan periksa status berikutnya.",
    ],
    icon: BarChart3,
  },
  {
    match: (path) => path === "/portal/statistik",
    title: "Kelola indikator statistik",
    description:
      "Indikator menjelaskan ukuran yang dipantau. Simpan definisi, lalu catat nilai per periode dengan sumber yang jelas.",
    steps: [
      "Cari indikator dan periksa statusnya.",
      "Gunakan definisi, satuan, dan periode rujukan yang sama.",
      "Tambahkan indikator hanya jika sumbernya jelas.",
    ],
    icon: BarChart3,
  },
  {
    match: (path) => path === "/portal/organisasi/baru",
    title: "Daftarkan organisasi pengampu",
    description:
      "Gunakan nama dan kode resmi agar data terhubung ke perangkat daerah yang tepat.",
    steps: [
      "Isi nama dan kode organisasi yang konsisten.",
      "Tambahkan kontak atau situs resmi.",
      "Periksa kembali sebelum menyimpan.",
    ],
    icon: Building2,
  },
  {
    match: (path) => /^\/portal\/organisasi\/[^/]+\/edit$/.test(path),
    title: "Perbarui identitas organisasi",
    description:
      "Perbarui identitas dan kontak jika ada perubahan resmi. Menonaktifkan organisasi tidak menghapus dataset atau riwayatnya.",
    steps: [
      "Verifikasi nama dan kode organisasi.",
      "Perbarui kontak resmi bila berubah.",
      "Nonaktifkan hanya jika memang diperlukan.",
    ],
    icon: Building2,
  },
  {
    match: (path) => path === "/portal/organisasi",
    title: "Kelola organisasi pengampu data",
    description:
      "Organisasi menunjukkan pihak yang bertanggung jawab atas dataset. Perubahan akses perlu mengikuti penugasan resmi.",
    steps: [
      "Periksa daftar organisasi yang berada dalam cakupan akses.",
      "Verifikasi identitas dan status organisasi.",
      "Ubah informasi hanya jika sudah terkonfirmasi.",
    ],
    icon: Building2,
  },
  {
    match: (path) => path === "/portal/pengguna",
    title: "Berikan akses sesuai tugas",
    description:
      "Pilih peran yang cukup untuk tugas pengguna, tanpa memberi akses lebih luas dari yang diperlukan.",
    steps: [
      "Cocokkan nama dan email sebelum memberi akses.",
      "Pilih peran serta organisasi yang tepat.",
      "Tinjau akses aktif dan nonaktif secara berkala.",
    ],
    note: "Akses dapat dinonaktifkan tanpa menghapus riwayat tindakan sebelumnya.",
    icon: Users,
  },
  {
    match: (path) => path === "/portal/pengaturan",
    title: "Kelola akun Anda",
    description:
      "Di halaman ini, Anda dapat memperbarui nama tampilan dan kata sandi. Untuk mengubah akses organisasi, hubungi administrator portal.",
    steps: [
      "Periksa email akun yang sedang Anda gunakan.",
      "Perbarui profil bila diperlukan.",
      "Gunakan kata sandi kuat dan unik.",
    ],
    icon: KeyRound,
  },
  {
    match: (path) => path === "/portal/riwayat",
    title: "Gunakan riwayat untuk penelusuran",
    description:
      "Riwayat mencatat siapa yang mengubah data, kapan perubahan dilakukan, dan hasilnya.",
    steps: [
      "Cari waktu dan jenis aktivitas yang relevan.",
      "Buka rincian jika tersedia.",
      "Periksa data terkait sebelum menarik kesimpulan.",
    ],
    icon: FileClock,
  },
];

export function PortalContextGuide() {
  const pathname = usePathname() || "/portal";
  const guide = guides.find((item) => item.match(pathname));
  if (!guide) return null;

  const Icon = guide.icon;
  return (
    <details className="portal-context-guide group mb-5 rounded-xl border border-[#dce7ee] bg-white">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl p-3.5 sm:p-4">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#eef6fb] text-[#285f7f] ring-1 ring-[#dbe8ef]"
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              id="portal-context-guide-title"
              className="text-sm font-semibold leading-5 text-[#203e52]"
            >
              {guide.title}
            </span>
            <span className="rounded-full border border-[#dce5eb] bg-[#f7f9fb] px-2 py-0.5 text-[10px] font-medium text-[#536b7c]">
              Panduan singkat
            </span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#647b8c]">
            {guide.description}
          </span>
        </span>
        <ChevronDown
          size={17}
          className="portal-disclosure-arrow mt-1 shrink-0 text-[#62798a] transition-transform"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-[#e8eef3] px-4 pb-4 pt-3 sm:px-5">
        <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {guide.steps.map((step, index) => (
            <li
              key={step}
              className="flex min-w-0 items-start gap-2 text-xs leading-5 text-[#50697b]"
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#f1f6fa] text-xs font-semibold text-[#285f7f] ring-1 ring-[#dce7ee]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {guide.note ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs font-medium leading-5 text-[#425f73]">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {guide.note}
          </p>
        ) : null}
      </div>
    </details>
  );
}
