"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, Database, Plus, ShieldCheck } from "lucide-react";
import { PendingActionButton } from "@/components/ui/pending-action-button";
import { readApiMutationResponse } from "@/lib/api/client-response";
import {
  apiErrorMessage,
  apiTransportFailureMessage,
} from "@/lib/api/error-message";

const STATUS_LABELS = {
  draft: "Draf — belum diverifikasi",
  verified: "Terverifikasi",
  deprecated: "Tidak berlaku lagi",
};

export function SdiRegistryManager({
  standards = [],
  systems = [],
  entries = [],
  canManage = false,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event, kind) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setSuccess("");
    const raw = Object.fromEntries(new FormData(form).entries());
    const payload = { kind, ...raw };
    for (const key of ["valid_from", "valid_until"])
      payload[key] = payload[key] || null;
    for (const key of [
      "source_url",
      "evidence_url",
      "source_reference",
      "parent_code",
      "definition",
    ])
      payload[key] = payload[key] || null;
    if (kind === "standard")
      payload.standard_type = raw.standard_type || "statistical";
    try {
      const response = await fetch("/api/v1/portal/sdi/registry/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        setError(
          apiErrorMessage(
            result.error,
            response.status,
            "Referensi belum tersimpan. Periksa kolom yang ditandai dan akses akun Anda.",
          ),
        );
        return;
      }
      form.reset();
      setSuccess(
        "Disimpan sebagai draf. Verifikasi hanya setelah sumber dan dokumen resmi diperiksa.",
      );
      router.refresh();
    } catch (cause) {
      setError(
        apiTransportFailureMessage(
          cause,
          "Koneksi terputus sebelum penyimpanan terkonfirmasi. Periksa daftar referensi sebelum mencoba lagi.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function review(kind, id, action) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/v1/portal/sdi/registry/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ kind, id, action }),
      });
      const result = await readApiMutationResponse(response);
      if (!response.ok) {
        const message =
          result.error === "registry_evidence_required"
            ? "Lengkapi URL sumber dan bukti resmi sebelum verifikasi."
            : result.error === "registry_validity_period_inactive"
              ? "Masa berlaku catatan belum dimulai atau sudah berakhir."
              : apiErrorMessage(
                  result.error,
                  response.status,
                  "Status referensi belum berubah. Coba lagi, lalu periksa status terbaru.",
                );
        setError(message);
        return;
      }
      setSuccess(
        action === "verify"
          ? "Catatan registri telah ditandai terverifikasi."
          : "Catatan ditandai tidak berlaku lagi.",
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
      {success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {success}
        </p>
      ) : null}
      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <form
            onSubmit={(event) => submit(event, "standard")}
            className="w-full portal-form-card space-y-4 p-4 sm:p-5"
            aria-busy={busy}
          >
            <div className="flex items-start gap-3">
              <BookOpenCheck
                size={20}
                className="mt-0.5 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">Daftarkan standar</h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  Tambahkan standar yang sumbernya sudah ditemukan. Catatan baru
                  selalu disimpan sebagai draf.
                </p>
              </div>
            </div>
            <Field
              id="standard-code"
              name="standard_code"
              label="Kode standar"
              placeholder="Kode persis dari registri resmi"
              required
            />
            <Field
              id="standard-title"
              name="title"
              label="Nama standar"
              placeholder="Nama resmi standar"
              required
            />
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="standard_type"
              >
                Jenis
              </label>
              <select
                className="field h-11 w-full"
                name="standard_type"
                id="standard_type"
                defaultValue="statistical"
              >
                <option value="statistical">Statistik</option>
                <option value="geospatial">Geospasial</option>
                <option value="metadata">Metadata</option>
                <option value="interoperability">Interoperabilitas</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <Field
              id="standard-definition"
              name="definition"
              label="Definisi atau ruang lingkup"
              placeholder="Ringkasan yang merujuk naskah resmi"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="standard-authority"
                name="authority_name"
                label="Instansi penerbit"
                placeholder="Instansi berwenang"
                required
              />
              <Field
                id="standard-version"
                name="version_label"
                label="Versi"
                placeholder="Versi yang tertera di sumber"
                required
              />
            </div>
            <Field
              id="standard-source-url"
              name="source_url"
              label="URL sumber resmi"
              placeholder="https://..."
              type="url"
            />
            <Field
              id="standard-evidence-url"
              name="evidence_url"
              label="URL dokumen bukti"
              placeholder="https://..."
              type="url"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="standard-valid-from"
                name="valid_from"
                label="Berlaku mulai"
                type="date"
              />
              <Field
                id="standard-valid-until"
                name="valid_until"
                label="Berlaku sampai"
                type="date"
              />
            </div>
            <p className="text-xs leading-5 text-muted">
              Tambahkan tautan ke sumber resmi dan dokumen pendukung sebelum
              mengajukan verifikasi.
            </p>
            <PendingActionButton
              type="submit"
              pending={busy}
              pendingText="Menyimpan…"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={16} aria-hidden="true" />
              Simpan sebagai draf
            </PendingActionButton>
          </form>
          <form
            onSubmit={(event) => submit(event, "reference_system")}
            className="w-full portal-form-card space-y-4 p-4 sm:p-5"
            aria-busy={busy}
          >
            <div className="flex items-start gap-3">
              <Database
                size={20}
                className="mt-0.5 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">
                  Daftarkan sistem kode referensi
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  Gunakan untuk mencatat kode wilayah, klasifikasi, satuan, atau
                  referensi resmi lain. Salin kode sesuai sumbernya.
                </p>
              </div>
            </div>
            <Field
              id="reference-system-code"
              name="system_code"
              label="Kode sistem referensi"
              placeholder="Kode sistem sesuai sumber"
              required
            />
            <Field
              id="reference-system-title"
              name="title"
              label="Nama sistem referensi"
              placeholder="Contoh: daftar kode wilayah administratif"
              required
            />
            <Field
              id="reference-system-description"
              name="description"
              label="Cakupan dan penjelasan"
              placeholder="Jelaskan kode apa yang tercakup dan bagaimana digunakan"
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="reference-system-authority"
                name="authority_name"
                label="Instansi penerbit"
                placeholder="Instansi berwenang"
                required
              />
              <Field
                id="reference-system-version"
                name="version_label"
                label="Versi referensi"
                placeholder="Versi atau tahun sumber"
                required
              />
            </div>
            <Field
              id="reference-system-source-url"
              name="source_url"
              label="URL sumber resmi"
              placeholder="https://..."
              type="url"
            />
            <Field
              id="reference-system-evidence-url"
              name="evidence_url"
              label="URL dokumen bukti"
              placeholder="https://..."
              type="url"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="reference-system-valid-from"
                name="valid_from"
                label="Berlaku mulai"
                type="date"
              />
              <Field
                id="reference-system-valid-until"
                name="valid_until"
                label="Berlaku sampai"
                type="date"
              />
            </div>
            <p className="text-xs leading-5 text-muted">
              Setelah sistem referensi dibuat, masukkan entri kodenya sebelum
              digunakan dalam validasi dataset.
            </p>
            <PendingActionButton
              type="submit"
              pending={busy}
              pendingText="Menyimpan…"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={16} aria-hidden="true" />
              Simpan sebagai draf
            </PendingActionButton>
          </form>
          <form
            onSubmit={(event) => submit(event, "reference_entry")}
            className="w-full portal-form-card space-y-4 p-4 sm:p-5 xl:col-span-2"
            aria-busy={busy}
          >
            <div className="flex items-start gap-3">
              <Plus
                size={20}
                className="mt-0.5 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold">Tambahkan entri kode</h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  Kode dapat ditambahkan selama sistem masih berstatus Draf.
                  Setelah sistem diverifikasi, daftar kode pada versi itu tidak
                  dapat diubah.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor="entry-system-id"
                >
                  Sistem kode
                </label>
                <select
                  className="field h-11 w-full"
                  name="system_id"
                  id="entry-system-id"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pilih sistem draf
                  </option>
                  {systems
                    .filter((system) => system.status === "draft")
                    .map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.system_code} · {system.title}
                      </option>
                    ))}
                </select>
              </div>
              <Field
                id="entry-code"
                name="code"
                label="Kode"
                placeholder="Kode persis dari sumber"
                required
              />
              <Field
                id="entry-label"
                name="label"
                label="Nama atau label kode"
                placeholder="Nama yang dijelaskan oleh kode"
                required
              />
              <Field
                id="entry-parent-code"
                name="parent_code"
                label="Kode induk (opsional)"
                placeholder="Untuk klasifikasi bertingkat"
              />
            </div>
            <Field
              id="entry-definition"
              name="definition"
              label="Definisi (opsional)"
              placeholder="Makna atau ketentuan entri ini"
            />
            <Field
              id="entry-source-reference"
              name="source_reference"
              label="URL sumber entri (opsional)"
              placeholder="https://..."
              type="url"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="entry-valid-from"
                name="valid_from"
                label="Berlaku mulai"
                type="date"
              />
              <Field
                id="entry-valid-until"
                name="valid_until"
                label="Berlaku sampai"
                type="date"
              />
            </div>
            <PendingActionButton
              type="submit"
              pending={busy}
              pendingText="Menyimpan…"
              disabled={!systems.some((system) => system.status === "draft")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={16} aria-hidden="true" />
              Tambah entri kode
            </PendingActionButton>
          </form>
        </div>
      ) : null}

      <RegistryTable
        title="Registri standar"
        description="Standar yang menjadi referensi metadata dataset."
        rows={standards}
        codeKey="standard_code"
        nameKey="title"
        subKey="standard_type"
        canManage={canManage}
        kind="standard"
        onReview={review}
        busy={busy}
      />
      <RegistryTable
        title="Sistem kode referensi"
        description="Sistem kode yang ditetapkan oleh otoritas sumber."
        rows={systems}
        codeKey="system_code"
        nameKey="title"
        subKey="version_label"
        canManage={canManage}
        kind="reference_system"
        onReview={review}
        busy={busy}
      />
      <section className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Entri kode tersimpan</h2>
            <p className="mt-1 text-sm text-muted">
              Entri publik hanya tersedia ketika sistem referensinya sudah
              diverifikasi dan masa berlakunya aktif.
            </p>
          </div>
          <span className="portal-result-count">{entries.length} entri</span>
        </div>
        {entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Sistem</th>
                  <th className="p-3">Status sistem</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-line last:border-0"
                  >
                    <td className="p-3 font-mono text-xs">{entry.code}</td>
                    <td className="p-3">
                      {entry.label}
                      <p className="mt-1 text-xs text-muted">
                        {entry.definition || "Definisi belum diisi"}
                      </p>
                    </td>
                    <td className="p-3">
                      {entry.reference_code_systems?.title ||
                        "Sistem referensi"}
                      <span className="portal-table-subtext block">
                        {entry.reference_code_systems?.system_code}
                      </span>
                    </td>
                    <td className="p-3">
                      {STATUS_LABELS[entry.reference_code_systems?.status] ||
                        "Status belum tersedia"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-sm text-muted">
            Belum ada entri kode. Buat draf sistem referensi, lalu tambahkan
            kode dari sumber resmi.
          </p>
        )}
      </section>
      <p className="flex items-start gap-2 text-xs leading-5 text-muted">
        <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        Status terverifikasi merupakan keputusan kurator internal setelah
        memeriksa sumber dan bukti; status ini bukan sertifikasi oleh BPS, BIG,
        Kemendagri, atau pengelola SDI nasional.
      </p>
    </div>
  );
}

