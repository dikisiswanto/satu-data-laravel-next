import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Eye,
  History,
  ListChecks,
} from "lucide-react";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorObservationManager } from "@/components/admin/indicator-observation-manager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Observasi indikator",
  robots: { index: false, follow: false },
};

export default async function IndicatorObservationsPage({ params }) {
  const { id } = await params;
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  let indicator;
  try {
    indicator = await portalData(`indicators/${encodeURIComponent(id)}`);
  } catch (error) {
    if (Number(error?.status) === 404) notFound();
    if (Number(error?.status) === 403) {
      return (
        <ObservationPageUnavailable
          reason="forbidden"
          requestId={error?.requestId}
        />
      );
    }
    console.error("portal_indicator_detail_load_failed", {
      status: Number(error?.status || 0) || null,
      code: typeof error?.code === "string" ? error.code : "unknown_error",
      request_id: typeof error?.requestId === "string" ? error.requestId : null,
    });
    return (
      <ObservationPageUnavailable
        reason="service_unavailable"
        requestId={error?.requestId}
      />
    );
  }
  if (!indicator) notFound();

  // Keep the page usable when the observation endpoint has a problem. Previously
  // Promise.all() made one failed observations request replace the entire page
  // with a generic route error, hiding the status that would explain the cause.
  let observations = [];
  let observationLoadError = null;
  try {
    const result = await portalData(
      `indicators/${encodeURIComponent(id)}/observations`,
    );
    if (!Array.isArray(result)) {
      throw Object.assign(new Error("invalid_observation_list_response"), {
        code: "invalid_observation_list_response",
        status: 502,
      });
    }
    observations = result;
  } catch (error) {
    const status = Number(error?.status || 0) || 0;
    observationLoadError = {
      status,
      code: typeof error?.code === "string" ? error.code : "unknown_error",
      requestId: typeof error?.requestId === "string" ? error.requestId : null,
      reason:
        status === 403
          ? "forbidden"
          : status === 404
            ? "not_found"
            : status === 429
              ? "rate_limited"
              : status >= 500 || status === 0
                ? "service_unavailable"
                : "invalid_response",
    };
    console.error("portal_indicator_observations_load_failed", {
      indicator_id: id,
      status: status || null,
      code: observationLoadError.code,
      request_id: observationLoadError.requestId,
    });
  }
  const { memberships = [] } = await getPortalShell();
  const global = (memberships || []).some(
    (item) =>
      !item.organization_id &&
      ["super_admin", "data_admin", "auditor"].includes(item.role),
  );
  const canEdit = (memberships || []).some(
    (item) =>
      (!item.organization_id &&
        ["super_admin", "data_admin"].includes(item.role)) ||
      (item.organization_id === indicator.organization_id &&
        ["admin_opd", "editor"].includes(item.role)),
  );
  // Keep UI capabilities aligned with the backend permission catalog:
  // reviewer can return an indicator for changes but cannot publish it.
  const canPublish = (memberships || []).some(
    (item) =>
      (["super_admin", "data_admin"].includes(item.role) &&
        !item.organization_id) ||
      (item.organization_id === indicator.organization_id &&
        item.role === "admin_opd"),
  );
  const canRead =
    global ||
    (memberships || []).some(
      (item) => item.organization_id === indicator.organization_id,
    );
  if (!canRead) notFound();
  const draftCount = (observations || []).filter(
    (item) => item.status === "draft",
  ).length;
  const activePublishedCount = (observations || []).filter(
    (item) => item.status === "published" && item.is_current,
  ).length;
  const historicalCount = (observations || []).filter(
    (item) => item.status === "published" && !item.is_current,
  ).length;
  const indicatorPublished =
    indicator.status === "published" && Boolean(indicator.published_at);
  const indicatorInReview = indicator.status === "review";
  const indicatorArchived = indicator.status === "archived";
  return (
    <>
      <Link
        href="/portal/statistik"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
        prefetch={false}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali ke indikator
      </Link>
      <PageHeading
        eyebrow="Statistik dan indikator"
        title="Observasi indikator"
        description={
          indicatorPublished
            ? "Kelola nilai per periode dan wilayah. Nilai draf belum tampil ke publik; nilai terbit yang aktif menjadi bagian dari tren statistik."
            : indicatorInReview
              ? "Definisi sedang diperiksa. Anda dapat menyiapkan nilai sebagai draf; publikasi nilai tersedia setelah definisi disetujui dan diterbitkan."
              : indicatorArchived
                ? "Indikator diarsipkan. Riwayat nilai tetap tersedia untuk audit, tetapi nilai baru tidak dapat diterbitkan selama status ini."
                : "Siapkan nilai per periode dan wilayah sebagai draf. Terbitkan definisi indikator terlebih dahulu sebelum menerbitkan nilai dan menampilkannya pada tren publik."
        }
      >
        {indicatorPublished && indicator.slug ? (
          <Link
            href={`/statistik/${encodeURIComponent(indicator.slug)}`}
            target="_blank"
            rel="noreferrer"
            prefetch={false}
            className="inline-flex min-h-10 items-center gap-2 rounded-control bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Eye size={15} aria-hidden="true" /> Lihat tren publik
          </Link>
        ) : null}
        {canEdit && !indicatorInReview && !indicatorArchived ? (
          <Link
            href={`/portal/statistik/${encodeURIComponent(id)}/edit`}
            prefetch={false}
            className="inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-sm font-semibold hover:bg-surface-secondary"
          >
            Ubah definisi indikator
          </Link>
        ) : indicatorInReview ? (
          <span
            className="inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-xs text-muted"
            title="Perubahan definisi dilakukan setelah pemeriksa mengembalikan indikator ke draf."
          >
            Menunggu pemeriksaan definisi
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold">
          <ChartNoAxesCombined size={16} aria-hidden="true" />
          {indicator.code}
        </span>
      </PageHeading>
      <section className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Indikator
        </p>
        <h2 className="mt-1 text-lg font-semibold">{indicator.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {indicator.definition}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-surface-secondary px-3 py-1.5">
            Satuan utama: {indicator.unit}
          </span>
          <span className="rounded-full bg-surface-secondary px-3 py-1.5">
            Status:{" "}
            {{
              draft: "Draf",
              review: "Menunggu pemeriksaan",
              published: "Terbit",
              archived: "Diarsipkan",
            }[indicator.status] || indicator.status}
          </span>
        </div>
        <details className="mt-3 border-t border-line pt-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium">
            Informasi integrasi API
          </summary>
          <p className="mt-2">
            Alamat API nilai indikator:{" "}
            <code>/api/v1/indicators/{indicator.slug}/observations</code>
          </p>
        </details>
      </section>
      <section
        aria-label="Ringkasan status nilai indikator"
        className="mb-6 grid gap-3 sm:grid-cols-3"
      >
        <article className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <ListChecks size={16} aria-hidden="true" /> Draf menunggu terbit
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {draftCount.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Nilai belum masuk tren publik.
          </p>
        </article>
        <article className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Eye size={16} aria-hidden="true" /> Nilai aktif di publik
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {activePublishedCount.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Nilai terbit yang dipilih sebagai revisi aktif.
          </p>
        </article>
        <article className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <History size={16} aria-hidden="true" /> Riwayat revisi
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {historicalCount.toLocaleString("id-ID")}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Nilai sebelumnya tetap disimpan untuk jejak audit.
          </p>
        </article>
      </section>
      <IndicatorObservationManager
        indicator={indicator}
        observations={observations || []}
        canEdit={canEdit && !indicatorArchived && !observationLoadError}
        canPublish={canPublish}
        loadError={observationLoadError}
      />
    </>
  );
}

function ObservationPageUnavailable({ reason, requestId }) {
  const message =
    reason === "forbidden"
      ? "Akun Anda belum memiliki izin untuk membuka definisi indikator ini. Minta administrator memeriksa keanggotaan dan izin indikator."
      : "Layanan indikator sedang tidak dapat dihubungi. Muat ulang halaman setelah layanan pulih.";
  return (
    <section
      className="portal-workspace-panel max-w-3xl p-5 sm:p-7"
      aria-labelledby="observation-page-unavailable-title"
    >
      <h1
        id="observation-page-unavailable-title"
        className="text-lg font-semibold"
      >
        Observasi indikator belum dapat dibuka
      </h1>
      <p role="alert" className="mt-2 text-sm leading-6 text-muted">
        {message}
      </p>
      {requestId ? (
        <p className="mt-3 text-xs text-muted">
          ID permintaan: <code>{requestId}</code>
        </p>
      ) : null}
      <Link
        href="/portal/statistik"
        prefetch={false}
        className="mt-5 inline-flex min-h-10 items-center rounded-control border border-line px-3 py-2 text-sm font-semibold hover:bg-surface-secondary"
      >
        Kembali ke indikator
      </Link>
    </section>
  );
}
