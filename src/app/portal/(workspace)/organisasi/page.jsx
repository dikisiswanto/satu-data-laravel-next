import { safeHttpUrl } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Building2 } from "lucide-react";
import { PortalDataTable } from "@/components/admin/portal-data-table";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Organisasi",
  robots: { index: false, follow: false },
};
const labels = {
  super_admin: "Super administrator",
  data_admin: "Administrator data",
  admin_opd: "Administrator OPD",
  reviewer: "Pemeriksa data",
  editor: "Penyunting data",
  viewer: "Pembaca",
  auditor: "Auditor",
};

export default async function OrganizationsPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  const global = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "auditor"].includes(m.role),
  );
  const canManage = (memberships || []).some((m) =>
    ["super_admin", "data_admin"].includes(m.role),
  );
  let unique = [];
  let error = false;
  try {
    const organizations = global
      ? await portalData("organizations")
      : memberships
          .map((membership) => membership.organizations)
          .filter(Boolean);
    unique = [
      ...new Map(
        organizations.map((organization) => [organization.id, organization]),
      ).values(),
    ];
  } catch (cause) {
    if (Number(cause?.status) === 401) redirect("/portal/login");
    error = true;
  }
  return (
    <>
      <PageHeading
        eyebrow="Tata kelola kelembagaan"
        title="Organisasi"
        description="Kelola organisasi yang menjadi pemilik dataset dan indikator dalam portal. Daftar yang ditampilkan menyesuaikan akses akun Anda."
      >
        {canManage ? (
          <Button href="/portal/organisasi/baru">
            <Plus size={16} aria-hidden="true" />
            <Building2 size={16} aria-hidden="true" />
            Tambah organisasi
          </Button>
        ) : null}
      </PageHeading>
      <PortalContextGuide />
      <section
        id="portal-organizations-list"
        className="portal-workspace-panel"
      >
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar organisasi</h2>
            <p className="mt-1 text-sm text-muted">
              Daftar organisasi yang dapat Anda akses, baik yang aktif maupun
              yang sudah dinonaktifkan.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${unique.length.toLocaleString("id-ID")} organisasi`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Daftar organisasi belum dapat dimuat</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Daftar organisasi pengampu"
            rows={unique}
            alwaysShowFilters={["is_active"]}
            filterLabelOverrides={{ is_active: "Status" }}
            columns={[
              {
                key: "name",
                label: "Organisasi",
                render: (org) => (
                  <div className="portal-dataset-title-cell">
                    <span className="portal-table-primary-link">
                      {org.name}
                    </span>
                    <span className="portal-table-subtext">
                      Kode: {org.code || "Belum dicantumkan"}
                    </span>
                  </div>
                ),
              },
              {
                key: "contact",
                label: "Kontak",
                render: (org) =>
                  org.official_email ? (
                    <a
                      className="portal-table-primary-link"
                      href={`mailto:${org.official_email}`}
                    >
                      {org.official_email}
                    </a>
                  ) : safeHttpUrl(org.official_url) ? (
                    <a
                      href={safeHttpUrl(org.official_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="portal-table-primary-link"
                    >
                      Situs resmi
                    </a>
                  ) : (
                    "Belum dicantumkan"
                  ),
              },
              {
                key: "status",
                label: "Status",
                render: (org) => (
                  <Badge variant={org.is_active ? "success" : "neutral"}>
                    {org.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                ),
              },
              {
                key: "roles",
                label: "Peran akun",
                render: (org) =>
                  (memberships || [])
                    .filter((m) => m.organization_id === org.id)
                    .map((m) => labels[m.role] || m.role)
                    .join(", ") || "—",
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (org) =>
                  canManage ? (
                    <Link
                      href={`/portal/organisasi/${org.id}/edit`}
                      className="portal-table-action"
                      prefetch={false}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Ubah
                    </Link>
                  ) : (
                    "—"
                  ),
              },
            ]}
            emptyTitle="Belum ada organisasi dalam cakupan akun"
            emptyDescription="Jika organisasi yang Anda perlukan tidak tercantum, minta administrator utama memperbarui cakupan akses akun Anda."
          />
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted">
        Perubahan identitas dan status organisasi hanya dapat dilakukan oleh
        administrator data. Menonaktifkan organisasi tidak menghapus dataset
        maupun riwayat yang terkait.
      </p>
    </>
  );
}
