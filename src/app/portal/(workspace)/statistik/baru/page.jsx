import { ChartNoAxesCombined } from "lucide-react";
import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorForm } from "@/components/admin/indicator-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Indikator baru",
  robots: { index: false, follow: false },
};
export default async function NewIndicatorPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const shell = await getPortalShell();
  const memberships = shell?.memberships || [];
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
    orgs = await portalData("organizations");
  } else {
    orgs = (memberships || [])
      .filter((m) => ["admin_opd", "editor"].includes(m.role))
      .map((m) => m.organizations)
      .filter(Boolean);
  }
  return (
    <>
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
    </>
  );
}
