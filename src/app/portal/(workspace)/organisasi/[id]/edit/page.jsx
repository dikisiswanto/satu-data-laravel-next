import { notFound, redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { OrganizationForm } from "@/components/admin/organization-form";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Ubah organisasi",
  robots: { index: false, follow: false },
};
export default async function EditOrganizationPage({ params }) {
  const { id } = await params;
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
  assertBackendQuery(membersError, "portal_organization_edit_memberships");
  if (
    !(members || []).some((m) => ["super_admin", "data_admin"].includes(m.role))
  )
    redirect("/portal/organisasi");
  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      "id,code,slug,name,short_name,official_email,official_url,description,is_active",
    )
    .eq("id", id)
    .maybeSingle();
  assertBackendQuery(error, "portal_organization_edit_detail");
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
