"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  LoaderCircle,
  Play,
  TriangleAlert,
} from "lucide-react";
import { readApiMutationResponse } from "@/lib/api/client-response";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";

const TARGETS = [
  { value: "sdi_flat", label: "JSON untuk konektor SDI" },
  { value: "dcat_jsonld", label: "Katalog berformat DCAT/JSON-LD" },
  { value: "geoportal", label: "Daftar data untuk GeoPortal" },
];
export function SdiPreflightButton() {
  const router = useRouter();
  const [target, setTarget] = useState("sdi_flat");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  async function run() {
    if (busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/v1/portal/integrations/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const payload = await readApiMutationResponse(response);
      if (!response.ok) {
        setError(
          payload.error === "forbidden"
            ? "Hanya administrator data global yang dapat menjalankan pemeriksaan ini. Jika Anda membutuhkan akses, hubungi administrator portal."
            : apiErrorMessage(
                payload.error,
                response.status,
                "Pemeriksaan belum selesai. Tidak ada data yang dikirim ke sistem tujuan; Anda dapat mencoba kembali.",
              ),
        );
        return;
      }
      setResult(payload.data);
      router.refresh();
    } catch (cause) {
      setError(
        apiTransportFailureMessage(
          cause,
          "Koneksi terputus sebelum pemeriksaan terkonfirmasi. Buka riwayat pemeriksaan untuk melihat apakah hasilnya sudah tercatat.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  const summary = result?.summary;
  return (
    <div className="rounded-2xl border border-[#cbdde9] bg-[#f4f8fb] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Activity
          size={21}
          className="mt-0.5 shrink-0 text-[#285e85]"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#153d5b]">
            Periksa kesiapan katalog
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#45677f]">
            Pemeriksaan ini menilai kelengkapan metadata dan berkas yang sedang
            diterbitkan, lalu menyimpan laporannya. Pemeriksaan tidak mengirim
            data ke SPLP.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="sdi-preflight-target">
              Profil yang diperiksa
            </label>
            <select
              id="sdi-preflight-target"
              className="field h-11 min-w-0 flex-1 bg-white"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              disabled={busy}
            >
              {TARGETS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={run}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? (
                <LoaderCircle
                  className="animate-spin"
                  size={16}
                  aria-hidden="true"
                />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              {busy ? "Memeriksa…" : "Periksa sekarang"}
            </button>
          </div>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {summary ? (
        <div
          className="mt-4 rounded-xl border border-line bg-white p-4"
          role="status"
        >
          <div className="flex items-center gap-2">
            {result.status === "passed" ? (
              <CheckCircle2
                className="text-emerald-700"
                size={18}
                aria-hidden="true"
              />
            ) : (
              <TriangleAlert
                className="text-amber-700"
                size={18}
                aria-hidden="true"
              />
            )}
            <p className="font-semibold">
              {result.status === "passed"
                ? "Pemeriksaan lokal selesai tanpa temuan"
                : "Ada beberapa hal yang perlu ditinjau"}
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <ResultMetric
              label="Dataset terbit"
              value={summary.published_datasets}
            />
            <ResultMetric
              label="Siap untuk format ini"
              value={summary.eligible_count}
            />
            <ResultMetric
              label="Dataset yang perlu dilengkapi"
              value={summary.excluded_count}
            />
          </div>
          {summary.note ? (
            <p className="mt-3 text-xs leading-5 text-muted">{summary.note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
function ResultMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-surface-secondary p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {Number(value || 0).toLocaleString("id-ID")}
      </p>
    </div>
  );
}
