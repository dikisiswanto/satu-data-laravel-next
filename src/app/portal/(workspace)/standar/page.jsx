import { redirect } from "next/navigation";
import { BadgeCheck, BookOpenCheck, Database } from "lucide-react";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { SdiRegistryManager } from "@/components/admin/sdi-registry-manager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Standar dan kode referensi",
  robots: { index: false, follow: false },
};

export default async function SdiStandardsPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  const roles = memberships.map((membership) => membership.role);
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
  const catalog = await portalData("sdi/registry");
  const standards = catalog.standards || [];
  const systems = catalog.systems || [];
  const entries = catalog.entries || [];
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
