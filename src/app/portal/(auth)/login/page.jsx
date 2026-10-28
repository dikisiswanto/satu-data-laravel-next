import Image from "next/image";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, RotateCw, ShieldCheck } from "lucide-react";
import { loginAction } from "./actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import { cookies } from "next/headers";

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
  const cookieStore = await cookies();
  const hasSessionCookie = Boolean(cookieStore.get("wajo_portal_token")?.value);
  try {
    const result = await getRequestVerifiedUser();
    user = result?.data?.user || null;
    sessionCheckError = Boolean(result?.error);
    if (result?.error && result.error.status !== 401) authUnavailable = true;
  } catch (error) {
    sessionCheckError = true;
    authUnavailable = Number(error?.status) !== 401;
    console.error("portal_login_session_check_unavailable", {
      status: error?.status || null,
      code: error?.code || "unknown",
    });
  }
  if (user && !sessionCheckError && !authUnavailable) redirect("/portal");
  if (hasSessionCookie && authUnavailable) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f8] px-4 py-8 sm:px-6">
        <section className="w-full max-w-lg rounded-xl border border-[#dce5ec] bg-white p-6 shadow-sm sm:p-8">
          <span
            className="flex size-10 items-center justify-center rounded-lg border border-[#dce5ec] bg-[#f7fafc] text-[#49677b]"
            aria-hidden="true"
          >
            <ShieldCheck size={18} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#203e49]">
            Memeriksa sesi portal
          </h1>
          <p role="status" className="mt-2 text-sm leading-6 text-muted">
            Layanan autentikasi sedang sulit dijangkau. Sesi Anda belum dianggap
            berakhir. Coba periksa kembali sebentar lagi.
          </p>
          <Link
            href="/portal/login?retry=1"
            prefetch={false}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d7e2e9] bg-white px-3.5 py-2 text-sm font-semibold text-[#344e62] transition-colors hover:bg-[#f4f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7] focus-visible:ring-offset-2"
          >
            <RotateCw size={15} aria-hidden="true" /> Coba lagi
          </Link>
        </section>
      </main>
    );
  }
  const error = authUnavailable
    ? "unavailable"
    : params?.error ||
      (hasSessionCookie && sessionCheckError ? "session" : undefined);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f8] px-4 py-8 sm:px-6">
      <section
        className="w-full max-w-lg rounded-xl border border-[#dce5ec] bg-white p-5 shadow-sm sm:p-8"
        aria-labelledby="login-title"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#376b70] transition-colors hover:text-[#174b51] hover:underline hover:underline-offset-4"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Kembali ke portal publik
        </Link>
        <div className="mt-7 flex items-center gap-3 border-b border-[#e4ebea] pb-5">
          <Image
            src="/logo-kabupaten-wajo.webp"
            alt="Lambang Kabupaten Wajo"
            width={48}
            height={56}
            priority
          />
          <div>
            <p className="text-xs font-medium text-muted">
              Pemerintah Kabupaten Wajo
            </p>
            <strong className="mt-1 block text-sm font-semibold text-[#244650]">
              Ruang Pengelola Data
            </strong>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#d7e5e1] bg-[#f4f8f6] text-[#326e69]">
            <LockKeyhole size={19} aria-hidden="true" />
          </span>
          <div>
            <h1
              id="login-title"
              className="text-xl font-semibold tracking-tight text-[#203e49] sm:text-2xl"
            >
              Masuk ke Portal Admin
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted">
              Gunakan alamat email dan kata sandi akun yang didaftarkan oleh
              administrator portal.
            </p>
          </div>
        </div>

        {error === "invalid" ? (
          <div
            role="alert"
            className="mt-5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800"
          >
            Email atau kata sandi tidak sesuai. Periksa kembali informasi akun
            Anda.
          </div>
        ) : null}
        {error === "configuration" ? (
          <div
            role="alert"
            className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900"
          >
            Layanan masuk belum siap digunakan. Hubungi administrator portal
            agar dapat diperiksa.
          </div>
        ) : null}
        {error === "unavailable" ? (
          <div
            role="alert"
            className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900"
          >
            Kami belum dapat memeriksa sesi masuk Anda. Tunggu sebentar, lalu
            coba masuk kembali. Anda tidak perlu mengulang halaman berkali-kali.
          </div>
        ) : null}
        {error === "session" ? (
          <div
            role="alert"
            className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-5 text-amber-900"
          >
            Sesi masuk sudah berakhir atau tidak dapat diperiksa. Masuk kembali
            untuk melanjutkan.
          </div>
        ) : null}
        {params?.reset === "1" ? (
          <div
            role="status"
            className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-900"
          >
            Kata sandi Anda sudah diperbarui. Masuk menggunakan kata sandi baru.
          </div>
        ) : null}

        <form action={loginAction} className="login-form mt-6 space-y-4">
          <input
            type="hidden"
            name="next"
            value={typeof params?.next === "string" ? params.next : "/portal"}
          />
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-[#344e59]"
            >
              Alamat email
            </label>
            <input
              className="min-h-11 w-full rounded-md border border-[#d5dfe6] bg-white px-3.5 py-2.5 text-sm text-[#172f43] placeholder:text-slate-400 focus-visible:border-[#1d5fa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7]/20"
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
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-[#344e59]"
            >
              Kata sandi
            </label>
            <input
              className="min-h-11 w-full rounded-md border border-[#d5dfe6] bg-white px-3.5 py-2.5 text-sm text-[#172f43] placeholder:text-slate-400 focus-visible:border-[#1d5fa7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7]/20"
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
          <div className="flex justify-end">
            <Link
              className="text-sm font-medium text-[#1d5fa7] underline-offset-4 hover:underline"
              href="/portal/forgot-password"
            >
              Lupa kata sandi?
            </Link>
          </div>
          <FormSubmitButton
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#1d5fa7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#174f8b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7] focus-visible:ring-offset-2"
            pendingText="Memeriksa akun…"
          >
            Masuk{" "}
            <ArrowLeft size={16} aria-hidden="true" className="rotate-180" />
          </FormSubmitButton>
        </form>

        <div className="mt-6 flex items-start gap-2.5 border-t border-[#e4ebea] pt-4 text-xs leading-5 text-muted">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-[#5d8580]"
            size={17}
            aria-hidden="true"
          />
          <p>
            Portal Admin hanya dapat digunakan oleh akun yang diundang
            administrator. Akun baru tidak dapat didaftarkan sendiri.
          </p>
        </div>
      </section>
      <p className="mt-5 text-center text-xs text-[#74858a]">
        Portal Satu Data Kabupaten Wajo · Akses pengelola
      </p>
    </main>
  );
}
