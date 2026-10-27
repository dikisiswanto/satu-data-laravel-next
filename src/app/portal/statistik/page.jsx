import { redirect } from "next/navigation";
import Link from "next/link";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { PortalShell } from "@/components/portal-shell";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IndicatorActions } from "@/components/admin/indicator-actions";
import { PortalDataTable } from "@/components/admin/portal-data-table";
import { Plus, ChartNoAxesCombined } from "lucide-react";
import { assertBackendQuery } from "@/lib/backend/query-guard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Indikator statistik",
  robots: { index: false, follow: false },
};
export default async function IndicatorsAdminPage({ searchParams }) {
  const params = await searchParams;
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
  assertBackendQuery(membershipsError, "portal_indicator_memberships");
  const global = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "auditor"].includes(m.role),
  );
  const globalManager = (memberships || []).some((m) =>
    ["super_admin", "data_admin"].includes(m.role),
  );
  const canCreate = (memberships || []).some((m) =>
    ["super_admin", "data_admin", "admin_opd", "editor"].includes(m.role),
  );
  const ids = (memberships || []).map((m) => m.organization_id).filter(Boolean);
  let query = supabase
    .from("indicators")
    .select(
      "id,code,slug,title,definition,unit,source_name,period_label,status,organization_id,updated_at,organizations(name)",
    )
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
        eyebrow="Statistik"
        title="Indikator statistik"
        description="Kelola definisi indikator dan nilai statistiknya. Setiap indikator perlu memiliki satuan, sumber, dan periode yang jelas agar angkanya tidak salah ditafsirkan."
      >
        {canCreate ? (
          <Button href="/portal/statistik/baru">
            <Plus size={16} aria-hidden="true" />
            <ChartNoAxesCombined size={16} aria-hidden="true" />
            Indikator baru
          </Button>
        ) : null}
      </PageHeading>
      <PortalContextGuide />
      {params?.saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          Indikator berhasil disimpan sebagai draf.
        </p>
      ) : null}
      <section className="portal-workspace-panel">
        <div className="portal-panel-heading">
          <div>
            <h2 className="text-base font-semibold">Daftar indikator</h2>
            <p className="mt-1 text-sm text-muted">
              Indikator yang dapat Anda akses, beserta status pemeriksaannya.
            </p>
          </div>
          <span className="portal-result-count">
            {error
              ? "Data belum tersedia"
              : `${(data || []).length.toLocaleString("id-ID")} indikator`}
          </span>
        </div>
        {error ? (
          <div className="portal-state-panel portal-state-error" role="alert">
            <h3>Daftar indikator belum dapat ditampilkan</h3>
            <p>
              Coba muat ulang halaman beberapa saat lagi. Jika masalah tetap
              muncul, hubungi administrator portal.
            </p>
          </div>
        ) : (
          <PortalDataTable
            caption="Daftar indikator statistik"
            rows={data || []}
            alwaysShowFilters={["status", "organization_name"]}
            filterLabelOverrides={{
              status: "Status",
              organization_name: "Organisasi",
            }}
            columns={[
              {
                key: "title",
                label: "Indikator",
                render: (item) => (
                  <div className="portal-dataset-title-cell">
                    <span className="portal-table-primary-link">
                      {item.title}
                    </span>
                    <span className="portal-table-subtext">{item.code}</span>
                  </div>
                ),
              },
              {
                key: "organization",
                label: "Organisasi",
                render: (item) =>
                  item.organizations?.name || "Organisasi belum ditetapkan",
              },
              {
                key: "unit",
                label: "Satuan / periode",
                render: (item) => (
                  <div>
                    {item.unit || "Satuan belum tersedia"}
                    <span className="portal-table-subtext block">
                      {item.period_label || "Periode belum tersedia"}
                    </span>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (item) => (
                  <Badge
                    variant={
                      item.status === "published"
                        ? "success"
                        : item.status === "review"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {{
                      draft: "Draf",
                      review: "Menunggu pemeriksaan",
                      published: "Terbit",
                      archived: "Diarsipkan",
                    }[item.status] || item.status}
                  </Badge>
                ),
              },
              {
                key: "observations",
                label: "Deret nilai",
                render: (item) => (
                  <Link
                    href={`/portal/statistik/${item.id}/observasi`}
                    className="inline-flex items-center rounded-lg border border-line px-3 py-2 text-xs font-semibold text-primary hover:bg-surface-secondary"
                  >
                    Kelola observasi
                  </Link>
                ),
              },
              {
                key: "actions",
                label: "Tindakan",
                render: (item) => (
                  <IndicatorActions
                    id={item.id}
                    status={item.status}
                    canEdit={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "editor"].includes(m.role),
                      )
                    }
                    canSubmit={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "editor"].includes(m.role),
                      )
                    }
                    canReview={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          ["admin_opd", "reviewer"].includes(m.role),
                      )
                    }
                    canArchive={
                      globalManager ||
                      (memberships || []).some(
                        (m) =>
                          m.organization_id === item.organization_id &&
                          m.role === "admin_opd",
                      )
                    }
                  />
                ),
              },
            ]}
            emptyTitle="Belum ada indikator statistik"
            emptyDescription="Mulai dengan menambahkan indikator yang memiliki definisi, satuan, sumber, periode, dan nilai yang dapat ditelusuri. Perubahan akan tercatat di riwayat aktivitas."
            emptyAction={
              canCreate ? (
                <Link
                  href="/portal/statistik/baru"
                  className="portal-table-action"
                >
                  Buat indikator
                </Link>
              ) : null
            }
          />
        )}
      </section>
    </PortalShell>
  );
}
