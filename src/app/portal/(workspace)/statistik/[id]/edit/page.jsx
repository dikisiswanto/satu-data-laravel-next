import { notFound, redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorForm } from "@/components/admin/indicator-form";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ubah indikator",
  robots: { index: false, follow: false },
};
export default async function EditIndicatorPage({ params }) {
  const { id } = await params;
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: indicator, error } = await supabase
    .from("indicators")
    .select(
      "id,organization_id,status,code,slug,title,definition,unit,source_name,period_label,value_numeric,value_text,reference_period_start,reference_period_end",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(error, "portal_indicator_edit_detail");
  if (!indicator) notFound();
  if (!["draft", "review"].includes(indicator.status))
    redirect("/portal/statistik");
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role,organizations(id,name)")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_indicator_edit_memberships");
  if (
    !(memberships || []).some(
      (m) =>
        ["super_admin", "data_admin"].includes(m.role) ||
        (m.organization_id === indicator.organization_id &&
          ["admin_opd", "editor"].includes(m.role)),
    )
  )
    notFound();
  const global = (memberships || []).some((m) =>
    ["super_admin", "data_admin"].includes(m.role),
  );
  let orgs;
  if (global) {
    const { data: organizations, error: organizationsError } = await supabase
      .from("organizations")
      .select("id,name")
      .eq("is_active", true)
      .order("name");
    assertBackendQuery(
      organizationsError,
      "portal_indicator_edit_organizations",
    );
    orgs = organizations || [];
  } else {
    orgs = (memberships || [])
      .filter((m) => ["admin_opd", "editor"].includes(m.role))
      .map((m) => m.organizations)
      .filter(Boolean);
  }
  return (
    
      <PageHeading
        eyebrow="Indikator statistik"
        title="Ubah indikator"
        description="Perubahan akan disimpan sebagai draf terlebih dahulu. Periksa kembali definisi dan sumbernya sebelum menerbitkan indikator."
      />
      <PortalContextGuide />

      <IndicatorForm organizations={orgs} initial={indicator} />
    
  );
}
