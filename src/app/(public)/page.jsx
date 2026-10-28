import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  Database,
  FileChartColumn,
  FileText,
  GraduationCap,
  HeartPulse,
  Leaf,
  MapPinned,
  Network,
  Sprout,
  UsersRound,
} from "lucide-react";
import { SearchForm } from "@/components/search-form";
import {
  getPublishedDatasetFacetsResult,
  getPublishedDatasetsResult,
  getPublicPortalStatsResult,
} from "@/lib/data/public";
import { formatDate } from "@/lib/utils";
import { SectionReveal } from "@/components/section-reveal";
import {
  getCanonicalMetadata,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";

export const metadata = {
  title: siteConfig.name,
  description: `Temukan dataset, indikator, dan informasi resmi dari perangkat daerah ${siteConfig.regionName}.`,
  ...getCanonicalMetadata("/"),
  ...getSocialMetadata({
    path: "/",
    title: siteConfig.name,
    description: `Temukan dataset, indikator, dan informasi resmi dari perangkat daerah ${siteConfig.regionName}.`,
  }),
};

const topics = [
  {
    label: "Kependudukan",
    query: "kependudukan penduduk",
    icon: UsersRound,
    tone: "blue",
  },
  {
    label: "Pendidikan",
    query: "pendidikan sekolah",
    icon: GraduationCap,
    tone: "green",
  },
  { label: "Kesehatan", query: "kesehatan", icon: HeartPulse, tone: "rose" },
  {
    label: "Ekonomi",
    query: "ekonomi perdagangan",
    icon: BarChart3,
    tone: "violet",
  },
  {
    label: "Pertanian",
    query: "pertanian perikanan",
    icon: Sprout,
    tone: "emerald",
  },
  {
    label: "Infrastruktur",
    query: "infrastruktur jalan",
    icon: Network,
    tone: "cyan",
  },
  {
    label: "Wilayah & Geospasial",
    query: "wilayah geospasial",
    icon: MapPinned,
    tone: "amber",
  },
  {
    label: "Lingkungan Hidup",
    query: "lingkungan hidup",
    icon: Leaf,
    tone: "emerald",
  },
  {
    label: "Sosial",
    query: "sosial kesejahteraan",
    icon: UsersRound,
    tone: "violet",
  },
  {
    label: "Pemerintahan",
    query: "pemerintahan",
    icon: Building2,
    tone: "blue",
  },
];

function displayStat(value) {
  return value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("id-ID").format(value);
}

function DatasetPreviewCard({ dataset, index }) {
  const topic = topics.find((item) =>
    `${dataset.category || ""} ${dataset.title || ""}`
      .toLowerCase()
      .includes(item.label.toLowerCase()),
  );
  const Icon = topic?.icon || FileText;
  const tone = topic?.tone || "blue";
  return (
    <article className="home-dataset-card group">
      <div
        className={`home-dataset-art home-dataset-art-${tone}`}
        aria-hidden="true"
      >
        <span className="home-dataset-art-grid" />
        <span className="home-dataset-art-icon">
          <Icon size={26} strokeWidth={1.8} />
        </span>
        <span className="home-dataset-index">0{index + 1}</span>
      </div>
      <div className="home-dataset-body">
        <p className="home-dataset-category">
          {dataset.category || "Dataset publik"}
        </p>
        <h3>
          <Link href={`/dataset/${dataset.slug}`}>{dataset.title}</Link>
        </h3>
        <p className="home-dataset-description">
          {dataset.description || "Metadata ringkas belum tersedia."}
        </p>
        <div className="home-dataset-meta">
          <span>
            <Building2 size={13} aria-hidden="true" />
            {dataset.organizations?.name || "Organisasi belum dicantumkan"}
          </span>
          <span>
            <CalendarDays size={13} aria-hidden="true" />
            {formatDate(dataset.published_at)}
          </span>
        </div>
      </div>
      <Link
        className="home-dataset-open"
        href={`/dataset/${dataset.slug}`}
        aria-label={`Lihat dataset ${dataset.title}`}
      >
        <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

function getTopicLinks(availableCategories) {
  return topics.map((topic) => {
    const normalizedLabel = topic.label.toLocaleLowerCase("id-ID");
    const matchingCategory = availableCategories.find((category) => {
      const normalizedCategory = String(category || "")
        .trim()
        .toLocaleLowerCase("id-ID");
      return (
        Boolean(normalizedCategory) &&
        (normalizedCategory === normalizedLabel ||
          normalizedCategory.includes(normalizedLabel) ||
          normalizedLabel.includes(normalizedCategory))
      );
    });
    return {
      ...topic,
      href: matchingCategory
        ? `/dataset?kategori=${encodeURIComponent(matchingCategory)}`
        : `/dataset?q=${encodeURIComponent(topic.query)}`,
    };
  });
}

function HomeHeroContent({
  stats = null,
  availableCategories = [],
  statsUnavailable = false,
  facetsUnavailable = false,
  loading = false,
}) {
  const topicLinks = getTopicLinks(availableCategories);
  return (
    <section
      className="home-hero"
      style={{ "--home-hero-image": `url("${siteConfig.heroImage}")` }}
      aria-busy={loading ? "true" : undefined}
    >
      <div className="home-hero-pattern" aria-hidden="true" />
      <div className="page-container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-hero-kicker">
            <span />{" "}
            {`PORTAL DATA TERPADU ${siteConfig.regionName.toUpperCase()}`}
          </p>
          <h1>
            Temukan Data,
            <br />
            <span>Pahami {siteConfig.regionShortName}.</span>
          </h1>
          <p className="home-hero-description">
            Jelajahi data resmi {siteConfig.regionName} untuk memahami kondisi
            daerah, menyusun perencanaan, dan mendukung keputusan berbasis data.
          </p>
          <div className="home-hero-search">
            <SearchForm placeholder="Cari topik, mis. pendidikan atau sekolah…" />
          </div>
          <nav
            className="home-search-suggestions"
            aria-label="Contoh pencarian berdasarkan topik"
          >
            <span>Coba cari</span>
            {topicLinks.slice(0, 4).map((topic) => (
              <Link key={topic.label} href={topic.href}>
                {topic.label.toLowerCase()}
              </Link>
            ))}
          </nav>
        </div>
        <div
          className={`home-hero-visual${loading ? " home-hero-visual--loading" : ""}`}
          role="group"
          aria-label="Akses cepat ke data publik"
        >
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />
          <div className="home-visual-mark">
            <Database size={44} strokeWidth={1.3} aria-hidden="true" />
          </div>
          <div className="home-visual-caption">
            <span className="home-live-dot" />
            <span>
              <strong>{siteConfig.shortName}</strong>
              <small>Satu tempat untuk menemukan data daerah</small>
            </span>
          </div>
          <Link
            href="/organisasi"
            className="home-visual-chip home-visual-chip-top"
          >
            <Building2 size={17} aria-hidden="true" />
            <span>
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.organizations)
                )}
              </strong>
              <small>Organisasi aktif</small>
            </span>
          </Link>
          <Link
            href="/statistik"
            className="home-visual-chip home-visual-chip-bottom"
          >
            <FileChartColumn size={17} aria-hidden="true" />
            <span>
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.indicators)
                )}
              </strong>
              <small>Indikator publik</small>
            </span>
          </Link>
        </div>
      </div>
      <div className="page-container home-stats-wrap">
        <section className="home-stats" aria-label="Ringkasan data publik">
          <Link href="/dataset" className="home-stat home-stat-blue">
            <span className="home-stat-icon">
              <Database size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.datasets)
                )}
              </strong>
              <small>Dataset terbuka</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/dataset" className="home-stat home-stat-violet">
            <span className="home-stat-icon">
              <FileText size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(
                    facetsUnavailable ? null : availableCategories.length,
                  )
                )}
              </strong>
              <small>Kategori data</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/statistik" className="home-stat home-stat-green">
            <span className="home-stat-icon">
              <FileChartColumn size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.indicators)
                )}
              </strong>
              <small>Indikator statistik</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link href="/organisasi" className="home-stat home-stat-green">
            <span className="home-stat-icon">
              <Building2 size={22} aria-hidden="true" />
            </span>
            <span className="home-stat-copy">
              <strong>
                {loading ? (
                  <span
                    className="loading-skeleton home-metric-skeleton"
                    aria-hidden="true"
                  />
                ) : (
                  displayStat(stats?.organizations)
                )}
              </strong>
              <small>Perangkat daerah</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <p className="home-stats-note">
          {loading
            ? "Ringkasan dihitung dari data yang tersedia untuk publik. Jumlah indikator mengikuti data statistik yang diterbitkan."
            : statsUnavailable || facetsUnavailable
              ? "Sebagian ringkasan belum dapat dimuat dari layanan data. Angka yang belum tersedia ditandai dengan tanda pisah."
              : "Ringkasan dihitung dari data yang tersedia untuk publik. Jumlah indikator mengikuti data statistik yang diterbitkan."}
        </p>
      </div>
    </section>
  );
}

