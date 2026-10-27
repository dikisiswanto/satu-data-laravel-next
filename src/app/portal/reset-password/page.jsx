import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { FieldGuidance } from "@/components/admin/form-field-guidance";
import Link from "next/link";
import { resetPasswordAction } from "./actions";
export const metadata = {
  title: "Kata sandi baru",
  robots: { index: false, follow: false },
};
export default async function ResetPasswordPage({ searchParams }) {
  const query = await searchParams;
  return (
    <main className="page-container flex min-h-screen items-center justify-center py-12">
      <section className="w-full max-w-md rounded-card border bg-white p-6 sm:p-8">
        <Link href="/portal/login" className="text-sm font-medium text-primary">
          ← Kembali ke login
        </Link>
        <p className="eyebrow mt-8">Pemulihan akun</p>
        <h1 className="mt-3 text-2xl font-semibold">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Buat kata sandi minimal 12 karakter. Pilih kata sandi yang berbeda
          dari yang Anda gunakan pada layanan lain.
        </p>
        {query?.error ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {query.error === "validation"
              ? "Gunakan kata sandi minimal 12 karakter dan ketik kata sandi yang sama pada kedua kolom."
              : query.error === "save"
                ? "Kata sandi belum tersimpan. Periksa koneksi dan coba lagi. Jika tetap gagal, minta petunjuk pemulihan yang baru."
                : query.error === "unavailable"
                  ? "Kami belum menerima konfirmasi perubahan kata sandi. Coba masuk dengan kata sandi baru. Jika belum berhasil, minta petunjuk pemulihan baru."
                  : "Tautan pemulihan sudah tidak berlaku. Minta petunjuk pemulihan kata sandi yang baru."}
          </p>
        ) : null}
        <form action={resetPasswordAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={typeof query?.token === "string" ? query.token : ""} />
          <input type="hidden" name="email" value={typeof query?.email === "string" ? query.email : ""} />
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Kata sandi baru
            </label>
            <input
              className="field"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
              aria-describedby="new-password-help"
            />
            <FieldGuidance name="new-password" id="new-password-help" />
          </div>
          <div>
            <label
              htmlFor="confirm_password"
              className="mb-2 block text-sm font-medium"
            >
              Ulangi kata sandi
            </label>
            <input
              className="field"
              id="confirm_password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required
              aria-describedby="confirm_password-help"
            />
            <FieldGuidance
              name="confirm-password"
              id="confirm_password-help"
              text="Masukkan kata sandi baru yang sama persis."
            />
          </div>
          <FormSubmitButton
            className="w-full rounded-control bg-primary px-4 py-3 text-sm font-semibold text-white"
            pendingText="Menyimpan kata sandi…"
          >
            Simpan kata sandi
          </FormSubmitButton>
        </form>
      </section>
    </main>
  );
}
