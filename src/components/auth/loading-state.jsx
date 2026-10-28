import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

function Block({ className = "" }) {
  return (
    <div aria-hidden="true" className={`rounded bg-[#edf1f3] ${className}`} />
  );
}

function Field({ label, hint = false, password = false }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-[#344e59]">
        {label}
      </label>
      <div
        className="flex h-11 items-center rounded-md border border-[#d8e1e5] bg-white px-3"
        aria-hidden="true"
      >
        <Block className={`h-4 ${password ? "w-2/3" : "w-3/4"}`} />
      </div>
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function LoginLoading() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f8] px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Memuat halaman masuk"
    >
      <section
        className="w-full max-w-lg rounded-xl border border-[#dce5ec] bg-white p-5 shadow-sm sm:p-8"
        aria-labelledby="login-title"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#376b70]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke portal publik
        </Link>
        <div className="mt-7 flex items-center gap-3 border-b border-[#e4ebea] pb-5">
          <Image
            src={siteConfig.logoPath}
            alt={siteConfig.logoAlt}
            width={48}
            height={56}
            priority
          />
          <div>
            <p className="text-xs font-medium text-muted">
              {siteConfig.organizationName}
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
        <form className="login-form mt-6 space-y-4" aria-hidden="true">
          <Field
            label="Alamat email"
            hint="Masukkan email akun yang diberikan administrator. Akun baru tidak dapat dibuat dari halaman ini."
          />
          <Field
            label="Kata sandi"
            hint="Masukkan kata sandi akun. Jika lupa, gunakan tautan pemulihan kata sandi."
            password
          />
          <div className="flex justify-end text-sm font-medium text-[#1d5fa7]">
            <span>Lupa kata sandi?</span>
          </div>
          <div className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#eaf1f6] px-4 py-2.5 text-sm font-semibold text-[#527087]">
            Masuk{" "}
            <ArrowLeft size={16} aria-hidden="true" className="rotate-180" />
          </div>
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
        {siteConfig.name} · Akses pengelola
      </p>
      <p className="sr-only" role="status">
        Memuat halaman masuk.
      </p>
    </main>
  );
}

function RecoveryLoading({ reset = false }) {
  const title = reset ? "Buat kata sandi baru" : "Atur ulang kata sandi";
  const description = reset
    ? "Buat kata sandi minimal 12 karakter. Pilih kata sandi yang berbeda dari yang Anda gunakan pada layanan lain."
    : "Masukkan email akun pengelola. Jika akun ditemukan dan pemulihan aktif, kami akan mengirim petunjuk ke alamat tersebut.";
  return (
    <main
      className="page-container flex min-h-screen items-center justify-center py-12"
      aria-busy="true"
      aria-label={
        reset ? "Memuat formulir kata sandi baru" : "Memuat pemulihan akun"
      }
    >
      <section className="w-full max-w-md rounded-card border bg-white p-6 sm:p-8">
        <Link href="/portal/login" className="text-sm font-medium text-primary">
          ← Kembali ke login
        </Link>
        <p className="eyebrow mt-8">Pemulihan akun</p>
        <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6 space-y-4" aria-hidden="true">
          {reset ? (
            <>
              <Field
                label="Kata sandi baru"
                hint="Gunakan minimal 12 karakter. Campurkan beberapa jenis karakter dan hindari kata sandi yang pernah digunakan."
                password
              />
              <Field
                label="Ulangi kata sandi"
                hint="Masukkan kata sandi baru yang sama persis."
                password
              />
            </>
          ) : (
            <Field
              label="Email akun"
              hint="Masukkan email akun pengelola. Demi keamanan, kami tidak memberi tahu apakah alamat email tertentu terdaftar."
            />
          )}
          <div className="w-full rounded-control bg-primary px-4 py-3 text-center text-sm font-semibold text-white">
            {reset ? "Simpan kata sandi" : "Kirim instruksi"}
          </div>
        </div>
        <p className="sr-only" role="status">
          {reset
            ? "Memuat formulir kata sandi baru."
            : "Memuat pemulihan akun."}
        </p>
      </section>
    </main>
  );
}

export function AuthLoadingState({
  label = "Memuat formulir akun",
  variant = "login",
}) {
  if (variant === "forgot") return <RecoveryLoading />;
  if (variant === "reset") return <RecoveryLoading reset />;
  return <LoginLoading label={label} />;
}
