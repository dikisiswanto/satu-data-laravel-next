import Image from "next/image";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { loginAction } from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createBackendServerClient } from "@/lib/backend/compat-server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Masuk pengelola",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  let user = null;
  let sessionCheckError = false;
  let authUnavailable = false;
  try {
    const backend = await createBackendServerClient();
    const result = await backend.auth.getUser();
    user = result?.data?.user || null;
    sessionCheckError = Boolean(result?.error);
    if (result?.error && result.error.status !== 401) authUnavailable = true;
  } catch (error) {
    authUnavailable = true;
    console.error("portal_login_session_check_unavailable", { status: error?.status || null, code: error?.code || "unknown" });
  }
  if (user && !sessionCheckError && !authUnavailable) redirect("/portal");
  const error = authUnavailable ? "unavailable" : params?.error || undefined;
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Link href="/" className="login-back-link">
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke portal publik
        </Link>
        <div className="login-brand">
          <Image
            src="/logo-kabupaten-wajo.webp"
            alt="Lambang Kabupaten Wajo"
            width={48}
            height={56}
            priority
          />
          <div>
            <p>Pemerintah Kabupaten Wajo</p>
            <strong>Ruang Pengelola Data</strong>
          </div>
        </div>
        <div className="login-title-block">
          <span className="login-title-icon">
            <LockKeyhole size={19} aria-hidden="true" />
          </span>
          <div>
            <h1 id="login-title">Masuk ke Portal Admin</h1>
            <p>
              Gunakan alamat email dan kata sandi akun yang didaftarkan oleh
              administrator portal.
            </p>
          </div>
        </div>

        {error === "invalid" ? (
          <div role="alert" className="login-alert login-alert-error">
            Email atau kata sandi tidak sesuai. Periksa kembali informasi akun
            Anda.
          </div>
        ) : null}
        {error === "configuration" ? (
          <div role="alert" className="login-alert login-alert-warning">
            Layanan masuk belum siap digunakan. Hubungi administrator portal
            agar dapat diperiksa.
          </div>
        ) : null}
        {error === "unavailable" ? (
          <div role="alert" className="login-alert login-alert-warning">
            Kami belum dapat memeriksa sesi masuk Anda. Tunggu sebentar, lalu
            coba masuk kembali. Anda tidak perlu mengulang halaman berkali-kali.
          </div>
        ) : null}
        {error === "session" ? (
          <div role="alert" className="login-alert login-alert-warning">
            Sesi masuk sudah berakhir atau tidak dapat diperiksa. Masuk kembali
            untuk melanjutkan.
          </div>
        ) : null}
        {params?.reset === "1" ? (
          <div
            role="status"
            className="login-alert border-emerald-200 bg-emerald-50 text-emerald-900"
          >
            Kata sandi Anda sudah diperbarui. Masuk menggunakan kata sandi baru.
          </div>
        ) : null}

        <form action={loginAction} className="login-form">
          <input
            type="hidden"
            name="next"
            value={typeof params?.next === "string" ? params.next : "/portal"}
          />
          <div>
            <label htmlFor="email" className="login-label">
              Alamat email
            </label>
            <input
              className="field"
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              required
              maxLength={254}
              placeholder="nama@instansi.go.id"
              aria-describedby="login-email-help"
            />
            <FieldGuidance
              name="email"
              id="login-email-help"
              text="Masukkan email akun yang diberikan administrator. Akun baru tidak dapat dibuat dari halaman ini."
            />
          </div>
          <div>
            <label htmlFor="password" className="login-label">
              Kata sandi
            </label>
            <input
              className="field"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
              aria-describedby="login-password-help"
            />
            <FieldGuidance
              name="password"
              id="login-password-help"
              text="Masukkan kata sandi akun. Jika lupa, gunakan tautan pemulihan kata sandi."
            />
          </div>
          <div className="login-form-meta">
            <Link href="/portal/forgot-password">Lupa kata sandi?</Link>
          </div>
          <FormSubmitButton
            className="login-submit"
            pendingText="Memeriksa akun…"
          >
            Masuk{" "}
            <ArrowLeft size={16} aria-hidden="true" className="rotate-180" />
          </FormSubmitButton>
        </form>

        <div className="login-access-note">
          <ShieldCheck size={17} aria-hidden="true" />
          <p>
            Portal Admin hanya dapat digunakan oleh akun yang diundang
            administrator. Akun baru tidak dapat didaftarkan sendiri.
          </p>
        </div>
      </section>
      <p className="login-footer">
        Portal Satu Data Kabupaten Wajo · Akses pengelola
      </p>
    </main>
  );
}
