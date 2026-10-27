const FIELD_GUIDANCE = {
  title:
    "Pilih judul yang menjelaskan isi data dan cakupannya. Contoh: Jumlah Sekolah Menurut Kecamatan, 2025.",
  description:
    "Jelaskan isi data, wilayah atau kelompok yang dicakup, periode, dan kegunaannya. Hindari mengulang judul saja. Jangan sertakan data pribadi atau rahasia yang tidak diperlukan.",
  organization_id:
    "Pilih perangkat daerah yang bertanggung jawab atas data atau indikator ini menurut penugasan resmi.",
  source_name:
    "Sebutkan asal data yang bisa diperiksa kembali, misalnya nama instansi, sistem, survei, atau dokumen. Contoh: Dinas Pendidikan dan Kebudayaan Kabupaten Wajo.",
  source_url:
    "Cantumkan tautan langsung ke sumber jika tersedia. Gunakan alamat lengkap, misalnya https://contoh.go.id/data.",
  geographic_scope:
    "Sebutkan wilayah yang dicakup data. Contoh: seluruh Kabupaten Wajo atau Kecamatan Tempe saja.",
  license_text:
    "Tuliskan lisensi atau ketentuan penggunaan yang memang berlaku. Contoh: CC BY 4.0 hanya jika lisensi tersebut sudah ditetapkan oleh pemilik data.",
  unit: "Tuliskan satuan yang dipakai secara konsisten, misalnya orang, unit, hektare, ton, atau persen. Gunakan satuan yang sesuai dengan cara nilai dihitung.",
  update_frequency:
    "Pilih jadwal pembaruan data, bukan seberapa sering halaman portal dibuka. Contoh: bulanan, triwulanan, atau tahunan.",
  reference_period_start:
    "Pilih tanggal mulai periode yang dicakup data. Tanggal ini berbeda dari tanggal unggah berkas.",
  reference_period_end:
    "Pilih tanggal terakhir yang dicakup data. Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
  methodology:
    "Jelaskan cara data dikumpulkan dan diolah, termasuk rumus, proses pembersihan, serta asumsi penting jika ada.",
  category:
    "Pilih kategori yang paling sesuai dengan isi dataset agar pengguna mudah menemukan data sejenis.",
  keywords:
    "Pisahkan kata kunci dengan koma. Gunakan istilah yang mungkin diketik orang saat mencari data, bukan kalimat panjang.",
  code: "Gunakan kode resmi jika tersedia. Untuk kode internal, ikuti pola yang ditetapkan portal dan pastikan tidak sama dengan kode lain. Contoh: IND-PEND-001.",
  slug: "Bagian alamat halaman yang ringkas. Gunakan huruf kecil, angka, dan tanda hubung. Contoh: jumlah-sekolah-menurut-kecamatan.",
  name: "Masukkan nama sesuai keputusan atau dokumen resmi. Jelaskan singkatan jika belum umum dikenal.",
  short_name:
    "Gunakan nama singkat yang memang dipakai secara resmi oleh organisasi.",
  official_email:
    "Masukkan email kedinasan yang aktif agar pengguna dapat menghubungi organisasi pengampu.",
  official_url:
    "Masukkan alamat situs resmi yang dapat dibuka publik, bukan tautan hasil pencarian atau halaman pribadi.",
  definition:
    "Jelaskan apa yang dihitung dan bagaimana cara menghitungnya. Contoh: jumlah sekolah yang tercatat aktif pada akhir tahun ajaran.",
  period_label:
    "Tuliskan periode dengan format yang konsisten. Contoh: 2025, Triwulan I 2026, atau Tahun Ajaran 2025/2026.",
  value_numeric:
    "Masukkan angka tanpa pemisah ribuan. Gunakan titik untuk desimal, misalnya 1250.5. Jika nilainya berupa teks, biarkan kolom angka kosong.",
  value_text:
    "Gunakan untuk nilai berbentuk teks, misalnya “Tersedia”. Isi kolom ini hanya jika kolom angka dikosongkan.",
  display_name:
    "Masukkan nama yang ingin ditampilkan di portal sesuai kebijakan instansi.",
  email:
    "Masukkan alamat email aktif yang dapat menerima undangan atau pemberitahuan.",
  role: "Pilih akses yang cukup untuk tugas pengguna. Peran global dapat menjangkau banyak organisasi, jadi berikan hanya jika memang diperlukan.",
  user_id:
    "Salin ID dari daftar pengguna. Jangan gunakan email atau nama tampilan. ID berbentuk seperti 00000000-0000-0000-0000-000000000000.",
  is_active:
    "Matikan akses jika pengguna atau organisasi tidak lagi berwenang. Catatan aktivitas sebelumnya tetap tersimpan.",
  filename:
    "Unggah berkas yang menjadi sumber dataset. Format berkas yang didukung tercantum di area unggah.",
  password:
    "Buat kata sandi unik minimal 12 karakter yang memuat huruf besar, huruf kecil, dan angka. Gunakan kata sandi yang berbeda dari akun lain.",
  "new-password":
    "Buat kata sandi unik minimal 12 karakter yang memuat huruf besar, huruf kecil, dan angka.",
  "confirm-password": "Ketik ulang kata sandi baru yang sama persis.",
};

