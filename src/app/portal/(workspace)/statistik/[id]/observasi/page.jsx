import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChartNoAxesCombined } from "lucide-react";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorObservationManager } from "@/components/admin/indicator-observation-manager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Observasi indikator",
  robots: { index: false, follow: false },
};

export default async function IndicatorObservationsPage({ params }) {
  const { id } = await params;
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: indicator, error: indicatorError } = await supabase
    .from("indicators")
    .select(
      "id,code,slug,title,definition,unit,source_name,organization_id,status,period_label,value_numeric,value_text",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(indicatorError, "portal_indicator_observations_detail");
  if (!indicator) notFound();
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(
    membershipError,
    "portal_indicator_observations_memberships",
  );
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
  const { data: observations, error: observationError } = await supabase
    .from("indicator_observations")
    .select(
      "id,indicator_id,period_start,period_end,period_label,geographic_code,geographic_name,dimension_key,dimensions,value_numeric,value_text,unit,source_name,source_url,revision_no,is_current,status,quality_status,published_at,created_at,updated_at",
    )
    .eq("indicator_id", id)
    .order("created_at", { ascending: false })
    .order("revision_no", { ascending: false })
    .limit(500);
  assertBackendQuery(observationError, "portal_indicator_observations_list");
  return (
    
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
    
  );
}
