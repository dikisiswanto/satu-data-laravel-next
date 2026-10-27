import { redirect } from "next/navigation";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalShell } from "@/components/portal-shell";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ReviewActions } from "@/components/admin/review-actions";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pemeriksaan data",
  robots: { index: false, follow: false },
};
export default async function ReviewPage() {
  const supabase = await createBackendServerClient();
  const {
    data: { user },
  } = await getRequestVerifiedUser(supabase);
  if (!user) redirect("/portal/login");
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  assertBackendQuery(membershipsError, "portal_review_memberships");
  const global = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "auditor"].includes(m.role),
  );
  const canPublish = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd"].includes(m.role),
  );
  const canReturn = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd", "reviewer"].includes(m.role),
  );
  const ids = (memberships || []).map((m) => m.organization_id).filter(Boolean);
  let query = supabase
    .from("datasets")
    .select("id,title,status,updated_at,organizations(name)")
    .in("status", ["review", "published"])
    .order("updated_at", { ascending: false })
    .limit(500);
  if (!global) {
    if (!ids.length) query = null;
    else query = query.in("organization_id", ids);
  }
  const { data, error } = query ? await query : { data: [], error: null };
  return (
    <PortalShell email={user.email}>
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
    </PortalShell>
  );
}
