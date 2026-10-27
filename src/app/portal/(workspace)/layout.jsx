import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleAlert, RotateCw } from "lucide-react";
import { PortalShellLoading } from "@/components/admin/portal-shell-loading";
import { PortalShell } from "@/components/portal-shell";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import {
  isMissingAuthSession,
  isTransientAuthFailure,
} from "@/lib/backend/auth-errors";

export const dynamic = "force-dynamic";

async function AuthenticatedWorkspace({ children }) {
  const backend = await createBackendServerClient();
  let verification;
  try {
    verification = await getRequestVerifiedUser(backend);
  } catch (error) {
    if (!isTransientAuthFailure(error)) throw error;
    return <PortalSessionCheckUnavailable />;
  }

  if (verification?.error) {
    if (
      Number(verification.error.status) === 401 ||
      isMissingAuthSession(verification.error)
    ) {
      redirect("/portal/login");
    }
    return <PortalSessionCheckUnavailable />;
  }

  const user = verification?.data?.user;

  if (!user) redirect("/portal/login");

  const { data: shellContext, error } = await backend.rpc(
    "get_portal_shell_context",
  );
  if (Number(error?.status) === 401) redirect("/portal/login");
  if (error) return <PortalSessionCheckUnavailable />;

  return (
    <PortalShell email={user.email} shellContext={shellContext}>
      {children}
    </PortalShell>
  );
}

function PortalSessionCheckUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f8] px-4 py-10">
      <section className="w-full max-w-lg rounded-xl border border-[#dce5ec] bg-white p-6 shadow-sm sm:p-8">
        <CircleAlert className="text-[#6a8292]" size={22} aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-[#203e49]">
          Portal belum dapat dibuka
        </h1>
        <p role="status" className="mt-2 text-sm leading-6 text-muted">
          Layanan portal sedang tidak tersedia. Sesi Anda tidak kami anggap
          berakhir. Coba kembali sebentar lagi.
        </p>
        <Link
          href="/portal"
          prefetch={false}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d7e2e9] bg-white px-3.5 py-2 text-sm font-semibold text-[#344e62] transition-colors hover:bg-[#f4f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7] focus-visible:ring-offset-2"
        >
          <RotateCw size={15} aria-hidden="true" /> Coba lagi
        </Link>
      </section>
    </main>
  );
}

export default function PortalWorkspaceLayout({ children }) {
  return (
    <Suspense fallback={<PortalShellLoading />}>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}
