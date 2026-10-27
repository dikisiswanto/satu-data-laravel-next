import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
} from "@/lib/site-config";
import {
  getPublicIndicatorBySlugResult,
  getPublicIndicatorObservationsResult,
} from "@/lib/data/public-indicators";
import { safeHttpUrl } from "@/lib/utils";
import { serializeJsonLd } from "@/lib/seo/json-ld";

export const dynamic = "force-dynamic";

const formatValue = (value, unit) => {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  const rendered = Number.isFinite(number)
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(
        number,
      )
    : String(value);
  return unit ? `${rendered} ${unit}` : rendered;
};

function observationValue(observation) {
  return observation.value_numeric !== null &&
    observation.value_numeric !== undefined
    ? observation.value_numeric
    : observation.value_text;
}

function TrendChart({ observations, unit, title }) {
  const values = observations.map((item) => Number(item.value_numeric));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(Math.abs(max) * 0.1, 1);
  const points = observations.map((item, index) => {
    const x =
      observations.length === 1
        ? 400
        : 28 + (index / (observations.length - 1)) * 744;
    const y =
      max === min
        ? 130
        : 218 - ((Number(item.value_numeric) - min) / range) * 176;
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const labels = [
    points[0],
    points[Math.floor((points.length - 1) / 2)],
    points[points.length - 1],
  ].filter(
    (point, index, all) =>
      point &&
      all.findIndex(
        (candidate) => candidate.period_label === point.period_label,
      ) === index,
  );

  return (
    <figure aria-label={`Grafik tren ${title}`}>
      <div className="w-full overflow-hidden">
        <svg
          viewBox="0 0 800 270"
          className="block h-auto w-full text-primary"
          role="img"
          aria-label={`Grafik tren ${title} berdasarkan ${observations.length} observasi terpublikasi`}
        >
          <title>{`Tren ${title}`}</title>
          <desc>{`Grafik menggunakan ${observations.length} observasi numerik terpublikasi. Nilai minimum ${formatValue(min, unit)} dan maksimum ${formatValue(max, unit)}.`}</desc>
          {[42, 86, 130, 174, 218].map((y) => (
            <line
              key={y}
              x1="28"
              x2="772"
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.12"
              strokeDasharray="3 5"
            />
          ))}
          {points.length > 1 ? (
            <polyline
              points={polyline}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {points.map((point) => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="currentColor">
                <title>{`${point.period_label}: ${formatValue(point.value_numeric, unit)}`}</title>
              </circle>
            </g>
          ))}
          {labels.map((point) => (
            <text
              key={`${point.id}-label`}
              x={point.x}
              y="252"
              fill="currentColor"
              fontSize="13"
              textAnchor={
                point.x === 28 ? "start" : point.x === 772 ? "end" : "middle"
              }
            >
              {point.period_label}
            </text>
          ))}
        </svg>
      </div>
    </figure>
  );
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublicIndicatorBySlugResult(slug);
  if (result.unavailable) {
    return {
      title: "Indikator belum dapat dimuat",
      description: "Informasi indikator sementara tidak dapat diakses.",
      robots: { index: false, follow: false },
    };
  }
  const indicator = result.data;
  if (!indicator) {
    return {
      title: "Indikator tidak ditemukan",
      robots: { index: false, follow: false },
    };
  }
  const title = `${indicator.title} — Statistik Kabupaten Wajo`;
  const description = (
    indicator.definition ||
    `Definisi, nilai, periode, dan sumber indikator ${indicator.title} di Kabupaten Wajo.`
  ).slice(0, 160);
  const path = `/statistik/${indicator.slug}`;
  return {
    title: indicator.title,
    description,
    ...getCanonicalMetadata(path),
    ...getSocialMetadata({ path, title, description }),
  };
}

export default async function PublicIndicatorDetailPage({
  params,
  searchParams,
}) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const indicatorResult = await getPublicIndicatorBySlugResult(slug);
  if (indicatorResult.unavailable) {
    return (
      <main className="page-container section-space public-interior-page">
        <Link
          href="/statistik"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke statistik
        </Link>
        <section role="alert" className="surface-panel p-5">
          <h1 className="text-lg font-semibold">
            Statistik belum dapat dimuat
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Layanan indikator sedang tidak dapat diakses. Kegagalan ini tidak
            berarti indikator telah dihapus atau tidak ditemukan.
          </p>
          <a
            href={`/statistik/${encodeURIComponent(slug)}`}
            className="mt-3 inline-flex text-sm font-semibold text-primary underline"
          >
            Coba lagi
          </a>
        </section>
      </main>
    );
  }
  const indicator = indicatorResult.data;
  if (!indicator) notFound();

  const observationsResult = await getPublicIndicatorObservationsResult(
    indicator.slug,
    500,
  );
  if (observationsResult.unavailable) {
    return (
      <main className="page-container section-space public-interior-page">
        <Link
          href="/statistik"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke statistik
        </Link>
        <PageHeading
          eyebrow="Statistik dan indikator"
          title={indicator.title}
          description={
            indicator.definition || "Definisi indikator belum dilengkapi."
          }
        />
        <div role="alert" className="surface-panel p-5 text-sm leading-6">
          Riwayat observasi belum dapat dimuat. Nilai ini tidak berarti dihapus;
          coba muat ulang beberapa saat lagi. Informasi nilai terakhir pada
          kartu indikator tetap berasal dari data yang sudah dipublikasikan.
        </div>
      </main>
    );
  }

  const allObservations = observationsResult.data;
  const selectedRegion =
    typeof queryParams?.wilayah === "string" ? queryParams.wilayah : "";
  const selectedDimension =
    typeof queryParams?.dimensi === "string" ? queryParams.dimensi : "";
  const regions = [
    ...new Map(
      allObservations.map((item) => [
        item.geographic_code || "__none__",
        {
          code: item.geographic_code || "__none__",
          name: item.geographic_name || "Tanpa wilayah spesifik",
        },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const dimensions = [
    ...new Set(allObservations.map((item) => item.dimension_key || "overall")),
  ].sort((a, b) => a.localeCompare(b, "id"));
  const filteredObservations = allObservations.filter((item) => {
    const regionKey = item.geographic_code || "__none__";
    return (
      (!selectedRegion || selectedRegion === regionKey) &&
      (!selectedDimension ||
        selectedDimension === (item.dimension_key || "overall"))
    );
  });
  const seriesKeys = new Set(
    filteredObservations.map(
      (item) =>
        `${item.geographic_code || "__none__"}::${item.dimension_key || "overall"}::${item.unit}`,
    ),
  );
  const canDrawTrend =
    seriesKeys.size === 1 &&
    filteredObservations.length >= 2 &&
    filteredObservations.every(
      (item) =>
        item.value_numeric !== null &&
        item.value_numeric !== undefined &&
        item.period_label,
    );
  const chartObservations = canDrawTrend
    ? [...filteredObservations]
        .sort((a, b) => {
          const dateA = a.period_start || a.period_end || a.period_label || "";
          const dateB = b.period_start || b.period_end || b.period_label || "";
          return dateA.localeCompare(dateB);
        })
        .slice(-120)
    : [];
  const basePath = `/statistik/${encodeURIComponent(indicator.slug)}`;
  const origin = getPublicSiteOrigin();
  const observationApi = `${origin || ""}/api/v1/indicators/${encodeURIComponent(indicator.slug)}/observations`;
  const indicatorJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: indicator.title,
    description:
      indicator.definition ||
      `Observasi indikator ${indicator.title} dari Pemerintah Kabupaten Wajo.`,
    identifier: indicator.code || indicator.slug,
    ...(origin ? { url: `${origin}/statistik/${indicator.slug}` } : {}),
    ...(indicator.organizations?.name
      ? {
          creator: {
            "@type": "Organization",
            name: indicator.organizations.name,
          },
        }
      : {}),
    publisher: {
      "@type": "GovernmentOrganization",
      name: "Pemerintah Kabupaten Wajo",
    },
    ...(indicator.published_at
      ? { datePublished: indicator.published_at }
      : {}),
    ...(indicator.updated_at ? { dateModified: indicator.updated_at } : {}),
    ...(indicator.reference_period_start
      ? {
          temporalCoverage: indicator.reference_period_end
            ? `${indicator.reference_period_start}/${indicator.reference_period_end}`
            : indicator.reference_period_start,
        }
      : {}),
    isAccessibleForFree: true,
    distribution: [
      {
        "@type": "DataDownload",
        name: `Observasi indikator ${indicator.title} (JSON)`,
        encodingFormat: "application/json",
        ...(origin ? { contentUrl: observationApi } : {}),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(indicatorJsonLd) }}
      />
      <main className="page-container section-space public-interior-page space-y-6">
        <Link
          href="/statistik"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke statistik
        </Link>
        <PageHeading
          eyebrow={`Indikator ${indicator.code || "statistik"}`}
          title={indicator.title}
          description={
            indicator.definition || "Definisi indikator belum dilengkapi."
          }
        >
          <a
            href={observationApi}
            className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line px-3 py-2 text-sm font-semibold hover:bg-accent"
          >
            API observasi <ExternalLink size={15} aria-hidden="true" />
          </a>
        </PageHeading>
        <section className="surface-panel grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 sm:min-h-[92px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nilai terakhir di ringkasan
            </p>
            <p className="mt-1 text-xl font-semibold">
              {formatValue(
                indicator.value_numeric ?? indicator.value_text,
                indicator.unit,
              )}
            </p>
            <p className="mt-1 text-xs text-muted">
              Periode: {indicator.period_label || "Tidak dicantumkan"}
            </p>
          </div>
          <div className="min-w-0 sm:min-h-[92px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Organisasi produsen
            </p>
            <p className="mt-1 font-semibold">
              {indicator.organizations?.name || "Belum dicantumkan"}
            </p>
          </div>
          <div className="min-w-0 sm:min-h-[92px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Jumlah observasi aktif
            </p>
            <p className="mt-1 text-xl font-semibold">
              {allObservations.length.toLocaleString("id-ID")}
            </p>
            <p className="mt-1 text-xs text-muted">
              Maksimal 500 observasi terbaru ditampilkan pada halaman ini.
            </p>
          </div>
          <div className="min-w-0 sm:min-h-[92px]">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Sumber
            </p>
            <p className="mt-1 text-sm">
              {indicator.source_name || "Sumber belum dicantumkan"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Tautan sumber, jika tersedia, tercantum pada masing-masing
              observasi.
            </p>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="series-filter-title">
          <div>
            <h2 id="series-filter-title" className="text-base font-semibold">
              Pilih seri data
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Jika indikator memiliki beberapa wilayah atau dimensi, pilih satu
              seri yang sebanding sebelum grafik tren ditampilkan.
            </p>
          </div>
          <form
            action={basePath}
            method="get"
            className="surface-panel grid min-w-0 gap-3 overflow-visible p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end"
          >
            <div className="min-w-0">
              <label
                htmlFor="indicator-region"
                className="mb-1.5 block text-sm font-medium"
              >
                Wilayah
              </label>
              <select
                id="indicator-region"
                name="wilayah"
                defaultValue={selectedRegion}
                disabled={!regions.length}
                className="field box-border block h-11 min-w-0 max-w-full w-full text-ellipsis"
              >
                <option value="">Semua wilayah</option>
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                    {region.code !== "__none__" ? ` · ${region.code}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label
                htmlFor="indicator-dimension"
                className="mb-1.5 block text-sm font-medium"
              >
                Dimensi
              </label>
              <select
                id="indicator-dimension"
                name="dimensi"
                defaultValue={selectedDimension}
                disabled={!dimensions.length}
                className="field box-border block h-11 min-w-0 max-w-full w-full text-ellipsis"
              >
                <option value="">Semua dimensi</option>
                {dimensions.map((dimension) => (
                  <option key={dimension} value={dimension}>
                    {dimension}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!allObservations.length}
              className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Terapkan filter
            </button>
          </form>
          <section
            className="surface-panel p-4 sm:p-6"
            aria-labelledby="indicator-trend-title"
          >
            <h2 id="indicator-trend-title" className="text-base font-semibold">
              Tren nilai terpublikasi
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nilai dalam satuan yang tercatat pada observasi. Grafik hanya
              ditampilkan untuk satu seri yang dapat dibandingkan.
            </p>
            {canDrawTrend ? (
              <div className="mt-5">
                <TrendChart
                  observations={chartObservations}
                  unit={chartObservations[0]?.unit || indicator.unit}
                  title={indicator.title}
                />
              </div>
            ) : (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6">
                <Info
                  size={18}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p>
                    {!filteredObservations.length
                      ? "Belum ada observasi yang cocok dengan pilihan ini."
                      : filteredObservations.length < 2
                        ? "Belum ada cukup observasi numerik dari beberapa periode untuk membuat grafik tren."
                        : "Seri yang dipilih masih mencakup lebih dari satu wilayah, dimensi, atau satuan, atau berisi nilai teks. Pilih wilayah dan dimensi tertentu agar angka yang berbeda tidak digabungkan dalam grafik yang menyesatkan."}
                  </p>
                  {!allObservations.length ? (
                    <p className="mt-2">
                      Indikator ini belum memiliki nilai historis yang terbit.
                      Pengelola data dapat menambahkan observasi melalui Portal
                      Admin.
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-muted">
              Sumber data grafik, jika tersedia: observasi yang telah
              diterbitkan pada Portal Satu Data Kabupaten Wajo. Nilai draf dan
              revisi lama tidak ditampilkan.
            </p>
          </section>
          <section
            className="surface-panel overflow-hidden"
            aria-labelledby="observations-table-title"
          >
            <div className="border-b border-line p-4">
              <h2 id="observations-table-title" className="font-semibold">
                Tabel observasi
              </h2>
              <p className="mt-1 text-sm text-muted">
                Hanya revisi yang saat ini diterbitkan. Sampai 500 baris terbaru
                tersedia untuk diperiksa.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-secondary text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="p-3">Periode</th>
                    <th className="p-3">Wilayah</th>
                    <th className="p-3">Dimensi</th>
                    <th className="p-3 text-right">Nilai</th>
                    <th className="p-3">Sumber</th>
                    <th className="p-3">Revisi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObservations.length ? (
                    filteredObservations.map((item) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="p-3">
                          <span className="font-medium">
                            {item.period_label}
                          </span>
                          <span className="block text-xs text-muted">
                            {item.period_start || "Tanggal awal tidak dicatat"}
                            {item.period_end ? ` – ${item.period_end}` : ""}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.geographic_name || "Semua wilayah"}
                          <span className="block text-xs text-muted">
                            {item.geographic_code || ""}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.dimension_key || "overall"}
                        </td>
                        <td className="p-3 text-right font-semibold tabular-nums">
                          {formatValue(observationValue(item), item.unit)}
                        </td>
                        <td className="p-3">
                          {item.source_url && safeHttpUrl(item.source_url) ? (
                            <a
                              href={safeHttpUrl(item.source_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {item.source_name}
                              <ExternalLink
                                size={12}
                                className="ml-1 inline"
                                aria-hidden="true"
                              />
                            </a>
                          ) : (
                            item.source_name
                          )}
                        </td>
                        <td className="p-3">v{item.revision_no}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-sm text-muted">
                        Tidak ada observasi untuk kombinasi filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
        <p className="text-xs leading-5 text-muted">
          Data yang tampil mengikuti status publikasi dan kebijakan akses
          sumber. Riwayat draf atau revisi yang tidak lagi aktif tidak diekspos
          melalui halaman ini.
        </p>
      </main>
    </>
  );
}
