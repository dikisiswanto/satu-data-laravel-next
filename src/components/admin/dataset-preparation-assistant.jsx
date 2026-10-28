import Link from "next/link";
import {
  ArrowDownToLine,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import {
  DATASET_BLUEPRINTS,
  OPERATOR_START_STEPS,
  DATA_THEME_SUGGESTIONS,
} from "@/lib/data/dataset-blueprints";
import { siteConfig } from "@/lib/site-config";

const PROFILE_ICONS = {
  "statistik-wilayah": FileSpreadsheet,
  "deret-indikator": CheckCircle2,
  "register-fasilitas": BookOpen,
  geospasial: MapPinned,
};

export function DatasetPreparationAssistant() {
  return (
    <details
      id="panduan-dataset"
      className="portal-preparation-guide mb-6 overflow-hidden rounded-xl border border-[#d5e3ec] bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f1f8] text-[#205c7d]"
          aria-hidden="true"
        >
          <BookOpen size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">
            Butuh bantuan menyiapkan dataset?
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted">
            Buka contoh struktur data, template berkas, dan saran penyiapan.
            Semua panduan ini opsional.
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-[#dce5eb] bg-[#f7f9fb] px-2.5 py-1 text-[10px] font-semibold text-[#536b7c]">
          Opsional
        </span>
        <ChevronDown
          size={17}
          className="portal-disclosure-arrow shrink-0 text-[#62798a] transition-transform"
          aria-hidden="true"
        />
      </summary>
      <section
        aria-labelledby="dataset-preparation-title"
        className="space-y-4 border-t border-[#e7edf1] p-4 sm:p-5"
      >
        <div className="rounded-2xl border border-[#d5e3ec] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f1f8] text-[#205c7d]"
                aria-hidden="true"
              >
                <BookOpen size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#52758b]">
                  Panduan operator
                </p>
                <h2
                  id="dataset-preparation-title"
                  className="mt-1 text-lg font-semibold text-ink"
                >
                  Mulai dari bentuk data yang Anda miliki
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  Pilih pola yang paling mendekati data Anda, lalu unduh
                  templatenya. Setelah itu, isi informasi dasar dataset.
                  Template membantu menata kolom, tetapi tidak menggantikan
                  Standar Data atau kode referensi resmi.
                </p>
              </div>
            </div>
            <Link
              href="/api-data#sdi-harvesting"
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              prefetch={false}
            >
              Pelajari cara berbagi data melalui API
            </Link>
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {OPERATOR_START_STEPS.map((step, index) => (
              <li key={step.title} className="rounded-xl bg-[#f6f9fb] p-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#285f7d] ring-1 ring-[#d8e5ec]">
                  {index + 1}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="-mt-1 text-xs leading-5 text-muted">
          Ingin menjelaskan arti setiap kolom?{" "}
          <a
            className="font-semibold text-primary underline underline-offset-2"
            href="/templates/data-kamus-kolom.csv"
            download
          >
            Unduh template kamus kolom CSV
          </a>{" "}
          untuk mencatat arti kolom, jenis nilai, satuan, dan makna sel yang
          kosong.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          {DATASET_BLUEPRINTS.map((profile) => {
            const Icon = PROFILE_ICONS[profile.id] || FileSpreadsheet;
            return (
              <article
                key={profile.id}
                className="min-w-0 rounded-2xl border border-line bg-white p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5f8] text-[#355f78]"
                    aria-hidden="true"
                  >
                    <Icon size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-ink">{profile.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {profile.description}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[#48677a]">
                  {profile.useWhen}
                </p>
                <details className="mt-3 rounded-lg bg-[#f7f9fb] px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-[#365c73]">
                    Lihat contoh kolom
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {profile.columns.map((column) => (
                      <code
                        key={column}
                        className="max-w-full break-all rounded bg-white px-2 py-1 text-[11px] text-[#29495d] ring-1 ring-[#e0e8ed]"
                      >
                        {column}
                      </code>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {profile.note}
                  </p>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.files.map((file) => (
                    <a
                      key={file.href}
                      href={file.href}
                      download
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#d5e1e8] bg-white px-3 py-2 text-xs font-semibold text-[#225a79] hover:bg-[#f5f9fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28719b]"
                    >
                      <ArrowDownToLine size={14} aria-hidden="true" />
                      {file.label}
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <details className="rounded-2xl border border-[#dce5eb] bg-white p-4 sm:p-5">
          <summary className="cursor-pointer font-semibold text-ink">
            Topik data yang dapat dikembangkan di {siteConfig.regionName}
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted">
            Daftar ini adalah saran, bukan Daftar Data atau Data Prioritas yang
            sudah ditetapkan. Bahas bersama Forum Satu Data, Walidata, dan
            produsen data sebelum menjadikannya rencana pengumpulan.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DATA_THEME_SUGGESTIONS.map((theme) => (
              <article
                key={theme.id}
                className="rounded-xl border border-line p-3"
              >
                <h3 className="text-sm font-semibold text-ink">
                  {theme.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {theme.examples}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#48677a]">
                  {theme.purpose}
                </p>
              </article>
            ))}
          </div>
        </details>

        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          <ShieldCheck
            size={16}
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          Untuk menjaga privasi dan konsistensi, masukkan hanya data pribadi
          yang benar-benar diperlukan sesuai tugas dan aturan akses yang
          berlaku. Gunakan kode SDS, kode wilayah, dan klasifikasi dari sumber
          resmi. Jika belum menemukan rujukannya, simpan sebagai draf dan minta
          bantuan Walidata.
        </p>
      </section>
    </details>
  );
}
