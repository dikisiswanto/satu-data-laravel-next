import Link from "next/link";
import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { InviteUserForm } from "@/components/admin/invite-user-form";
import { MembershipStatusAction } from "@/components/admin/membership-status-action";
import { MembershipForm } from "@/components/admin/membership-form";
import { PortalDataTable } from "@/components/admin/portal-data-table";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pengguna dan akses",
  robots: { index: false, follow: false },
};
const labels = {
  super_admin: "Super administrator",
  data_admin: "Administrator data",
  admin_opd: "Administrator OPD",
  reviewer: "Pemeriksa data",
  editor: "Editor data",
  viewer: "Pembaca",
  auditor: "Auditor",
};
export default async function UserAccessPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships: myMemberships = [] } = await getPortalShell();
  const superAdmin = (myMemberships || []).some(
    (m) => m.role === "super_admin",
  );
  const globalAdmin = (myMemberships || []).some((m) =>
    ["super_admin", "data_admin", "auditor"].includes(m.role),
  );
  if (!globalAdmin) redirect("/portal");
  // These two admin tables do not depend on each other's result.
  let orgs = [];
  let memberships = [];
  let error = false;
  try {
    [orgs, memberships] = await Promise.all([
      portalData("organizations"),
      portalData("memberships"),
    ]);
  } catch (cause) {
    if (Number(cause?.status) === 401) redirect("/portal/login");
    error = true;
  }
  return (
    <>
      <PageHeading
        eyebrow="Administrasi akses"
        title="Pengguna dan akses"
        description="Atur akses sesuai pekerjaan dan organisasi pengguna. Pilih akses yang paling terbatas tetapi tetap cukup untuk tugasnya."
      />
      <PortalContextGuide />

      {error ? (
        <div
          className="portal-state-panel portal-state-error mb-6"
          role="alert"
        >
          <h2>Data pengguna dan organisasi belum dapat dimuat</h2>
          <p>
            Formulir akses sementara disembunyikan agar pilihan pengguna atau
            organisasi yang kosong tidak menyebabkan perubahan yang keliru.
          </p>
          <Link
            className="mt-3 inline-flex font-semibold underline"
            href="/portal/pengguna"
          >
            Coba muat ulang
          </Link>
        </div>
      ) : null}
      {!error ? (
        <div id="portal-users-access" className="grid gap-5 xl:grid-cols-2">
          {superAdmin ? (
            <InviteUserForm organizations={orgs || []} />
          ) : (
            <section className="rounded-card border bg-white p-5">
              <h2 className="font-semibold">Undang pengguna</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Hanya administrator utama yang dapat mengundang pengguna dan
                mengubah hak aksesnya.
              </p>
            </section>
          )}
          {superAdmin ? <MembershipForm organizations={orgs || []} /> : null}
        </div>
      ) : null}
      <section className="portal-workspace-panel mt-8">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar akses</h2>
            <p className="mt-1 text-sm text-muted">
              Setiap baris menunjukkan satu peran pengguna pada lingkup global
              atau organisasi tertentu.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${(memberships || []).length.toLocaleString("id-ID")} akses`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Daftar akses belum dapat dimuat</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Daftar peran dan akses pengguna"
            rows={memberships}
            alwaysShowFilters={["role", "is_active", "organization_name"]}
            filterLabelOverrides={{
              role: "Peran",
              is_active: "Status",
              organization_name: "Organisasi",
            }}
            columns={[
              {
                key: "organization",
                label: "Lingkup",
                render: (m) => (
                  <div className="portal-dataset-title-cell">
                    <span className="portal-table-primary-link">
                      {m.display_name || m.email || "Pengguna belum bernama"}
                    </span>
                    <span className="portal-table-subtext break-all">
                      {m.email || `ID ${m.user_id}`}
                    </span>
                    <span className="portal-table-subtext">
                      Lingkup: {m.organizations?.name || "Seluruh portal"}
                    </span>
                  </div>
                ),
              },
              {
                key: "role",
                label: "Peran",
                render: (m) => labels[m.role] || m.role,
              },
              {
                key: "created_at",
                label: "Ditambahkan",
                render: (m) =>
                  new Date(m.created_at).toLocaleDateString("id-ID", {
                    timeZone: "Asia/Makassar",
                    dateStyle: "medium",
                  }),
              },
              {
                key: "status",
                label: "Status",
                render: (m) => (
                  <Badge variant={m.is_active ? "success" : "neutral"}>
                    {m.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (m) =>
                  superAdmin ? <MembershipStatusAction membership={m} /> : "—",
              },
            ]}
            emptyTitle="Belum ada akses yang ditetapkan"
            emptyDescription="Tambahkan peran dan organisasi agar pengguna dapat mengakses fitur yang diperlukan untuk pekerjaannya."
          />
        )}
      </section>
      <p className="mt-4 text-xs leading-5 text-muted">
        Untuk pengguna yang sudah memiliki akun, pilih ID akun lengkap lalu
        tetapkan peran dan lingkup organisasinya. Untuk mencabut akses,
        nonaktifkan aksesnya agar riwayat aktivitas tetap dapat ditelusuri.
      </p>
    </>
  );
}
