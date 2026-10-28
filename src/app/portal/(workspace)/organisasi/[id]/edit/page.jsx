import { notFound, redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { OrganizationForm } from "@/components/admin/organization-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ubah organisasi",
  robots: { index: false, follow: false },
};
export default async function EditOrganizationPage({ params }) {
  const { id } = await params;
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  if (!memberships.some((m) => ["super_admin", "data_admin"].includes(m.role)))
    redirect("/portal/organisasi");
  let org;
  try {
    org = await portalData(`organizations/${encodeURIComponent(id)}`);
  } catch (error) {
    if ([403, 404].includes(error.status)) notFound();
    throw error;
  }
  if (!org) notFound();
  return (
    <>
      <PageHeading
        eyebrow="Tata kelola kelembagaan"
        title="Ubah organisasi"
        description="Perbarui identitas dan kontak organisasi jika ada perubahan. Jika organisasi dinonaktifkan, dataset dan riwayat yang sudah tercatat tetap disimpan."
      />
      <PortalContextGuide />

      <OrganizationForm initial={org} />
    </>
  );
}
