import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChartNoAxesCombined } from "lucide-react";
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
  let observations;
  try {
    [indicator, observations] = await Promise.all([
      portalData(`indicators/${encodeURIComponent(id)}`),
      portalData(`indicators/${encodeURIComponent(id)}/observations`),
    ]);
  } catch (error) {
    if (Number(error?.status) === 404) notFound();
    throw error;
  }
  if (!indicator) notFound();
  const { memberships = [] } = await getPortalShell();
  const global = (memberships || []).some((item) =>
    ["super_admin", "data_admin", "auditor"].includes(item.role),
  );
  const canEdit = (memberships || []).some(
    (item) =>
      ["super_admin", "data_admin"].includes(item.role) ||
      (item.organization_id === indicator.organization_id &&
        ["admin_opd", "editor"].includes(item.role)),
  );
  const canPublish = (memberships || []).some(
    (item) =>
      ["super_admin", "data_admin"].includes(item.role) ||
      (item.organization_id === indicator.organization_id &&
        ["admin_opd", "reviewer"].includes(item.role)),
  );
  const canRead =
    global ||
    (memberships || []).some(
      (item) => item.organization_id === indicator.organization_id,
    );
  if (!canRead) notFound();
  return (
    <>
      <Link
        href="/portal/statistik"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Kembali ke indikator
      </Link>
      <PageHeading
        eyebrow="Statistik dan indikator"
        title="Observasi indikator"
        description="Tambahkan dan kelola nilai untuk tiap periode, wilayah, atau dimensi. Nilai berstatus Draf belum tersedia di API publik sampai diperiksa dan diterbitkan."
      >
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
        <p className="mt-3 text-xs text-muted">
          Alamat API nilai indikator:{" "}
          <code>/api/v1/indicators/{indicator.slug}/observations</code>
        </p>
      </section>
      <IndicatorObservationManager
        indicator={indicator}
        observations={observations || []}
        canEdit={canEdit}
        canPublish={canPublish}
      />
    </>
  );
}