function RegistryTable({
  title,
  description,
  rows,
  codeKey,
  nameKey,
  subKey,
  canManage,
  kind,
  onReview,
  busy,
}) {
  return (
    <section className="portal-workspace-panel">
      <div className="portal-panel-heading">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <span className="portal-result-count">{rows.length} catatan</span>
      </div>
      {rows.length ? (
        <div className="divide-y divide-line">
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">
                  {row[codeKey]} · {row[subKey]}
                </p>
                <h3 className="mt-1 font-semibold">{row[nameKey]}</h3>
                <p className="mt-1 text-sm text-muted">
                  {row.authority_name} · versi {row.version_label}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {STATUS_LABELS[row.status] || row.status}
                </p>
                {row.source_url ? (
                  <a
                    className="mt-1 inline-block break-all text-xs text-primary underline"
                    href={row.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lihat sumber
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-amber-800">
                    Tautan sumber resmi belum ditambahkan.
                  </p>
                )}
              </div>
              {canManage && row.status !== "deprecated" ? (
                <div className="flex flex-wrap gap-2">
                  {row.status === "draft" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onReview(kind, row.id, "verify")}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Verifikasi
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onReview(kind, row.id, "deprecate")}
                    className="rounded-xl border border-line px-3 py-2 text-xs font-semibold disabled:opacity-50"
                  >
                    Tandai tidak berlaku
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted">
          Belum ada referensi. Tambahkan standar atau sistem kode dari sumber
          resmi agar dapat digunakan oleh dataset.
        </p>
      )}
    </section>
  );
}

function Field({
  id,
  name,
  label,
  placeholder,
  type = "text",
  required = false,
}) {
  const fieldId = id || name;
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium" htmlFor={fieldId}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className="field h-11 w-full"
        id={fieldId}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        maxLength={type === "url" ? 2048 : 10000}
        aria-describedby={`${fieldId}-help`}
      />
      <p id={`${fieldId}-help`} className="mt-1 text-xs leading-5 text-muted">
        {type === "url"
          ? "Tempel URL sumber yang dapat dibuka dan diperiksa."
          : placeholder}
      </p>
    </div>
  );
}
