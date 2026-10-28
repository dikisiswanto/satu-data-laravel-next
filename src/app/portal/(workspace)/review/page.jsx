import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { getPortalShell, portalApi } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ReviewActions } from "@/components/admin/review-actions";
import { PortalDataTable } from "@/components/admin/portal-data-table";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pemeriksaan data",
  robots: { index: false, follow: false },
};
export default async function ReviewPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const { memberships = [] } = await getPortalShell();
  const canPublish = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd"].includes(m.role),
  );
  const canReturn = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd", "reviewer"].includes(m.role),
  );
  const result = await portalApi(
    "datasets?statuses=review,published&limit=500&sort=updated_desc",
  );
  const data = result?.data || [];
  const error = null;
  return (
    <>
      <PageHeading
        eyebrow="Tata kelola"
        title="Pemeriksaan data"
        description="Periksa metadata, sumber, periode, dan hasil pengolahan berkas. Jika ada informasi yang belum jelas, kembalikan dengan catatan perbaikan yang spesifik."
      />
      <PortalContextGuide />

      <section id="portal-review-list" className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar pemeriksaan</h2>
            <p className="mt-1 text-sm text-muted">
              Dataset yang menunggu keputusan pemeriksaan atau telah terbit,
              sesuai cakupan akses Anda.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${(data || []).length.toLocaleString("id-ID")} dataset`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Daftar pemeriksaan belum dapat dimuat</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Daftar dataset untuk pemeriksaan"
            rows={data || []}
            alwaysShowFilters={["status", "organization_name"]}
            filterLabelOverrides={{
              status: "Status",
              organization_name: "Organisasi",
            }}
            columns={[
              {
                key: "title",
                label: "Dataset",
                render: (item) => (
                  <Link
                    href={`/portal/dataset/${item.id}`}
                    className="portal-table-primary-link"
                  >
                    {item.title}
                  </Link>
                ),
              },
              {
                key: "organization",
                label: "Organisasi",
                render: (item) =>
                  item.organizations?.name || "Belum dicantumkan",
              },
              {
                key: "updated_at",
                label: "Diperbarui",
                render: (item) =>
                  new Date(item.updated_at).toLocaleDateString("id-ID", {
                    timeZone: "Asia/Makassar",
                    dateStyle: "medium",
                  }),
              },
              {
                key: "status",
                label: "Status",
                render: (item) => (
                  <Badge
                    variant={
                      item.status === "published" ? "success" : "warning"
                    }
                  >
                    {item.status === "published"
                      ? "Terbit"
                      : "Menunggu pemeriksaan"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (item) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="portal-table-action"
                      href={`/portal/dataset/${item.id}`}
                    >
                      Periksa
                    </Link>
                    <ReviewActions
                      id={item.id}
                      status={item.status}
                      canPublish={canPublish}
                      canReturn={canReturn}
                    />
                  </div>
                ),
              },
            ]}
            emptyTitle="Tidak ada dataset yang menunggu tindakan"
            emptyDescription="Dataset yang menunggu pemeriksaan atau dapat Anda tinjau akan muncul di sini sesuai akses akun Anda."
          />
        )}
      </section>
    </>
  );
}
