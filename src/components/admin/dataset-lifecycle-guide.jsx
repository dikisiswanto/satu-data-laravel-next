import Link from "next/link";
import { ArrowRight, Check, Circle, CircleDot } from "lucide-react";

const STEPS = [
  {
    key: "draft",
    title: "Buat draf",
    description:
      "Catat judul dan organisasi pengampu. Informasi lain bisa dilengkapi bertahap.",
  },
  {
    key: "source",
    title: "Unggah berkas sumber",
    description:
      "Pilih CSV, XLSX, JSON, atau GeoJSON dengan ukuran maksimal 25 MiB.",
  },
  {
    key: "validate",
    title: "Validasi otomatis",
    description:
      "Portal memeriksa dan menyiapkan struktur data sebelum pemeriksaan.",
  },
  {
    key: "metadata",
    title: "Lengkapi metadata kepatuhan",
    description:
      "Lengkapi deskripsi, sumber, cakupan, frekuensi, dan lisensi. Rujukan SDI diisi jika tersedia.",
  },
  {
    key: "publish",
    title: "Ajukan dan terbitkan",
    description: "Dataset ditinjau sebelum tampil di portal publik.",
  },
];

export function DatasetLifecycleGuide({
  activeStep = 1,
  completedThrough = 0,
  links = {},
  compact = false,
  heading = "Alur pengelolaan dataset",
  description = "Ikuti urutan ini. Metadata standar lanjutan tidak perlu ditebak saat membuat draf.",
}) {
  return (
    <section
      aria-labelledby="dataset-lifecycle-title"
      className={`w-full rounded-2xl border border-[#d5e2e9] bg-white ${compact ? "p-4" : "p-4 sm:p-5"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            id="dataset-lifecycle-title"
            className="text-base font-semibold text-ink"
          >
            {heading}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#d5e2e9] bg-[#f5f8fa] px-2.5 py-1 text-xs font-semibold text-[#476274]">
          {completedThrough >= STEPS.length
            ? "Selesai"
            : `Langkah ${Math.min(activeStep, STEPS.length)} dari ${STEPS.length}`}
        </span>
      </div>
      <ol
        className={`mt-4 grid ${compact ? "gap-2" : "gap-3"} sm:grid-cols-2 xl:grid-cols-5`}
      >
        {STEPS.map((step, index) => {
          const number = index + 1;
          const complete = number <= completedThrough;
          const current = !complete && number === activeStep;
          const href = links[step.key];
          return (
            <li
              key={step.key}
              className={`min-w-0 rounded-xl border ${compact ? "p-2.5" : "p-3"} ${
                complete
                  ? "border-emerald-200 bg-emerald-50/70"
                  : current
                    ? "border-[#8db8cf] bg-[#f0f7fb] ring-1 ring-[#c4dce9]"
                    : "border-[#e3e9ed] bg-[#fafbfc]"
              }`}
              aria-current={current ? "step" : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    complete
                      ? "bg-emerald-700 text-white"
                      : current
                        ? "bg-[#205d7b] text-white"
                        : "bg-white text-[#607586] ring-1 ring-[#d5e0e7]"
                  }`}
                  aria-hidden="true"
                >
                  {complete ? (
                    <Check size={15} />
                  ) : current ? (
                    <CircleDot size={15} />
                  ) : (
                    <Circle size={15} />
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wide ${complete ? "text-emerald-800" : current ? "text-[#205d7b]" : "text-muted"}`}
                >
                  {complete
                    ? "Selesai"
                    : current
                      ? "Langkah sekarang"
                      : `Langkah ${number}`}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-5 text-ink">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted">
                {step.description}
              </p>
              {href ? (
                <Link
                  href={href}
                  prefetch={false}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {step.key === "source"
                    ? "Buka unggahan"
                    : "Lengkapi informasi"}
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export const DATASET_REVIEW_METADATA = [
  { key: "description", label: "Deskripsi" },
  { key: "source_name", label: "Nama sumber data" },
  { key: "geographic_scope", label: "Cakupan wilayah" },
  { key: "update_frequency", label: "Frekuensi pembaruan" },
  { key: "license_text", label: "Lisensi atau ketentuan penggunaan" },
];