const FIELD_VALIDATION = {
  title: "Isi judul dengan 5–180 karakter.",
  description: "Isi deskripsi dengan 20–5.000 karakter.",
  organization_id:
    "Pilih organisasi pengampu yang sesuai dengan data dan akses akun Anda.",
  source_name: "Isi nama sumber dengan 2–240 karakter.",
  source_url: "Masukkan URL lengkap yang diawali https:// atau http://.",
  geographic_scope:
    "Sebutkan cakupan wilayah, misalnya Kabupaten Wajo atau Kecamatan Tempe.",
  license_text: "Cantumkan lisensi atau ketentuan penggunaan yang berlaku.",
  update_frequency: "Pilih seberapa sering data diperbarui.",
  reference_period_start: "Pilih tanggal mulai periode data.",
  reference_period_end:
    "Tanggal akhir harus sama dengan atau setelah tanggal mulai.",
  code: "Isi kode yang belum dipakai oleh catatan lain.",
  slug: "Gunakan huruf kecil, angka, dan tanda hubung tanpa spasi. Contoh: jumlah-sekolah-wajo.",
  name: "Isi nama resmi sesuai dokumen sumber.",
  short_name:
    "Nama singkat terlalu panjang. Ringkas sesuai nama resmi yang digunakan.",
  official_email: "Periksa alamat email, misalnya nama@instansi.go.id.",
  official_url: "Masukkan alamat lengkap yang diawali https:// atau http://.",
  definition: "Jelaskan arti indikator dengan setidaknya 10 karakter.",
  unit: "Cantumkan satuan nilai, misalnya orang, hektare, ton, atau persen.",
  period_label:
    "Gunakan format periode yang jelas, misalnya 2025 atau Triwulan I 2026.",
  value_numeric:
    "Masukkan angka tanpa pemisah ribuan; gunakan titik untuk desimal.",
  value_text: "Isi nilai teks jika nilai tidak dinyatakan sebagai angka.",
  display_name: "Nama tampilan harus berisi 2–120 karakter.",
  email: "Periksa alamat email, misalnya nama@instansi.go.id.",
  user_id:
    "Salin ID lengkap dari daftar pengguna. Formatnya seperti 00000000-0000-0000-0000-000000000000.",
  password:
    "Gunakan kata sandi minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.",
  "new-password":
    "Gunakan kata sandi minimal 12 karakter dengan huruf besar, huruf kecil, dan angka.",
  "confirm-password":
    "Kata sandi yang diketik belum sama. Periksa kembali kedua kolom kata sandi.",
};

export function getFieldGuidance(name, label = "") {
  const direct = FIELD_GUIDANCE[name];
  if (direct) return direct;
  const normalizedLabel = String(label).toLocaleLowerCase("id-ID");
  if (
    normalizedLabel.includes("tanggal") &&
    normalizedLabel.includes("akhir")
  ) {
    return FIELD_GUIDANCE.reference_period_end;
  }
  if (
    normalizedLabel.includes("tanggal") &&
    (normalizedLabel.includes("awal") || normalizedLabel.includes("mulai"))
  ) {
    return FIELD_GUIDANCE.reference_period_start;
  }
  if (
    normalizedLabel.includes("periode") &&
    normalizedLabel.includes("akhir")
  ) {
    return FIELD_GUIDANCE.reference_period_end;
  }
  if (normalizedLabel.includes("periode") && normalizedLabel.includes("awal")) {
    return FIELD_GUIDANCE.reference_period_start;
  }
  if (normalizedLabel.includes("periode")) return FIELD_GUIDANCE.period_label;
  if (normalizedLabel.includes("email")) return FIELD_GUIDANCE.email;
  if (normalizedLabel.includes("sumber") && normalizedLabel.includes("url")) {
    return FIELD_GUIDANCE.source_url;
  }
  if (normalizedLabel.includes("sumber")) return FIELD_GUIDANCE.source_name;
  if (normalizedLabel.includes("organisasi"))
    return FIELD_GUIDANCE.organization_id;
  if (
    normalizedLabel.includes("situs resmi") ||
    normalizedLabel.includes("website")
  ) {
    return FIELD_GUIDANCE.official_url;
  }
  if (
    normalizedLabel.includes("url") ||
    normalizedLabel.includes("alamat web")
  ) {
    return FIELD_GUIDANCE.source_url;
  }
  if (normalizedLabel.includes("kata sandi")) return FIELD_GUIDANCE.password;
  if (normalizedLabel.includes("judul")) return FIELD_GUIDANCE.title;
  if (normalizedLabel.includes("deskripsi")) return FIELD_GUIDANCE.description;
  return "Isi kolom ini berdasarkan sumber yang dapat diperiksa. Jika belum yakin dengan nilainya, tanyakan kepada pengampu data sebelum menyimpan.";
}

export function getFieldValidationMessage(name, label = "") {
  const direct = FIELD_VALIDATION[name];
  if (direct) return direct;
  const normalizedLabel = String(label).toLocaleLowerCase("id-ID");
  if (
    normalizedLabel.includes("tanggal") &&
    normalizedLabel.includes("akhir")
  ) {
    return FIELD_VALIDATION.reference_period_end;
  }
  if (normalizedLabel.includes("tanggal")) {
    return FIELD_VALIDATION.reference_period_start;
  }
  if (normalizedLabel.includes("periode")) return FIELD_VALIDATION.period_label;
  if (normalizedLabel.includes("email")) return FIELD_VALIDATION.email;
  if (normalizedLabel.includes("url") || normalizedLabel.includes("situs")) {
    return FIELD_VALIDATION.official_url;
  }
  if (normalizedLabel.includes("judul")) return FIELD_VALIDATION.title;
  if (normalizedLabel.includes("deskripsi"))
    return FIELD_VALIDATION.description;
  return "Periksa petunjuk di bawah kolom ini, lalu sesuaikan isian Anda.";
}

export function FieldGuidance({ name, id, text, className = "" }) {
  const content = text || getFieldGuidance(name);
  if (!content) return null;
  return (
    <p
      id={id || `${name}-help`}
      className={`mt-1.5 text-xs leading-5 text-muted ${className}`.trim()}
    >
      {content}
    </p>
  );
}
