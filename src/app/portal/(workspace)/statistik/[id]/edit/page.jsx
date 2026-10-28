import { notFound, redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { IndicatorForm } from "@/components/admin/indicator-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ubah indikator",
  robots: { index: false, follow: false },
};
export default async function EditIndicatorPage({ params }) {
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
    throw error;
  }
  if (!indicator) notFound();
  if (!["draft", "review"].includes(indicator.status))
    redirect("/portal/statistik");
  const { memberships = [] } = await getPortalShell();
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
        title="Ubah indikator"
        description="Perubahan akan disimpan sebagai draf terlebih dahulu. Periksa kembali definisi dan sumbernya sebelum menerbitkan indikator."
      />
      <PortalContextGuide />

      <IndicatorForm organizations={orgs} initial={indicator} />
    </>
  );
}
