import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { OrganizationForm } from "@/components/admin/organization-form";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tambah organisasi",
  robots: { index: false, follow: false },
};
export default async function NewOrganizationPage() {
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: members, error: membersError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membersError, "portal_organization_new_memberships");
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
