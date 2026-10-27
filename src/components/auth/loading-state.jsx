import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

function Block({ className = "" }) {
  return <div aria-hidden="true" className={`loading-skeleton ${className}`} />;
}

function Field({ label, hint = false, password = false }) {
  return (
    <div>
      <label className="login-label">{label}</label>
      <div className="field flex h-11 items-center px-3" aria-hidden="true">
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
      className="login-page"
      aria-busy="true"
      aria-label="Memuat halaman masuk"
    >
      <section className="login-card" aria-labelledby="login-title">
        <Link href="/" className="login-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Kembali ke portal publik
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
        <form className="login-form" aria-hidden="true">
          <Field
            label="Alamat email"
            hint="Masukkan email akun yang diberikan administrator. Akun baru tidak dapat dibuat dari halaman ini."
          />
          <Field
            label="Kata sandi"
            hint="Masukkan kata sandi akun. Jika lupa, gunakan tautan pemulihan kata sandi."
            password
          />
          <div className="login-form-meta">
            <span>Lupa kata sandi?</span>
          </div>
          <div className="login-submit flex items-center justify-center">
            Masuk{" "}
            <ArrowLeft size={16} aria-hidden="true" className="rotate-180" />
          </div>
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
