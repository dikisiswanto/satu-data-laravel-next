import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileSpreadsheet,
  MapPinned,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublishedDatasetBySlugResult } from "@/lib/data/public";
import { formatDate, formatBytes, safeHttpUrl } from "@/lib/utils";
import { getUpdateFrequencyLabel } from "@/lib/dataset-options";
import {
  getCanonicalMetadata,
  getPublicSiteOrigin,
  getSocialMetadata,
  siteConfig,
} from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/seo/json-ld";
import { DatasetResourcePreview } from "@/components/dataset-resource-preview";

function getGeoPortalUrl() {
  return safeHttpUrl(process.env.NEXT_PUBLIC_GEOPORTAL_URL) || null;
}

function isGeospatialDataset(dataset) {
  const resources = Array.isArray(dataset.dataset_resources)
    ? dataset.dataset_resources
    : [];
  if (resources.some((resource) => resource.format === "geojson")) return true;
  const hasCoordinateColumns = resources.some((resource) => {
    const columns = Array.isArray(resource.column_schema)
      ? resource.column_schema
      : [];
    const names = columns
      .map((column) =>
        typeof column === "string" ? column : column?.name || column?.key || "",
      )
      .map((name) => String(name).trim().toLocaleLowerCase("id-ID"));
    const latitude = names.some((name) =>
      ["lat", "latitude", "lintang", "y", "latitude_deg"].includes(name),
    );
    const longitude = names.some((name) =>
      ["lon", "lng", "longitude", "bujur", "x", "longitude_deg"].includes(name),
    );
    return latitude && longitude;
  });
  if (hasCoordinateColumns) return true;
  const searchableText = [
    dataset.category,
    dataset.title,
    ...(Array.isArray(dataset.keywords) ? dataset.keywords : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("id-ID");
  return /geospasial|spasial|peta|geojson|shapefile|\bshp\b|koordinat|lintang|bujur|sungai|danau|jaringan jalan|tutupan lahan/.test(
    searchableText,
  );
}
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const result = await getPublishedDatasetBySlugResult(slug);
  if (result.unavailable) {
    return {
      title: "Dataset belum dapat dimuat",
      description: "Informasi dataset sementara tidak dapat diakses.",
      robots: { index: false, follow: false },
    };
  }
  const dataset = result.data;
  if (!dataset)
    return {
      title: "Dataset tidak ditemukan",
      robots: { index: false, follow: false },
    };
  return {
    title: dataset.title,
    description: (
      dataset.description || `Metadata dataset resmi ${siteConfig.regionName}.`
    ).slice(0, 160),
    ...getCanonicalMetadata(`/dataset/${dataset.slug}`),
    ...getSocialMetadata({
      path: `/dataset/${dataset.slug}`,
      title: dataset.title,
      description: (
        dataset.description ||
        `Metadata dataset resmi ${siteConfig.regionName}.`
      ).slice(0, 160),
      type: "article",
    }),
  };
}
export default async function DatasetDetailPage({ params }) {
  const { slug } = await params;
  const datasetResult = await getPublishedDatasetBySlugResult(slug);
  if (datasetResult.unavailable) {
    // Prevent a temporary upstream failure from being cached as this dataset's page.
    await connection();
    return (
      <main className="page-container section-space public-interior-page">
        <section
          className="public-empty-panel mx-auto max-w-3xl p-8 text-center sm:p-12"
          role="alert"
        >
          <p className="eyebrow">Layanan katalog sedang bermasalah</p>
          <h1 className="mt-3 text-2xl font-semibold">
            Informasi dataset belum dapat ditampilkan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Kami belum dapat mengambil informasi dataset dari katalog. Ini belum
            berarti datanya dihapus atau tidak diterbitkan. Coba lagi beberapa
            saat lagi.
          </p>
          <a
            href={`/dataset/${encodeURIComponent(slug)}`}
            className="public-empty-action mt-5"
          >
            Coba lagi
          </a>
          <Link
            href="/dataset"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            Kembali ke katalog
          </Link>
        </section>
      </main>
    );
  }
  const dataset = datasetResult.data;
  if (!dataset) notFound();
  const siteOrigin = getPublicSiteOrigin();
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: dataset.title,
    description:
      dataset.description || `Dataset resmi dari ${siteConfig.name}.`,
    ...(siteOrigin ? { url: `${siteOrigin}/dataset/${dataset.slug}` } : {}),
    identifier: dataset.slug,
    ...(dataset.organizations?.name
      ? {
          creator: {
            "@type": "Organization",
            name: dataset.organizations.name,
          },
        }
      : {}),
    publisher: {
      "@type": "GovernmentOrganization",
      name: siteConfig.organizationName,
    },
    ...(dataset.published_at ? { datePublished: dataset.published_at } : {}),
    ...(dataset.updated_at ? { dateModified: dataset.updated_at } : {}),
    ...(Array.isArray(dataset.keywords) && dataset.keywords.length
      ? { keywords: dataset.keywords }
      : {}),
    ...(dataset.geographic_scope
      ? {
          spatialCoverage: { "@type": "Place", name: dataset.geographic_scope },
        }
      : {}),
    ...(dataset.reference_period_start
      ? {
          temporalCoverage: dataset.reference_period_end
            ? `${dataset.reference_period_start}/${dataset.reference_period_end}`
            : dataset.reference_period_start,
        }
      : {}),
    isAccessibleForFree: true,
    distribution: (dataset.dataset_resources || []).map((resource) => ({
      "@type": "DataDownload",
      name: resource.original_filename,
      encodingFormat:
        {
          csv: "text/csv",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          json: "application/json",
          geojson: "application/geo+json",
          pdf: "application/pdf",
        }[resource.format] || resource.format,
      ...(siteOrigin
        ? {
            contentUrl: `${siteOrigin}/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`,
          }
        : {}),
    })),
  };
  const metadata = [
    { label: "Organisasi pengampu", value: dataset.organizations?.name },
    {
      label: "Periode data",
      value: dataset.reference_period_start
        ? `${formatDate(dataset.reference_period_start)}${dataset.reference_period_end ? ` – ${formatDate(dataset.reference_period_end)}` : ""}`
        : "Belum tersedia",
    },
    { label: "Cakupan wilayah", value: dataset.geographic_scope },
    {
      label: "Frekuensi pembaruan",
      value: getUpdateFrequencyLabel(dataset.update_frequency),
    },
    { label: "Sumber data", value: dataset.source_name },
    { label: "Lisensi", value: dataset.license_text },
    {
      label: "Satuan",
      value: dataset.unit || "Tidak berlaku / belum dicantumkan",
    },
    { label: "Diperbarui", value: formatDate(dataset.updated_at) },
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(datasetJsonLd) }}
      />
      <main className="page-container section-space public-interior-page dataset-detail-page">
        <Link
          href="/dataset"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary"
        >
          <ArrowLeft size={16} />
          Kembali ke katalog
        </Link>
        <div className="max-w-4xl">
          <Badge variant="primary">{dataset.category || "Dataset"}</Badge>
          <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            {dataset.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">
            {dataset.description ||
              "Deskripsi dataset belum dicantumkan oleh organisasi pengampu."}
          </p>
          <p className="mt-5 text-sm text-muted">
            Dipublikasikan {formatDate(dataset.published_at)} · Versi{" "}
            {dataset.current_version}
          </p>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-8">
            <div className="surface-panel p-5 sm:p-7">
              <h2 className="text-xl font-semibold">Informasi dataset</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                {metadata.map((item) => (
                  <div key={item.label} className="border-b pb-4">
                    <dt className="text-sm text-muted">{item.label}</dt>
                    <dd className="mt-1.5 break-words text-sm font-medium leading-6">
                      {item.value || "Belum tersedia"}
                    </dd>
                  </div>
                ))}
              </dl>
              {dataset.methodology ? (
                <div className="mt-6">
                  <h3 className="font-semibold">Metodologi</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted">
                    {dataset.methodology}
                  </p>
                </div>
              ) : null}
              {dataset.keywords?.length ? (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Kata kunci</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dataset.keywords.map((keyword) => (
                      <Badge key={keyword}>{keyword}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {isGeospatialDataset(dataset) ? (
              <section
                className="surface-panel p-5 sm:p-6"
                aria-labelledby="geospatial-viewer-title"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <MapPinned size={21} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      id="geospatial-viewer-title"
                      className="text-lg font-semibold"
                    >
                      Jelajahi melalui Peta Interaktif{" "}
                      {siteConfig.regionShortName}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {getGeoPortalUrl()
                        ? `Untuk melihat konteks lokasi dan peta tematik, buka GeoPortal ${siteConfig.regionShortName}. Metadata, sumber, versi, dan berkas resmi dataset tetap tersedia dari katalog Satu Data ini.`
                        : "Tautan GeoPortal untuk instansi ini belum dikonfigurasi. Metadata, sumber, versi, dan berkas resmi dataset tetap tersedia dari katalog Satu Data ini."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {getGeoPortalUrl() ? (
                        <a
                          href={getGeoPortalUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                        >
                          <MapPinned size={16} aria-hidden="true" />
                          Buka peta interaktif
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      ) : null}
                      <a
                        href={`/api/v1/datasets/${encodeURIComponent(dataset.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-2 rounded-control border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                      >
                        <Code2 size={16} aria-hidden="true" />
                        Metadata API (JSON)
                      </a>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Integrasi layer GeoPortal perlu menggunakan URL distribusi
                      atau API dataset yang stabil. Membuka peta tidak
                      menggantikan proses publikasi atau pengambilan metadata
                      otomatis dari Portal Satu Data.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
            <div>
              <h2 className="text-xl font-semibold">Berkas unduhan</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Berkas hanya tersedia jika versi publik telah selesai diproses.
              </p>
              <div className="mt-4 space-y-3">
                {dataset.dataset_resources?.filter((r) =>
                  ["csv", "xlsx", "pdf", "json", "geojson"].includes(r.format),
                ).length ? (
                  dataset.dataset_resources
                    .filter((r) =>
                      ["csv", "xlsx", "pdf", "json", "geojson"].includes(
                        r.format,
                      ),
                    )
                    .map((resource) => (
                      <div
                        key={resource.id}
                        className="surface-panel flex items-center gap-4 p-4"
                      >
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                          <FileSpreadsheet size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {resource.original_filename}
                          </p>
                          <p className="mt-1 text-xs uppercase text-muted">
                            {resource.format} ·{" "}
                            {formatBytes(resource.size_bytes)}
                          </p>
                        </div>
                        <a
                          href={`/api/v1/datasets/${encodeURIComponent(dataset.slug)}/resources/${encodeURIComponent(resource.id)}`}
                          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-control border bg-white px-3 text-sm font-semibold text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                        >
                          <Download size={15} aria-hidden="true" />
                          Unduh
                        </a>
                      </div>
                    ))
                ) : (
                  <div className="surface-panel p-5 text-sm text-muted">
                    Belum ada berkas publik untuk versi dataset ini.
                  </div>
                )}
              </div>
              {dataset.dataset_resources
                ?.filter(
                  (resource) =>
                    resource.format === "csv" && resource.preview_enabled,
                )
                .slice(0, 1)
                .map((resource) => (
                  <DatasetResourcePreview
                    key={resource.id}
                    slug={dataset.slug}
                    resource={resource}
                  />
                ))}
            </div>
          </section>
          <aside className="h-fit rounded-card border bg-white p-5">
            <h2 className="font-semibold">Menggunakan data ini</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Cantumkan judul dataset, organisasi pengampu, versi, dan tanggal
              akses saat mengutip data.
            </p>
            {safeHttpUrl(dataset.source_url) ? (
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
                href={safeHttpUrl(dataset.source_url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Sumber asli <ExternalLink size={14} />
              </a>
            ) : null}
            <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted">
              Periksa kembali definisi indikator dan cakupan wilayah sebelum
              membandingkan data lintas periode.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
