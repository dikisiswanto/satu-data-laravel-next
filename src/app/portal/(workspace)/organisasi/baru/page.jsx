import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { OrganizationForm } from "@/components/admin/organization-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tambah organisasi",
  robots: { index: false, follow: false },
};
export default async function NewOrganizationPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships: members = [] } = await getPortalShell();
  if (
    !(members || []).some((m) => ["super_admin", "data_admin"].includes(m.role))
  )
    redirect("/portal/organisasi");
  return (
    <>
      <PageHeading
        eyebrow="Tata kelola kelembagaan"
        title={
          <span className="inline-flex items-center gap-2">
            <Building2 size={22} aria-hidden="true" />
            Tambah organisasi
          </span>
        }
        description="Masukkan kode dan nama resmi organisasi. Jika tersedia, tambahkan email atau situs resmi agar pengguna dapat menghubungi pengampu data."
      />
      <PortalContextGuide />

      <OrganizationForm />
    </>
  );
}
