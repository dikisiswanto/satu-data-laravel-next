"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Database, Plus, Upload } from "lucide-react";
import { DatePicker } from "@/components/admin/date-picker";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { readApiMutationResponse } from "@/lib/api/client-response";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";

const statusLabels = {
  draft: "Draf",
  published: "Terbit",
  archived: "Versi sebelumnya",
};

export function IndicatorObservationManager({
  indicator,
  observations = [],
  canEdit = false,
  canPublish = false,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    const raw = Object.fromEntries(new FormData(form).entries());
    if (raw.value_numeric.trim() && raw.value_text.trim()) {
      setError(
        "Pilih salah satu jenis nilai: angka atau teks. Isi salah satu kolom saja.",
      );
      setBusy(false);
      return;
    }
    if (!raw.value_numeric.trim() && !raw.value_text.trim()) {
      setError("Masukkan nilai indikator sebelum menyimpan observasi.");
      setBusy(false);
      return;
    }
    if (
      raw.period_start &&
      raw.period_end &&
      raw.period_end < raw.period_start
    ) {
      setError(
        "Tanggal akhir periode harus sama dengan atau setelah tanggal awal.",
      );
      setBusy(false);
      return;
    }
    const payload = {
      period_label: raw.period_label.trim(),
      period_start: raw.period_start || null,
      period_end: raw.period_end || null,
      geographic_code: raw.geographic_code.trim() || null,
      geographic_name: raw.geographic_name.trim() || null,
      dimension_key: raw.dimension_key.trim() || "overall",
      value_numeric: raw.value_numeric.trim()
        ? Number(raw.value_numeric)
        : null,
      value_text: raw.value_text.trim() || null,
      unit: raw.unit.trim(),
      source_name: raw.source_name.trim(),
      source_url: raw.source_url.trim() || null,
    };
    try {
      const response = await fetch(
        `/api/v1/portal/indicators/${encodeURIComponent(indicator.id)}/observations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        setError(
          result.error === "indicator_must_be_published_first"
            ? "Terbitkan indikator ini terlebih dahulu. Setelah itu, nilai observasinya dapat diterbitkan."
            : result.error === "forbidden"
              ? "Akun Anda belum memiliki akses untuk menambahkan nilai pada indikator ini. Jika akses diperlukan, hubungi administrator portal."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Nilai indikator belum tersimpan.",
                ),
        );
        return;
      }
      form.reset();
      setPeriodStart("");
      setPeriodEnd("");
      setNotice(
        "Observasi tersimpan sebagai draf. Nilai belum ditampilkan ke publik sampai diterbitkan.",
      );
      router.refresh();
    } catch (cause) {
      setError(
        apiTransportFailureMessage(
          cause,
          "Koneksi terputus sebelum penyimpanan terkonfirmasi. Periksa daftar nilai indikator sebelum mencoba menyimpan lagi agar tidak membuat duplikat.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function publish(id) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/portal/indicators/${encodeURIComponent(indicator.id)}/observations/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action: "publish" }),
        },
      );
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        setError(
          result.error === "indicator_must_be_published_first"
            ? "Terbitkan indikator terlebih dahulu, lalu terbitkan nilainya."
            : result.error === "forbidden"
              ? "Akun Anda belum memiliki akses untuk menerbitkan nilai indikator ini."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Nilai indikator belum dapat diterbitkan.",
                ),
        );
        return;
      }
      setNotice(
        "Nilai indikator sudah diterbitkan. Jika ada nilai lain dengan periode, wilayah, dan dimensi yang sama, nilai terbaru menjadi nilai yang ditampilkan. Riwayat sebelumnya tetap tersedia.",
      );
      router.refresh();
    } catch (cause) {
      setError(apiTransportFailureMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      ) : null}
      {canEdit ? (
        <form
          onSubmit={save}
          aria-busy={busy}
          className="w-full portal-form-card max-w-none space-y-5 p-5 sm:p-7"
        >
          <div className="flex items-start gap-3">
            <Plus
              size={21}
              className="mt-0.5 text-primary"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-semibold">Tambah observasi</h2>
              <p className="mt-1 text-sm leading-5 text-muted">
                Satu observasi mencatat satu nilai untuk periode dan wilayah
                atau dimensi tertentu. Nilai yang disimpan sebagai draf belum
                terlihat oleh publik sampai diterbitkan.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="period_label"
              label="Label periode"
              placeholder="Contoh: Tahun 2025 atau Triwulan I 2026"
              required
            />
            <Field
              name="dimension_key"
              label="Dimensi data"
              placeholder="overall atau jenis-kelamin:perempuan"
              defaultValue="overall"
              required
            />
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="period_start"
              >
                Tanggal awal periode
              </label>
              <DatePicker
                id="period_start"
                name="period_start"
                value={periodStart}
                onValueChange={setPeriodStart}
                placeholder="Pilih tanggal awal"
              />
              <p className="mt-1 text-xs text-muted">
                Kosongkan untuk periode tanpa tanggal awal yang spesifik.
              </p>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="period_end"
              >
                Tanggal akhir periode
              </label>
              <DatePicker
                id="period_end"
                name="period_end"
                value={periodEnd}
                onValueChange={setPeriodEnd}
                min={periodStart || undefined}
                placeholder="Pilih tanggal akhir"
              />
              <p className="mt-1 text-xs text-muted">
                Tanggal akhir tidak boleh lebih awal dari tanggal awal.
              </p>
            </div>
            <Field
              name="geographic_code"
              label="Kode wilayah (opsional)"
              placeholder="Kode resmi sesuai referensi yang dipakai"
            />
            <Field
              name="geographic_name"
              label="Nama wilayah (opsional)"
              placeholder={`${siteConfig.regionName} atau kecamatan terkait`}
            />
            <Field
              name="value_numeric"
              label="Nilai angka"
              placeholder="Masukkan angka, mis. 1250"
              type="number"
              step="any"
            />
            <Field
              name="value_text"
              label="Nilai teks (alternatif)"
              placeholder="Gunakan hanya untuk nilai nonnumerik"
            />
            <Field
              name="unit"
              label="Satuan"
              defaultValue={indicator.unit || ""}
              placeholder="Orang, persen, ton"
              required
            />
            <Field
              name="source_name"
              label="Sumber angka"
              defaultValue={indicator.source_name || ""}
              placeholder="Nama publikasi atau instansi sumber"
              required
            />
            <div className="sm:col-span-2">
              <Field
                name="source_url"
                label="Tautan sumber (opsional)"
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <PendingActionButton
              type="submit"
              pending={busy}
              pendingText="Menyimpan observasi…"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Database size={16} aria-hidden="true" />
              Simpan sebagai draf
            </PendingActionButton>
            <span className="text-xs leading-5 text-muted">
              Nilai angka dan nilai teks tidak boleh diisi bersamaan.
            </span>
          </div>
        </form>
      ) : null}

      <section className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Riwayat observasi</h2>
            <p className="mt-1 text-sm text-muted">
              Versi sebelumnya tetap tersimpan untuk jejak audit. Hanya
              observasi berstatus terbit dan aktif yang disajikan oleh API
              publik.
            </p>
          </div>
          <span className="portal-result-count">
            {observations.length} catatan
          </span>
        </div>
        {observations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Periode / wilayah</th>
                  <th className="p-3">Nilai</th>
                  <th className="p-3">Sumber</th>
                  <th className="p-3">Status / revisi</th>
                  <th className="p-3">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr
                    key={observation.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="p-3">
                      <span className="font-medium">
                        {observation.period_label}
                      </span>
                      <span className="portal-table-subtext block">
                        {observation.geographic_name || "Semua wilayah"}
                        {observation.geographic_code
                          ? ` · ${observation.geographic_code}`
                          : ""}
                      </span>
                      {observation.period_start || observation.period_end ? (
                        <span className="portal-table-subtext block">
                          {observation.period_start || "—"} –{" "}
                          {observation.period_end || "—"}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {observation.value_numeric !== null &&
                      observation.value_numeric !== undefined
                        ? Number(observation.value_numeric).toLocaleString(
                            "id-ID",
                            { maximumFractionDigits: 6 },
                          )
                        : observation.value_text}
                      <span className="portal-table-subtext block">
                        {observation.unit}
                      </span>
                    </td>
                    <td className="p-3">
                      {observation.source_name || "Belum ada sumber"}
                      {observation.source_url ? (
                        <a
                          className="portal-table-subtext block text-primary underline"
                          href={observation.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Buka sumber
                        </a>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${observation.status === "published" ? "bg-emerald-50 text-emerald-800" : observation.status === "draft" ? "bg-amber-50 text-amber-800" : "bg-surface-secondary text-muted"}`}
                      >
                        {statusLabels[observation.status] || observation.status}
                      </span>
                      <span className="portal-table-subtext block">
                        Revisi {observation.revision_no}
                        {observation.is_current
                          ? " · ditampilkan ke publik"
                          : ""}
                      </span>
                    </td>
                    <td className="p-3">
                      {observation.status === "draft" && canPublish ? (
                        <button
                          type="button"
                          disabled={
                            busy ||
                            indicator.status !== "published" ||
                            !indicator.published_at
                          }
                          title={
                            indicator.status !== "published" ||
                            !indicator.published_at
                              ? "Terbitkan definisi indikator terlebih dahulu."
                              : "Terbitkan nilai ini ke tren statistik publik."
                          }
                          onClick={() => publish(observation.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          <Upload size={13} aria-hidden="true" />
                          Terbitkan
                        </button>
                      ) : observation.status === "published" &&
                        observation.is_current ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <Clock3 size={13} aria-hidden="true" />
                          Riwayat
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted">
            Belum ada observasi tersimpan. Tambahkan nilai dengan periode,
            satuan, dan sumber yang jelas.
          </p>
        )}
      </section>
      {indicator.status !== "published" || !indicator.published_at ? (
        <p className="flex items-start gap-2 text-sm leading-6 text-muted">
          <Clock3 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Definisi indikator belum diterbitkan. Anda dapat menyiapkan nilainya
          sebagai draf, tetapi nilai baru bisa dipublikasikan setelah definisi
          indikator diterbitkan.
        </p>
      ) : null}
      <Link
        href="/portal/statistik"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
        prefetch={false}
      >
        Kembali ke indikator statistik
      </Link>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  required = false,
  defaultValue = "",
  step,
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        maxLength={type === "url" ? 2048 : 500}
        className="field h-11 w-full"
      />
      <p className="mt-1 text-xs leading-5 text-muted">
        {type === "url"
          ? "Gunakan URL HTTP/HTTPS yang bisa ditinjau."
          : placeholder}
      </p>
    </div>
  );
}
