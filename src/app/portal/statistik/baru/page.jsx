import { ChartNoAxesCombined } from "lucide-react";
import { redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalShell } from "@/components/portal-shell";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorForm } from "@/components/admin/indicator-form";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Indikator baru",
  robots: { index: false, follow: false },
};
export default async function NewIndicatorPage() {
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role,organizations(id,name)")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_indicator_new_memberships");
  if (
    !(memberships || []).some((m) =>
      ["super_admin", "data_admin", "admin_opd", "editor"].includes(m.role),
    )
  )
    redirect("/portal/statistik");
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
      "portal_indicator_new_organizations",
    );
    orgs = organizations || [];
  } else {
    orgs = (memberships || [])
      .filter((m) => ["admin_opd", "editor"].includes(m.role))
      .map((m) => m.organizations)
      .filter(Boolean);
  }
  return (
    <PortalShell email={user.email}>
      <PageHeading
        eyebrow="Indikator statistik"
        title={
          <span className="inline-flex items-center gap-2">
            <ChartNoAxesCombined size={22} aria-hidden="true" />
            Indikator baru
          </span>
        }
        description="Terangkan apa yang diukur, satuan yang dipakai, asal nilai, dan periode datanya. Informasi ini membantu orang lain membaca indikator dengan benar."
      />
      <PortalContextGuide />

      <IndicatorForm organizations={orgs} />
    </PortalShell>
  );
}
