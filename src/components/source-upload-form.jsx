"use client";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { portalQueryKeys } from "@/lib/api/query-keys";
import Link from "next/link";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { readApiMutationResponse } from "@/lib/api/client-response";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
export function SourceUploadForm({
  datasetId,
  versionNumber = null,
  isNewVersion = false,
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const {
    pending: busy,
    begin: beginSubmission,
    finish: finishSubmission,
    markUncertain,
  } = useSubmissionLock();
  const [message, setMessage] = useState(null);
  const [statusUnknown, setStatusUnknown] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!file || statusUnknown) return;
    const formElement = event.currentTarget;
    if (!beginSubmission()) return;
    setMessage(null);
    try {
      let prepareResponse;
      let prepared;
      const retryablePrepareErrors = new Set([
        "authentication_unavailable",
        "authorization_unavailable",
        "service_unavailable",
      ]);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        prepareResponse = await fetch(
          `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/uploads`,
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              action: "prepare",
              filename: file.name,
              size: file.size,
              mimeType: file.type,
            }),
          },
        );
        prepared = await readApiMutationResponse(prepareResponse, {
          notify: !prepareResponse.ok,
        });
        if (
          attempt > 0 ||
          prepareResponse.status !== 503 ||
          !retryablePrepareErrors.has(prepared.error)
        )
          break;
        // This stage only requests a signed URL; no source bytes or registration
        // are sent yet, so one short retry cannot duplicate a submitted dataset.
        await new Promise((resolve) => setTimeout(resolve, 450));
      }
      if (!prepareResponse.ok) {
        setMessage({
          type: "error",
          text:
            {
              file_type_not_allowed:
                "Format ini belum didukung. Pilih berkas CSV, XLSX, JSON, atau GeoJSON.",
              upload_signing_unavailable:
                "Fitur unggah sedang mengalami kendala. Coba lagi beberapa saat lagi.",
              authentication_unavailable:
                "Kami belum dapat memeriksa sesi akun Anda. Sesi tetap aman; coba lagi beberapa saat lagi.",
              authorization_unavailable:
                "Kami belum dapat memeriksa hak akses akun Anda. Coba lagi beberapa saat lagi.",
              file_size_invalid:
                "Pilih berkas yang ukurannya lebih dari 0 dan tidak melebihi 25 MiB.",
              rate_limited:
                "Unggahan dilakukan terlalu sering. Tunggu beberapa menit, lalu coba lagi.",
              rate_limit_unavailable:
                "Kami belum dapat memeriksa batas unggahan. Coba lagi beberapa saat lagi.",
              unauthorized:
                "Sesi atau akses akun belum dapat diverifikasi. Muat ulang halaman; masuk kembali jika masalah berlanjut.",
              account_inactive:
                "Akun ini sedang dinonaktifkan. Hubungi administrator portal jika Anda membutuhkan akses.",
              forbidden:
                "Akun Anda belum memiliki akses untuk mengunggah berkas ke dataset ini. Hubungi administrator jika akses ini seharusnya tersedia.",
              dataset_not_found:
                "Dataset tidak ditemukan atau akses akun Anda sudah berubah. Periksa daftar dataset atau hubungi administrator portal.",
              dataset_lookup_unavailable:
                "Kami belum dapat memeriksa dataset. Coba lagi beberapa saat lagi.",
              dataset_not_editable:
                "Berkas hanya dapat diunggah ke dataset berstatus Draf atau ke draf versi yang masih terbuka.",
              conversion_already_pending:
                "Berkas untuk versi ini masih diproses. Tunggu sampai proses selesai sebelum mencoba lagi.",
              source_already_processed:
                "Berkas yang sama sudah selesai diproses untuk versi ini. Anda dapat mengajukan versi tersebut untuk diperiksa.",
            }[prepared.error] ||
            apiErrorMessage(
              prepared.error,
              prepareResponse.status,
              "Unggahan belum dapat dimulai. Periksa koneksi dan akses akun Anda, lalu coba lagi.",
            ),
        });
        return;
      }
      if (
        typeof prepared.path !== "string" ||
        !prepared.path ||
        typeof prepared.token !== "string" ||
        !prepared.token ||
        typeof prepared.mimeType !== "string"
      ) {
        setMessage({
          type: "error",
          text: "Layanan unggah belum mengonfirmasi sesi yang valid. Muat ulang halaman sebelum mencoba kembali.",
        });
        return;
      }
      try {
        const uploadBody = new FormData();
        uploadBody.set("file", file, file.name);
        const uploadResponse = await fetch(prepared.uploadUrl, {
          method: "POST",
          credentials: "omit",
          headers: {
            Accept: "application/json",
            "X-Upload-Token": prepared.token,
          },
          body: uploadBody,
        });
        if (!uploadResponse.ok) {
          const uploadResult = await readApiMutationResponse(uploadResponse, {
            notify: true,
          });
          throw new Error(uploadResult.error || "storage_upload_failed");
        }
      } catch {
        let cleaned = false;
        try {
          const cleanupResponse = await fetch(
            `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/uploads`,
            {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ action: "cleanup", path: prepared.path }),
            },
          );
          cleaned = cleanupResponse.ok;
        } catch {
          cleaned = false;
        }
        if (!cleaned) {
          setStatusUnknown(true);
          markUncertain();
        }
        setMessage({
          type: "error",
          text: cleaned
            ? "Unggahan terhenti dan berkas sementara sudah dibersihkan. Periksa koneksi, lalu coba lagi."
            : "Kami belum dapat memastikan status unggahan dan membersihkan berkas sementara. Periksa detail dataset sebelum mencoba mengunggah lagi.",
        });
        return;
      }
      const checksumBuffer = await crypto.subtle.digest(
        "SHA-256",
        await file.arrayBuffer(),
      );
      const checksumSha256 = Array.from(
        new Uint8Array(checksumBuffer),
        (byte) => byte.toString(16).padStart(2, "0"),
      ).join("");
      const completeResponse = await fetch(
        `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/uploads`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            action: "complete",
            path: prepared.path,
            filename: file.name,
            size: file.size,
            mimeType: prepared.mimeType,
            checksumSha256,
          }),
        },
      );
      const result = await readApiMutationResponse(completeResponse);
      if (!completeResponse.ok) {
        // A server/proxy 5xx can be returned after a database commit. Do not
        // delete a possibly registered object or permit a duplicate submission.
        const explicitRegistrationFailure =
          result.error === "source_registration_failed";
        if (completeResponse.status >= 500 && !explicitRegistrationFailure) {
          setStatusUnknown(true);
          markUncertain();
          setMessage({
            type: "error",
            text: "Koneksi layanan terputus setelah berkas dikirim. Kami belum dapat memastikan apakah berkas sudah terdaftar. Periksa halaman dataset sebelum mencoba lagi.",
          });
          return;
        }
        // Known, structured failures are safe to clean because registration did
        // not complete for these error contracts.
        try {
          const cleanupResponse = await fetch(
            `/api/v1/portal/datasets/${encodeURIComponent(datasetId)}/uploads`,
            {
              method: "POST",
              credentials: "same-origin",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ action: "cleanup", path: prepared.path }),
            },
          );
          if (!cleanupResponse.ok)
            console.error(
              "source_upload_cleanup_failed",
              cleanupResponse.status,
            );
        } catch (cleanupError) {
          console.error(
            "source_upload_cleanup_failed",
            cleanupError?.message || "unknown",
          );
        }
        setMessage({
          type: "error",
          text:
            {
              checksum_invalid:
                "Berkas yang dikirim tidak cocok dengan berkas yang dipilih. Pilih kembali berkas sumber, lalu coba lagi.",
              rate_limited:
                "Unggahan dilakukan terlalu sering. Tunggu beberapa menit, lalu coba lagi.",
              rate_limit_unavailable:
                "Kami belum dapat memeriksa batas unggahan. Coba lagi beberapa saat lagi.",
              file_size_invalid:
                "Ukuran berkas berubah saat diunggah. Pilih ulang berkas sumber, lalu coba lagi.",
              upload_path_invalid:
                "Lokasi berkas sementara tidak dapat digunakan. Muat ulang halaman dan coba unggah lagi.",
              forbidden:
                "Akun Anda belum memiliki akses untuk mendaftarkan berkas ini.",
              dataset_not_editable:
                "Dataset atau draf versi ini sudah berubah dan tidak dapat menerima unggahan saat ini. Muat ulang halaman untuk melihat status terbaru.",
              conversion_already_pending:
                "Berkas untuk versi ini masih diproses. Tunggu sampai proses selesai sebelum mencoba lagi.",
              source_already_processed:
                "Berkas yang sama sudah diproses untuk versi ini. Ajukan versi tersebut untuk diperiksa.",
              source_registration_failed:
                "Berkas sudah tersimpan, tetapi kami belum dapat memastikan apakah proses pendaftarannya selesai. Periksa detail dataset sebelum mencoba lagi agar tidak membuat berkas ganda.",
            }[result.error] ||
            apiErrorMessage(
              result.error,
              completeResponse.status,
              "Unggahan belum tercatat. Periksa halaman dataset terlebih dahulu; jika berkas belum muncul, coba unggah kembali.",
            ),
        });
        return;
      }
      if (
        result.status !== "queued" ||
        typeof result.resourceId !== "string" ||
        !result.resourceId
      ) {
        setMessage({
          type: "error",
          text: "Portal belum mengonfirmasi apakah berkas sudah terdaftar. Periksa detail dataset sebelum mengunggahnya lagi agar tidak membuat duplikat.",
        });
        setStatusUnknown(true);
        markUncertain();
        return;
      }
      setMessage({
        type: "success",
        text: isNewVersion
          ? `Berkas untuk versi ${versionNumber || "baru"} sudah diterima dan menunggu diproses. Versi yang sedang terbit tetap tersedia.`
          : "Berkas sudah diterima dan menunggu diproses. Dataset baru tampil untuk publik setelah pemeriksaan selesai dan publikasi disetujui.",
      });
      setFile(null);
      formElement.reset();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: portalQueryKeys.dataset(datasetId),
        }),
        queryClient.invalidateQueries({ queryKey: portalQueryKeys.datasets() }),
      ]);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: apiTransportFailureMessage(
          error,
          "Koneksi terputus sebelum pendaftaran berkas terkonfirmasi. Periksa detail dataset sebelum mencoba lagi agar tidak membuat duplikat.",
        ),
      });
      setStatusUnknown(true);
      markUncertain();
    } finally {
      finishSubmission();
    }
  }
  return (
    <section className="mt-8 border-t pt-6">
      <h3 className="font-semibold">
        {isNewVersion && versionNumber
          ? `Unggah sumber versi ${versionNumber}`
          : "Unggah berkas sumber"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Ukuran berkas maksimal 25 MiB. Berkas sumber disimpan secara privat,
        lalu diperiksa dan disiapkan untuk digunakan setelah unggahan selesai.
      </p>
      {versionNumber ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {isNewVersion
            ? `Berkas ini akan menjadi kandidat versi ${versionNumber}. Versi publik saat ini tetap tersedia sampai versi baru lolos validasi dan dipublikasikan.`
            : `Berkas ini menjadi sumber untuk versi ${versionNumber}.`}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a
          className="font-medium text-primary underline underline-offset-4"
          href="/templates/data-tabular.csv"
          download
        >
          Template CSV
        </a>
        <a
          className="font-medium text-primary underline underline-offset-4"
          href="/templates/data-spasial.geojson"
          download
        >
          Template GeoJSON
        </a>
        <a
          className="font-medium text-primary underline underline-offset-4"
          href="/templates/metadata-dataset.json"
          download
        >
          Template metadata JSON
        </a>
      </div>
      <form onSubmit={submit} aria-busy={busy} className="mt-4 space-y-3">
        <label htmlFor="source-file" className="block text-sm font-medium">
          Pilih file CSV, XLSX, JSON, atau GeoJSON
        </label>
        <input
          id="source-file"
          name="file"
          type="file"
          disabled={busy || statusUnknown}
          accept=".csv,.xlsx,.json,.geojson,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/geo+json"
          required
          aria-describedby="source-file-help"
          onInvalid={(event) =>
            event.currentTarget.setCustomValidity(
              "Pilih satu berkas CSV, XLSX, JSON, atau GeoJSON dengan ukuran maksimal 25 MiB.",
            )
          }
          onChange={(event) => {
            event.currentTarget.setCustomValidity("");
            setFile(event.target.files?.[0] || null);
          }}
          className="block w-full rounded-control border bg-white p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary disabled:opacity-50"
        />
        <FieldGuidance
          name="filename"
          id="source-file-help"
          text="Format yang diterima: CSV, XLSX, JSON, atau GeoJSON; ukuran maksimal 25 MiB. Pilih satu berkas sumber. Untuk data spasial, pastikan geometri, sistem koordinat, dan properti sudah benar."
        />
        <PendingActionButton
          type="submit"
          pending={busy}
          pendingText="Mengunggah dan memvalidasi…"
          disabled={!file || statusUnknown}
          className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
        >
          <UploadCloud size={16} aria-hidden="true" /> Unggah dan validasi
        </PendingActionButton>
        {message ? (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm leading-6 ${message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
          >
            {message.type === "error" ? (
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {message.text}
            {statusUnknown ? (
              <Link
                href={`/portal/dataset/${datasetId}`}
                className="ml-1 inline-flex font-semibold underline underline-offset-4"
              >
                Periksa status dataset
              </Link>
            ) : null}
          </p>
        ) : null}
      </form>
    </section>
  );
}
