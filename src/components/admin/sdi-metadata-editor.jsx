"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { SdiMetadataFields } from "@/components/admin/sdi-metadata-fields";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { apiTransportFailureMessage } from "@/lib/api/error-message";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { readSdiMetadataFormFields } from "@/lib/sdi/form-metadata";

const FRIENDLY_ERRORS = {
  forbidden: "Akun ini belum memiliki akses untuk mengubah metadata dataset.",
  unauthorized: "Sesi masuk telah berakhir. Masuk kembali lalu coba lagi.",
  not_found: "Dataset tidak ditemukan atau tidak lagi tersedia untuk akun ini.",
  conflict:
    "Versi dataset berubah. Muat ulang halaman sebelum menyimpan kembali.",
  validation_failed:
    "Tahun, klasifikasi, atau salah satu isian metadata belum sesuai. Periksa kembali data yang dimasukkan.",
  sdi_standard_not_verified_or_active:
    "Standar yang dipilih sudah tidak aktif atau belum diverifikasi. Pilih versi aktif dari registri standar.",
  sdi_reference_system_not_verified_or_active:
    "Sistem kode yang dipilih sudah tidak aktif atau belum diverifikasi. Pilih sistem kode aktif dari registri.",
  service_unavailable:
    "Layanan data sedang mengalami gangguan. Periksa halaman dataset sebelum mencoba kembali.",
};

export function SdiMetadataEditor({
  datasetId,
  version,
  initial = {},
  datasetTitle,
  versionLabel,
  standards = [],
  referenceSystems = [],
}) {
  const router = useRouter();
  const { pending, begin, finish, markUncertain } = useSubmissionLock();
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (uncertain || !begin()) return;
    setError("");
    setSuccess(false);
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const metadata = readSdiMetadataFormFields(raw);
    if (
      metadata.available_year !== null &&
      (!Number.isInteger(metadata.available_year) ||
        metadata.available_year < 1900 ||
        metadata.available_year > 2200)
    ) {
      setError("Isi Tahun Tersedia dengan empat angka, misalnya 2025.");
      finish();
      document.getElementById("sdi_available_year")?.focus();
      return;
    }
    if (
      metadata.presentation_classification.some(
        (value) => value.length > 160,
      ) ||
      metadata.presentation_classification.length > 100
    ) {
      setError(
        "Klasifikasi Penyajian dapat berisi maksimal 100 item; tiap item maksimal 160 karakter.",
      );
      finish();
      document.getElementById("sdi_presentation_classification")?.focus();
      return;
    }
    try {
      const response = await fetch(
        `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/sdi-metadata`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            dataset_version: version,
            sdi_metadata: metadata,
          }),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        const code = result.error || "service_unavailable";
        setError(
          FRIENDLY_ERRORS[code] ||
            "Metadata belum tersimpan. Periksa kolom yang ditandai dan pastikan akun Anda memiliki akses.",
        );
        if (
          response.status >= 500 ||
          [
            "service_unavailable",
            "authentication_unavailable",
            "authorization_unavailable",
          ].includes(code)
        ) {
          setUncertain(true);
          markUncertain();
        }
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch (requestError) {
      setError(
        apiTransportFailureMessage(
          requestError,
          "Koneksi terputus sebelum perubahan terkonfirmasi. Periksa detail dataset sebelum mencoba lagi.",
        ),
      );
      setUncertain(true);
      markUncertain();
    } finally {
      finish();
    }
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={pending}
      className="w-full portal-form-card space-y-5 p-5 sm:p-8"
    >
      <div className="rounded-xl border border-[#d6e4ed] bg-[#f4f8fb] p-4">
        <p className="font-semibold text-[#193d59]">{datasetTitle}</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Anda sedang mengubah metadata untuk {versionLabel}. Jika versi ini
          sudah terbit, perubahan langsung memperbarui informasi katalog dan
          tercatat dalam riwayat. Jika ada draf versi baru, yang diperbarui
          hanya metadata draf; versi terbit tetap sama sampai draf tersebut
          diterbitkan.
        </p>
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"
        >
          <p className="font-semibold">Metadata belum tersimpan</p>
          <p className="mt-1">{error}</p>
          {uncertain ? (
            <p className="mt-1">
              Periksa halaman dataset sebelum mengirim ulang untuk mencegah
              perubahan ganda.
            </p>
          ) : null}
        </div>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950"
        >
          Metadata disimpan. Kesiapan pertukaran data akan diperiksa kembali
          berdasarkan metadata dan berkas pada versi yang sedang diterbitkan.
        </p>
      ) : null}
      <SdiMetadataFields
        initial={initial}
        standards={standards}
        referenceSystems={referenceSystems}
      />
      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <PendingActionButton
          type="submit"
          pending={pending}
          pendingText="Menyimpan metadata…"
          disabled={uncertain}
          className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          <span className="inline-flex items-center gap-2">
            <Save size={16} aria-hidden="true" />
            Simpan metadata pertukaran
          </span>
        </PendingActionButton>
        <p className="text-xs leading-5 text-muted">
          Simpan metadata sumber sesuai registri resmi. Menyimpan metadata di
          sini belum berarti SPLP/SDI sudah menerima katalog. Penerimaan perlu
          dikonfirmasi melalui pengujian dengan sistem tujuan.
        </p>
      </div>
    </form>
  );
}