async function HomeHero() {
  // The headline counts are live public aggregates; render this section per
  // request instead of freezing the successful build-time values into HTML.
  await connection();
  const [statsResult, facetsResult] = await Promise.all([
    getPublicPortalStatsResult(),
    getPublishedDatasetFacetsResult(),
  ]);
  const availableCategories = Array.isArray(facetsResult.data?.categories)
    ? facetsResult.data.categories
    : [];
  return (
    <HomeHeroContent
      stats={statsResult.data}
      availableCategories={availableCategories}
      statsUnavailable={statsResult.unavailable}
      facetsUnavailable={facetsResult.unavailable}
    />
  );
}

async function HomeLatestDatasetsSection() {
  const datasetResult = await getPublishedDatasetsResult({
    limit: 5,
    sort: "updated",
  });
  if (datasetResult.unavailable) await connection();
  const datasets = datasetResult.data;
  return (
    <section className="home-section home-latest-section">
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">PEMBARUAN KATALOG</p>
          <h2>Dataset terbaru</h2>
          <p>Data yang telah diterbitkan dan dapat Anda telusuri.</p>
        </div>
        <Link href="/dataset" className="home-section-link">
          Lihat semua dataset <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {datasetResult.unavailable ? (
        <div className="home-empty-datasets" role="alert">
          <span className="home-empty-datasets-icon">
            <Database size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Layanan katalog sedang bermasalah</p>
            <h3>Dataset terbaru belum dapat ditampilkan</h3>
            <p>
              Kami belum dapat mengambil daftar dataset karena layanan katalog
              sedang mengalami kendala. Coba lagi beberapa saat lagi. Gangguan
              ini tidak berarti dataset telah dihapus.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/" className="home-section-link">
                Coba lagi
              </Link>
              <Link href="/dataset" className="home-section-link">
                Buka katalog dataset <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      ) : datasets.length ? (
        <div className="home-dataset-grid">
          {datasets.map((dataset, index) => (
            <DatasetPreviewCard
              key={dataset.id}
              dataset={dataset}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="home-empty-datasets">
          <span className="home-empty-datasets-icon">
            <Database size={25} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Katalog sedang menunggu publikasi pertama</p>
            <h3>Belum ada dataset yang diterbitkan</h3>
            <p>
              Dataset akan muncul setelah informasi dan berkasnya diperiksa lalu
              diterbitkan. Sementara itu, Anda dapat melihat daftar perangkat
              daerah atau membaca panduan portal.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/organisasi"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1d5fa7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#174f8b]"
              >
                Jelajahi perangkat daerah{" "}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/bantuan"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#174f8b] transition hover:bg-[#eaf2ff]"
              >
                Panduan penggunaan <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function HomeLatestDatasetsSkeleton() {
  return (
    <section
      className="home-section home-latest-section"
      aria-busy="true"
      aria-label="Memuat dataset terbaru"
    >
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">PEMBARUAN KATALOG</p>
          <h2>Dataset terbaru</h2>
          <p>Data yang telah diterbitkan dan dapat Anda telusuri.</p>
        </div>
        <Link href="/dataset" className="home-section-link">
          Lihat semua dataset <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="home-dataset-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <article
            className="home-dataset-card home-dataset-card-skeleton"
            key={index}
            aria-hidden="true"
          >
            <div className="home-dataset-art">
              <span className="loading-skeleton home-dataset-art-skeleton" />
            </div>
            <div className="home-dataset-body">
              <span className="loading-skeleton h-3 w-24" />
              <span className="loading-skeleton mt-3 h-5 w-4/5" />
              <span className="loading-skeleton mt-3 h-3 w-full" />
              <span className="loading-skeleton mt-2 h-3 w-5/6" />
              <span className="loading-skeleton mt-5 h-3 w-2/3" />
            </div>
          </article>
        ))}
      </div>
      <p className="sr-only" role="status">
        Sedang memuat dataset terbaru.
      </p>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="public-home">
      <Suspense fallback={<HomeHeroContent loading />}>
        <HomeHero />
      </Suspense>
      <div className="page-container home-content">
        <SectionReveal as="section" className="home-section home-topic-section">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">JELAJAHI KATALOG</p>
              <h2>Data berdasarkan tema</h2>
              <p>Mulai dari bidang yang paling dekat dengan kebutuhan Anda.</p>
            </div>
            <Link href="/dataset" className="home-section-link">
              Semua dataset <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="home-topic-grid">
            {topics.map(({ label, query, icon: Icon }) => (
              <Link
                key={label}
                href={`/dataset?q=${encodeURIComponent(query)}`}
                className="home-topic-card"
              >
                <span className="home-topic-icon mb-4 flex size-11 items-center justify-center rounded-xl">
                  <Icon size={23} strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="mr-[.15rem] pr-4 text-xs font-bold leading-5 text-[#263f52] sm:text-sm">
                  {label}
                </span>
                <span className="home-topic-arrow">
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </SectionReveal>
        <Suspense fallback={<HomeLatestDatasetsSkeleton />}>
          <HomeLatestDatasetsSection />
        </Suspense>
        <section className="home-feature-row" aria-label="Layanan data">
          <article className="home-feature home-feature-visualization">
            <div className="home-feature-copy">
              <span className="home-feature-icon">
                <BarChart3 size={21} aria-hidden="true" />
              </span>
              <p className="eyebrow">PAHAMI DATA</p>
              <h2>Data yang lebih mudah dipahami.</h2>
              <p>
                Jelajahi indikator statistik dan temukan konteks di balik angka
                melalui halaman statistik publik.
              </p>
              <Link href="/statistik" className="home-feature-button">
                Jelajahi statistik <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="home-chart-art" aria-hidden="true">
              <span style={{ height: "32%" }} />
              <span style={{ height: "48%" }} />
              <span style={{ height: "41%" }} />
              <span style={{ height: "67%" }} />
              <span style={{ height: "84%" }} />
              <span style={{ height: "59%" }} />
              <div className="home-chart-line" />
            </div>
          </article>
          <article className="home-feature home-feature-formats">
            <span className="home-feature-icon">
              <FileText size={21} aria-hidden="true" />
            </span>
            <p className="eyebrow">DATA TERBUKA</p>
            <h2>Gunakan data sesuai kebutuhan.</h2>
            <p>
              Periksa metadata dan berkas yang tersedia pada setiap dataset
              untuk mengetahui format dan cakupan datanya.
            </p>
            <Link href="/dataset" className="home-format-link">
              Telusuri berkas dataset{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <div className="home-format-badges" aria-label="Contoh format data">
              <span>CSV</span>
              <span>XLSX</span>
              <span>JSON</span>
              <span>GeoJSON</span>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
