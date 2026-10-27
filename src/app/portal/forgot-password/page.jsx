import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
import Link from "next/link";
import { forgotPasswordAction } from "./actions";
export const metadata = {
  title: "Pemulihan kata sandi",
  robots: { index: false, follow: false },
};
export default async function ForgotPasswordPage({ searchParams }) {
  const query = await searchParams;
  return (
    <main className="page-container flex min-h-screen items-center justify-center py-12">
      <section className="w-full max-w-md rounded-card border bg-white p-6 sm:p-8">
        <Link href="/portal/login" className="text-sm font-medium text-primary">
          ← Kembali ke login
        </Link>
        <p className="eyebrow mt-8">Pemulihan akun</p>
        <h1 className="mt-3 text-2xl font-semibold">Atur ulang kata sandi</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Masukkan email akun pengelola. Jika akun ditemukan dan pemulihan
          aktif, kami akan mengirim petunjuk ke alamat tersebut.
        </p>
        {query?.sent ? (
          <p
            role="status"
            className="mt-5 rounded-lg border bg-slate-50 p-3 text-sm leading-6"
          >
            Jika akun ditemukan, petunjuk pemulihan akan dikirim ke email Anda.
          </p>
        ) : null}
        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <label htmlFor="email" className="block text-sm font-medium">
            Email akun
          </label>
          <input
            className="field"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            aria-describedby="email-help"
          />
          <FieldGuidance
            name="email"
            id="email-help"
            text="Masukkan email akun pengelola. Demi keamanan, kami tidak memberi tahu apakah alamat email tertentu terdaftar."
          />
          <FormSubmitButton
            className="w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
            pendingText="Mengirim instruksi…"
          >
            Kirim instruksi
          </FormSubmitButton>
        </form>
      </section>
    </main>
  );
}
