import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, ChartNoAxesColumn, Database, Info } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { GeoPortalStatisticsPromo } from "@/components/geoportal-statistics-promo";
import { getPublishedIndicatorsResult } from "@/lib/data/public";
import { getCanonicalMetadata, getSocialMetadata } from "@/lib/site-config";

export const metadata = {
  title: "Statistik",
  description:
    "Jelajahi indikator dan data makro Kabupaten Wajo dengan definisi, satuan, periode, dan sumber yang jelas.",
  ...getCanonicalMetadata("/statistik"),
  ...getSocialMetadata({ path: "/statistik", title: "Statistik dan Indikator | Satu Data Wajo", description: "Jelajahi indikator publik Kabupaten Wajo dengan definisi, satuan, periode, dan sumber yang jelas." }),
};

const PAGE_SIZE = 24;
const MAX_PAGE = 4167;
function formatValue(indicator) {
  if (
    indicator.value_numeric !== null &&
    indicator.value_numeric !== undefined
  ) {
    const numericValue = Number(indicator.value_numeric);
    if (Number.isFinite(numericValue)) {
      return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 4,
      }).format(numericValue);
    }
  }
  return indicator.value_text || "Nilai belum tersedia";
}

export default async function StatistikPage({ searchParams }) {
  // Published indicators can be added, edited, or archived by administrators.
  await connection();
  const params = await searchParams;
  const requestedPage =
    typeof params?.halaman === "string" ? Number(params.halaman) : 1;
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage >= 1 &&
    requestedPage <= MAX_PAGE
      ? requestedPage
      : 1;
  const result = await getPublishedIndicatorsResult({
    limit: PAGE_SIZE,
    page,
  });
  if (result.unavailable) await connection();
  const hasNextPage = result.meta?.last_page
    ? page < Number(result.meta.last_page)
    : result.data.length === PAGE_SIZE && page < MAX_PAGE;
  const indicators = result.data.slice(0, PAGE_SIZE);
  const unavailable = result.unavailable;
  const pageHref = (pageNumber) =>
    pageNumber > 1 ? `/statistik?halaman=${pageNumber}` : "/statistik";
  return (
    <main className="page-container section-space public-interior-page public-statistics-page">
      <PageHeading
        eyebrow="Data makro"
        title="Statistik dan indikator"
        description="Telusuri indikator yang telah diterbitkan, termasuk arti angka, satuan, periode, dan sumber datanya."
      />
      <GeoPortalStatisticsPromo />
      <div id="statistics-list" className="scroll-mt-24">
        {indicators.length ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Menampilkan {indicators.length.toLocaleString("id-ID")}{" "}
                indikator pada halaman {page}.
              </p>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium text-muted">
                <ChartNoAxesColumn size={15} aria-hidden="true" />
                Data terpublikasi
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {indicators.map((indicator, index) => (
                <article
                  key={indicator.id}
                  className={`statistics-card statistics-card-tone-${index % 4}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="statistics-card-source">
                      {indicator.organizations?.name || "Organisasi pengampu"}
                    </p>
                    <span className="statistics-card-icon">
                      <ChartNoAxesColumn size={18} aria-hidden="true" />
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold leading-6">
                    <Link
                      href={`/statistik/${encodeURIComponent(indicator.slug)}`}
                      className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {indicator.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                    {indicator.definition ||
                      "Definisi indikator belum dilengkapi."}
                  </p>
                  <div className="statistics-card-value">
                    <strong>{formatValue(indicator)}</strong>
                    <span>{indicator.unit || "Satuan belum tersedia"}</span>
                  </div>
                  <dl className="statistics-card-meta">
                    <div>
                      <dt>Periode</dt>
                      <dd>{indicator.period_label || "Belum ditentukan"}</dd>
                    </div>
                    <div>
                      <dt>Sumber</dt>
                      <dd>{indicator.source_name || "Belum dicantumkan"}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/statistik/${encodeURIComponent(indicator.slug)}`}
                    className="mt-4 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                  >
                    Lihat riwayat dan rincian data{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
            {indicators.length || page > 1 ? (
              <nav
                aria-label="Navigasi halaman indikator"
                className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
              >
                <p className="text-sm text-muted">
                  Halaman {page}
                  {hasNextPage
                    ? " · Masih ada indikator berikutnya"
                    : " · Akhir daftar"}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      rel="prev"
                      href={pageHref(page - 1)}
                      scroll={false}
                      className="rounded-control border border-line bg-surface px-4 py-2.5 text-sm font-semibold hover:bg-accent"
                    >
                      Sebelumnya
                    </Link>
                  ) : null}
                  {hasNextPage ? (
                    <Link
                      rel="next"
                      href={pageHref(page + 1)}
                      scroll={false}
                      className="rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Berikutnya
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        ) : (
          <section
            className="public-empty-panel"
            aria-labelledby="statistics-empty-title"
            role={unavailable ? "alert" : undefined}
          >
            <span className="public-empty-icon">
              <Database size={23} aria-hidden="true" />
            </span>
            <p className="eyebrow mt-5">
              {unavailable ? "Layanan sementara terganggu" : "Belum tersedia"}
            </p>
            <h2
              id="statistics-empty-title"
              className="mt-2 text-xl font-semibold"
            >
              {unavailable
                ? "Indikator statistik belum dapat dimuat"
                : page > 1
                  ? "Tidak ada indikator pada halaman ini"
                  : "Belum ada indikator statistik yang dipublikasikan"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              {unavailable
                ? "Layanan data statistik sedang tidak dapat diakses. Coba lagi beberapa saat lagi; data yang belum berhasil dimuat tidak berarti dihapus."
                : page > 1
                  ? "Halaman ini tidak berisi indikator. Kembali ke halaman sebelumnya untuk melihat data yang tersedia."
                  : "Indikator akan muncul setelah definisi, satuan, periode, dan sumbernya ditinjau serta dipublikasikan."}{" "}
              Anda tetap dapat menelusuri dataset yang sudah tersedia di
              katalog.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <Link href="/dataset" className="public-empty-action">
                Jelajahi katalog dataset{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              {unavailable ? (
                <a
                  href={pageHref(page)}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Coba lagi
                </a>
              ) : page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  scroll={false}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Kembali ke halaman sebelumnya
                </Link>
              ) : null}
            </div>
            <p className="mt-5 flex items-start justify-center gap-2 text-xs leading-5 text-muted">
              <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              Nilai yang belum dipublikasikan tidak ditampilkan di halaman ini.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
