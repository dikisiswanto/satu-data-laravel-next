import { redirect } from "next/navigation";
import { BadgeCheck, BookOpenCheck, Database } from "lucide-react";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { assertBackendQuery } from "@/lib/backend/query-guard";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { SdiRegistryManager } from "@/components/admin/sdi-registry-manager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Standar dan kode referensi",
  robots: { index: false, follow: false },
};

export default async function SdiStandardsPage() {
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipError, "portal_sdi_registry_memberships");
  const roles = (memberships || []).map((membership) => membership.role);
  if (
    !roles.some((role) =>
      [
        "super_admin",
        "data_admin",
        "reviewer",
        "auditor",
        "admin_opd",
        "editor",
      ].includes(role),
    )
  )
    redirect("/portal");
  const canManage = roles.some((role) =>
    ["super_admin", "data_admin"].includes(role),
  );
  const [standardsResult, systemsResult, entriesResult] = await Promise.all([
    supabase
      .from("sdi_standard_registry")
      .select(
        "id,standard_code,standard_type,title,definition,authority_name,version_label,source_url,evidence_url,status,valid_from,valid_until,created_at,reviewed_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("reference_code_systems")
      .select(
        "id,system_code,title,description,authority_name,version_label,source_url,evidence_url,status,valid_from,valid_until,created_at,reviewed_at",
      )
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("reference_code_entries")
      .select(
        "id,system_id,code,label,definition,parent_code,is_active,reference_code_systems!inner(system_code,title,status,version_label)",
      )
      .order("code")
      .limit(500),
  ]);
  assertBackendQuery(standardsResult.error, "portal_sdi_standards_registry");
  assertBackendQuery(systemsResult.error, "portal_reference_systems_registry");
  assertBackendQuery(entriesResult.error, "portal_reference_code_entries");
  const standards = standardsResult.data || [];
  const systems = systemsResult.data || [];
  const entries = entriesResult.data || [];
  const verifiedStandards = standards.filter(
    (item) => item.status === "verified",
  ).length;
  const verifiedSystems = systems.filter(
    (item) => item.status === "verified",
  ).length;
  return (
    <>
      <PageHeading
        eyebrow="Interoperabilitas dan tata kelola"
        title="Standar dan kode referensi"
        description="Daftarkan standar dan sistem kode yang menjadi acuan metadata dataset. Catatan baru berstatus Draf sampai sumber, dokumen pendukung, versi, dan masa berlakunya diperiksa."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={BookOpenCheck}
          label="Standar terdaftar"
          value={standards.length}
          detail="Menampilkan semua versi yang dapat Anda akses"
        />
        <Metric
          icon={BadgeCheck}
          label="Standar terverifikasi"
          value={verifiedStandards}
          detail="Sumber dan dokumen pendukung sudah diperiksa"
        />
        <Metric
          icon={Database}
          label="Sistem kode terverifikasi"
          value={verifiedSystems}
          detail={`${entries.length} entri kode dapat diperiksa`}
        />
      </div>
      <div className="mt-6">
        <SdiRegistryManager
          standards={standards}
          systems={systems}
          entries={entries}
          canManage={canManage}
        />
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon size={17} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}
