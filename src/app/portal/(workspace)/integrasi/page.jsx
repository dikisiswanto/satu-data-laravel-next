import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileJson,
  Network,
  TriangleAlert,
} from "lucide-react";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { getSdiExportResources, getSdiMetadataGaps } from "@/lib/sdi/metadata";
import { SdiPreflightButton } from "@/components/admin/sdi-preflight-button";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kesiapan integrasi SDI",
  robots: { index: false, follow: false },
};

export default async function SdiIntegrationPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  const allowedRoles = [
    "super_admin",
    "data_admin",
    "admin_opd",
    "editor",
    "reviewer",
    "auditor",
  ];
  if (
    !(memberships || []).some((membership) =>
      allowedRoles.includes(membership.role),
    )
  )
    redirect("/portal");

  const data = await portalData(
    "datasets?status=published&organization_active=1&published_at_not_null=1&limit=500&sort=title_asc&include_sdi_metadata=1",
  );

  const datasets = (data || []).map((dataset) => {
    const metadata =
      (dataset.dataset_sdi_metadata || []).find(
        (item) => item.dataset_version === dataset.current_version,
      ) || {};
    const resources = getSdiExportResources(
      dataset.dataset_resources || dataset.resources || [],
      dataset.current_version,
    );
    const missing = getSdiMetadataGaps(dataset, metadata, resources, {
      requireVerifiedRegistries: true,
    });
    return {
      ...dataset,
      sdiMetadata: metadata,
      currentResources: resources,
      missing,
    };
  });
  const ready = datasets.filter((dataset) => dataset.missing.length === 0);
  const needingWork = datasets.filter((dataset) => dataset.missing.length > 0);
  const editable = (memberships || []).some((membership) =>
    ["super_admin", "data_admin", "admin_opd", "editor"].includes(
      membership.role,
    ),
  );
  const canRunPreflight = (memberships || []).some((membership) =>
    ["super_admin", "data_admin"].includes(membership.role),
  );
  const recentRuns = canRunPreflight
    ? await portalData("sdi/harvest-runs?limit=5")
    : [];

  return (
    <>
      <PageHeading
        eyebrow="Interoperabilitas"
        title="Kesiapan integrasi Satu Data Indonesia"
        description="Halaman ini membantu Anda memeriksa apakah metadata dan berkas dataset sudah lengkap untuk dibagikan ke sistem lain. Hasil di sini hanya pemeriksaan dari portal Wajo; hasil ini belum berarti katalog sudah diterima oleh SPLP atau katalog nasional. Kode SDS dan kode referensi tetap perlu dicocokkan dengan sumber resmi."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Database}
          label="Dataset terbit"
          value={datasets.length}
          detail="Organisasi aktif"
        />
        <Metric
          icon={CheckCircle2}
          label="Metadata lengkap"
          value={ready.length}
          detail="Lolos pemeriksaan kelengkapan lokal"
          tone="success"
        />
        <Metric
          icon={TriangleAlert}
          label="Perlu dilengkapi"
          value={needingWork.length}
          detail="Belum masuk profil ekspor"
          tone={needingWork.length ? "warning" : "success"}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-[#cbdde9] bg-[#f4f8fb] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Network
            className="mt-0.5 shrink-0 text-[#285e85]"
            size={22}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 className="font-semibold text-[#153d5b]">
              Endpoint katalog untuk integrasi
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#45677f]">
              Tersedia dua bentuk keluaran untuk diuji bersama pengelola
              integrasi. JSON datar mengikuti nama kolom pada contoh pengambilan
              data otomatis di SDI, sedangkan DCAT/JSON-LD menggunakan istilah
              metadata yang baku. Kesesuaiannya tetap perlu diuji dengan
              spesifikasi dan akses resmi dari pengelola SPLP.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <EndpointCard
                href="/api/v1/sdi/data.json"
                label="JSON untuk pengambilan data otomatis"
                detail="/api/v1/sdi/data.json"
                format="JSON array"
              />
              <EndpointCard
                href="/api/v1/sdi/catalog"
                label="Katalog DCAT/JSON-LD"
                detail="/api/v1/sdi/catalog"
                format="application/ld+json"
              />
              <EndpointCard
                href="/api/v1/sdi/geoportal-manifest"
                label="Manifest GeoPortal"
                detail="/api/v1/sdi/geoportal-manifest"
                format="GeoJSON index"
              />
              <EndpointCard
                href="/api/v1/sdi/standards"
                label="Standar terverifikasi"
                detail="/api/v1/sdi/standards"
                format="JSON"
              />
              <EndpointCard
                href="/api/v1/sdi/reference-codes"
                label="Kode referensi"
                detail="/api/v1/sdi/reference-codes"
                format="JSON"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#45677f]">
              Alamat API saja belum membuat koneksi ke SPLP aktif. Pengelola
              integrasi perlu mendaftarkan katalog Wajo di sistem tujuan, lalu
              menguji pengambilan metadata dan berkas, pembaruan versi, serta
              penarikan dataset dari katalog.
            </p>
          </div>
        </div>
      </section>

      {canRunPreflight ? (
        <section className="mt-6 space-y-4">
          <SdiPreflightButton />
          {recentRuns?.length ? (
            <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
              <h2 className="font-semibold">Pemeriksaan sebelumnya</h2>
              <div className="mt-3 divide-y divide-line">
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {
                          {
                            sdi_flat: "Profil JSON datar",
                            dcat_jsonld: "Katalog DCAT/JSON-LD",
                            geoportal: "Manifest GeoPortal",
                          }[run.target]
                        }
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(run.finished_at).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Makassar",
                        })}{" "}
                        WITA · {run.summary?.eligible_count ?? 0} layak ·{" "}
                        {run.summary?.issue_count ?? 0} temuan
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${run.status === "passed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                    >
                      {run.status === "passed"
                        ? "Pemeriksaan lokal lulus"
                        : run.status === "warnings"
                          ? "Perlu ditinjau"
                          : "Gagal"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Riwayat ini menunjukkan hasil pemeriksaan di Portal Wajo.
                Riwayat ini belum menunjukkan bahwa sistem nasional sudah
                berhasil mengambil data.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-7 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Dataset yang perlu diperiksa
            </h2>
            <p className="mt-1 text-sm text-muted">
              Daftar ini menunjukkan informasi yang masih perlu dilengkapi pada
              versi dataset yang sedang diterbitkan.
            </p>
          </div>
          <span className="text-sm text-muted">
            {needingWork.length} dataset
          </span>
        </div>
        {needingWork.length ? (
          <div className="space-y-3">
            {needingWork.map((dataset) => (
              <article
                key={dataset.id}
                className="rounded-2xl border border-line bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">
                      {dataset.code} · {dataset.organizations?.name}
                    </p>
                    <h3 className="mt-1 font-semibold text-ink">
                      {dataset.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Masih perlu diisi: {dataset.missing.join(", ")}.
                    </p>
                    {dataset.draft_version ? (
                      <p className="mt-1 text-xs text-muted">
                        Versi {dataset.current_version} tetap terbit. Versi
                        kandidat {dataset.draft_version} sedang disiapkan secara
                        terpisah.
                      </p>
                    ) : null}
                  </div>
                  {editable ? (
                    <Link
                      href={`/portal/integrasi/${dataset.id}`}
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-secondary"
                    >
                      Lengkapi metadata{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
            <p className="font-semibold">
              Semua dataset terbit memenuhi pemeriksaan kelengkapan lokal.
            </p>
            <p className="mt-1">
              Langkah berikutnya adalah menguji API bersama pengelola sistem
              tujuan. Lolos pemeriksaan di portal ini belum berarti SPLP atau
              SDI sudah menerima katalog.
            </p>
          </div>
        )}
      </section>

      <section className="mt-7 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ClipboardCheck
            size={22}
            className="mt-0.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <h2 className="font-semibold">
              Apa yang diperiksa sebelum data dibagikan
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
              <li>
                Hanya dataset yang sudah dipublikasikan, memiliki organisasi
                aktif, dan versi aktifnya dapat diakses yang dipertimbangkan.
              </li>
              <li>
                Kolom yang terisi belum tentu berarti kodenya benar. Cocokkan
                DDP, SDS, kode referensi, definisi, ukuran, satuan, klasifikasi
                penyajian, dan metode dengan registri atau sumber resmi sebelum
                memakai konektor untuk pertukaran data.
              </li>
              <li>
                Ekspor hanya memuat distribusi publik yang berhasil diproses.
                Sumber draf, berkas privat, dan keluaran versi lama tidak
                dimasukkan.
              </li>
              <li>
                Isi kode standar dan definisi berdasarkan registri resmi. Jika
                belum menemukan rujukan, biarkan sebagai pekerjaan yang perlu
                dilengkapi dan minta bantuan Walidata; jangan mengganti dengan
                kode perkiraan.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ icon: Icon, label, value, detail, tone }) {
  const valueClass =
    tone === "warning"
      ? "text-amber-800"
      : tone === "success"
        ? "text-emerald-800"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon size={17} aria-hidden="true" />
        {label}
      </div>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function EndpointCard({ href, label, detail, format }) {
  return (
    <div className="rounded-xl border border-[#d0dfeb] bg-white p-3">
      <div className="flex min-w-0 items-start gap-2">
        <FileJson
          size={16}
          className="shrink-0 text-[#285e85]"
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-5 text-[#193d59]">
          {label}
        </p>
        <span className="shrink-0 whitespace-nowrap text-[11px] leading-5 text-[#45677f]">
          {format}
        </span>
      </div>
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {detail}
        <ArrowUpRight size={13} aria-hidden="true" />
      </Link>
    </div>
  );
}
