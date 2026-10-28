import { notifyPortalToast } from "@/lib/ui/portal-toast";

/**
 * Parse API responses without masking the caller's domain-specific error copy.
 * Non-JSON proxy/runtime errors safely become an empty object.
 * @param {Response} response
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readApiResponse(response) {
  try {
    const payload = await response.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : {};
  } catch {
    return {};
  }
}

/** Parse Retry-After as seconds or an HTTP date, bounded to one minute. */
export function getRetryAfterMs(response) {
  const value = response.headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.min(60_000, Math.max(0, delay)) : null;
}

/**
 * Read mutation responses strictly: an empty/malformed JSON body with a 2xx
 * status must not be treated as proof that a write succeeded.
 */
export async function readApiMutationResponse(
  response,
  { notify = true } = {},
) {
  const payload = await readApiResponse(response);
  const isEmpty = Object.keys(payload).length === 0;
  const requestId = response.headers?.get?.("X-Request-Id") || null;
  if (requestId && !payload.request_id) payload.request_id = requestId;
  if (response.ok && isEmpty && response.status !== 204) {
    const error = new Error("invalid_api_response");
    error.code = "invalid_api_response";
    error.requestId = requestId;
    throw error;
  }

  // Laravel's default validation response is { message, errors: { field: [] } },
  // while portal forms use a small, framework-neutral { error, issues } contract.
  // Normalize it here so every create/edit form can identify the failed fields.
  if (response.status === 422 && payload.error === undefined) {
    const fieldErrors =
      payload.errors && typeof payload.errors === "object"
        ? payload.errors
        : {};
    payload.error = "validation_failed";
    payload.issues = Object.entries(fieldErrors).flatMap(([field, messages]) =>
      (Array.isArray(messages) ? messages : [messages]).map((message) => ({
        path: field.split("."),
        message: String(message),
      })),
    );
  }

  if (payload.error === undefined) {
    const errorByStatus = {
      401: "unauthorized",
      403: "forbidden",
      404: "not_found",
      409: "conflict",
      413: "request_too_large",
      429: "rate_limited",
    };
    payload.error =
      errorByStatus[response.status] ||
      (response.status >= 500 ? "service_unavailable" : undefined);
  }

  if (notify) {
    if (response.ok && payload.error === undefined) {
      notifyPortalToast("success", mutationSuccessMessage(response.url));
    } else {
      notifyPortalToast(
        "error",
        mutationFailureMessage(payload, response.status),
      );
    }
  }

  return payload;
}

function mutationSuccessMessage(responseUrl) {
  let path = "";
  try {
    const origin =
      typeof window === "undefined"
        ? "http://portal.local"
        : window.location.origin;
    path = new URL(responseUrl || "", origin).pathname;
  } catch {
    path = "";
  }
  if (path.includes("/users/invite"))
    return "Undangan pengguna berhasil diproses.";
  if (path.endsWith("/profile/password"))
    return "Kata sandi berhasil diperbarui.";
  if (path.endsWith("/profile")) return "Profil berhasil diperbarui.";
  if (path.includes("/organizations")) return "Organisasi berhasil disimpan.";
  if (path.includes("/memberships"))
    return "Akses pengguna berhasil diperbarui.";
  if (path.includes("/indicators") && path.includes("/observations"))
    return "Observasi indikator berhasil diproses.";
  if (path.includes("/indicators")) return "Indikator berhasil disimpan.";
  if (path.includes("/datasets") && path.includes("/workflow"))
    return "Tindakan pada dataset berhasil diproses.";
  if (path.includes("/datasets")) return "Dataset berhasil disimpan.";
  if (path.includes("/sdi/registry") || path.endsWith("/sdi-registry"))
    return "Referensi SDI berhasil diperbarui.";
  if (path.includes("/integrations/preflight"))
    return "Pemeriksaan integrasi selesai.";
  if (path.includes("/uploads")) return "Unggahan berhasil diproses.";
  return "Permintaan berhasil diproses.";
}

function mutationFailureMessage(payload, status) {
  if (status === 422 || payload?.error === "validation_failed") {
    return "Ada isian yang perlu diperbaiki. Detail ditampilkan di formulir.";
  }
  if (status === 401) {
    return "Akses belum dapat diverifikasi. Muat ulang halaman; masuk kembali hanya jika masalah berlanjut.";
  }
  if (status === 403)
    return "Akun Anda tidak memiliki izin untuk tindakan ini.";
  if (status === 409)
    return "Data berubah atau berbenturan dengan proses lain. Periksa data terbaru sebelum mencoba lagi.";
  if (status === 429)
    return "Permintaan terlalu cepat. Tunggu sebentar, lalu periksa status data sebelum mengulang.";
  if (status >= 500) {
    const requestId = payload?.request_id;
    return `Layanan belum memberi konfirmasi. Periksa status data sebelum mengulangi tindakan.${requestId ? ` Kode laporan: ${requestId}.` : ""}`;
  }
  return "Permintaan belum berhasil. Periksa pesan pada formulir.";
}
