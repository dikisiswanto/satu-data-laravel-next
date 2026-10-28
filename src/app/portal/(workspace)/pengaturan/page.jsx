import { redirect } from "next/navigation";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { portalData } from "@/lib/backend/portal-api";
import { PortalContextGuide } from "@/components/portal-context-guide";
import { PortalPageHeading as PageHeading } from "@/components/portal-page-heading";
import { ProfileForm } from "@/components/admin/profile-form";
import { PasswordForm } from "@/components/admin/password-form";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Pengaturan akun",
  robots: { index: false, follow: false },
};
export default async function SettingsPage() {
  const {
    data: { user },
  } = await getRequestVerifiedUser();
  if (!user) redirect("/portal/login");
  const profile = await portalData("profile");
  return (
    <>
      <PageHeading
        eyebrow="Akun"
        title="Pengaturan akun"
        description="Periksa identitas akun, perbarui nama tampilan, atau ganti kata sandi."
      />
      <PortalContextGuide />

      <section className="w-full portal-form-card p-5 sm:p-7 lg:p-8">
        <dl className="space-y-4">
          <div className="border-b pb-4">
            <dt className="text-sm text-muted">Email akun</dt>
            <dd className="mt-1 font-medium">
              {user.email || "Email belum tercatat"}
            </dd>
          </div>
          <div className="border-b pb-4">
            <dt className="text-sm text-muted">Nama tampilan</dt>
            <dd className="mt-1 font-medium">
              {profile?.display_name || "Belum diatur"}
            </dd>
          </div>
          <div className="border-b pb-4">
            <dt className="text-sm text-muted">Status akun</dt>
            <dd className="mt-1 font-medium">
              {profile?.is_active === false
                ? "Nonaktif"
                : profile?.is_active === true
                  ? "Aktif"
                  : "Belum diketahui"}
            </dd>
          </div>
        </dl>
        <ProfileForm displayName={profile?.display_name || ""} />
        <PasswordForm />
        <p className="mt-5 text-sm leading-6 text-muted">
          Email masuk dan perlindungan akun dikelola oleh layanan keamanan.
          Untuk mengubah peran atau akses organisasi, hubungi administrator.
          Perubahan akses dicatat dalam riwayat aktivitas.
        </p>
      </section>
    </>
  );
}
