/** Human-readable, non-sensitive messages for common API failure contracts. */
const COMMON_ERRORS = {
  unauthorized: "Sesi Anda sudah berakhir. Masuk kembali untuk melanjutkan.",
  account_inactive:
    "Akun ini sedang dinonaktifkan. Hubungi administrator portal jika Anda memerlukan akses.",
  authentication_unavailable:
    "Kami belum dapat memeriksa akun Anda karena layanan masuk sedang terganggu. Coba lagi beberapa saat lagi.",
  authorization_unavailable:
    "Kami belum dapat memeriksa hak akses Anda. Muat ulang halaman; jika masalah berlanjut, coba lagi beberapa saat lagi.",
  service_unavailable:
    "Layanan sedang mengalami kendala dan belum dapat menyelesaikan permintaan ini. Coba lagi beberapa saat lagi.",
  origin_not_allowed:
    "Permintaan ini belum dapat diverifikasi. Muat ulang portal, lalu coba lagi.",
  request_too_large:
    "Ukuran berkas atau data yang dikirim melebihi batas. Kurangi ukurannya, lalu coba lagi.",
  invalid_json:
    "Data yang dikirim belum dapat dibaca. Periksa isian dan formatnya, lalu coba lagi.",
  validation_failed:
    "Ada isian yang perlu diperbaiki. Periksa kolom yang ditandai; isian lainnya tetap tersedia.",
  sdi_standard_not_verified_or_active:
    "Standar yang dipilih belum diverifikasi atau sudah tidak berlaku. Pilih standar aktif dari halaman Standar dan Kode Referensi.",
  sdi_reference_system_not_verified_or_active:
    "Sistem kode yang dipilih belum diverifikasi atau sudah tidak berlaku. Pilih sistem aktif dari halaman Standar dan Kode Referensi.",
  forbidden:
    "Akun Anda belum memiliki akses untuk melakukan tindakan ini. Jika Anda seharusnya memiliki akses, hubungi administrator portal.",
  not_found:
    "Data tidak ditemukan atau akses Anda sudah berubah. Muat ulang halaman untuk melihat informasi terbaru.",
  conflict:
    "Data mungkin sudah berubah atau tersimpan melalui proses lain. Perbarui informasi yang tampil sebelum mencoba lagi.",
  rate_limited:
    "Anda mengirim permintaan terlalu sering dalam waktu singkat. Tunggu sebentar, lalu coba lagi.",
  rate_limit_unavailable:
    "Kami belum dapat memeriksa batas permintaan. Coba lagi beberapa saat lagi.",
  catalog_unavailable:
    "Katalog data sedang sulit diakses. Coba lagi beberapa saat lagi.",
  dataset_lookup_unavailable:
    "Informasi dataset belum dapat diperiksa. Muat ulang halaman untuk mencoba lagi.",
  organization_lookup_unavailable:
    "Daftar organisasi belum dapat dimuat. Coba lagi beberapa saat lagi.",
  resource_lookup_unavailable:
    "Informasi berkas belum dapat dimuat. Berkasnya belum tentu hilang; coba periksa lagi beberapa saat lagi.",
  resources_unavailable:
    "Daftar berkas belum dapat dimuat. Coba lagi beberapa saat lagi.",
  indicators_unavailable:
    "Data indikator belum dapat dimuat. Coba lagi beberapa saat lagi.",
  organizations_unavailable:
    "Daftar perangkat daerah belum dapat dimuat. Coba lagi beberapa saat lagi.",
  download_unavailable:
    "Berkas belum dapat diunduh. Coba lagi beberapa saat lagi.",
  preview_unavailable:
    "Pratinjau belum dapat ditampilkan. Anda tetap dapat mengunduh berkasnya.",
  source_registration_failed:
    "Berkas sudah dikirim, tetapi pendaftarannya belum terkonfirmasi. Periksa detail dataset sebelum mengunggahnya lagi agar tidak membuat duplikat.",
  user_invitation_not_configured:
    "Undangan pengguna belum diaktifkan. Hubungi administrator portal untuk menyiapkannya.",
  email_already_registered:
    "Email ini sudah terdaftar. Buka daftar pengguna untuk memperbarui akses akun yang ada.",
  password_update_failed:
    "Kata sandi belum berubah. Masuk kembali jika sesi Anda sudah berakhir, lalu coba lagi.",
  profile_update_failed:
    "Profil belum tersimpan. Periksa isian yang ditandai, lalu coba lagi.",
};

/**
 * Prefer operation-specific messages at the call site, then common contracts.
 * HTTP 5xx responses that have no recognized error code use a service message
 * rather than implying that the user entered invalid data.
 */
export function apiErrorMessage(
  code,
  status = 0,
  fallback = "Permintaan ini belum selesai. Periksa informasi yang tampil, lalu coba lagi.",
) {
  if (typeof code === "string" && Object.hasOwn(COMMON_ERRORS, code)) {
    return COMMON_ERRORS[code];
  }
  if (Number(status) === 401) return COMMON_ERRORS.unauthorized;
  if (Number(status) === 403) return COMMON_ERRORS.forbidden;
  if (Number(status) === 404) return COMMON_ERRORS.not_found;
  if (Number(status) === 408) return COMMON_ERRORS.service_unavailable;
  if (Number(status) === 409) return COMMON_ERRORS.conflict;
  if (Number(status) === 413) return COMMON_ERRORS.request_too_large;
  if (Number(status) === 422) return COMMON_ERRORS.validation_failed;
  if (Number(status) === 429) return COMMON_ERRORS.rate_limited;
  if (Number(status) >= 500) return COMMON_ERRORS.service_unavailable;
  return fallback;
}

/** Explain ambiguous transport/proxy failures without claiming that a write failed. */
export function apiTransportFailureMessage(error, fallback) {
  if (error?.code === "invalid_api_response") {
    return "Kami belum menerima konfirmasi dari layanan. Perubahan mungkin sudah tersimpan; muat ulang halaman dan periksa statusnya sebelum mengirim ulang.";
  }
  return (
    fallback ||
    "Koneksi terputus sebelum layanan memberi konfirmasi. Perubahan mungkin sudah tersimpan; muat ulang halaman dan periksa statusnya sebelum mengirim ulang."
  );
}
