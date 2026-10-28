import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { PortalShellLoading } from "@/components/admin/portal-shell-loading";
import { PortalSessionRetry } from "@/components/portal-session-retry";
import { PortalShell } from "@/components/portal-shell";
import { portalData } from "@/lib/backend/portal-api";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";
import {
  isMissingAuthSession,
  isTransientAuthFailure,
} from "@/lib/backend/auth-errors";

export const dynamic = "force-dynamic";

async function AuthenticatedWorkspace({ children }) {
  let verification;
  try {
    verification = await getRequestVerifiedUser();
  } catch (error) {
    if (!isTransientAuthFailure(error)) throw error;
    return <PortalSessionCheckUnavailable retryAfterMs={error.retryAfterMs} />;
  }

  if (verification?.error) {
    if (
      Number(verification.error.status) === 401 ||
      isMissingAuthSession(verification.error)
    ) {
      redirect("/portal/login");
    }
    return (
      <PortalSessionCheckUnavailable
        retryAfterMs={verification.error.retryAfterMs}
      />
    );
  }

  const user = verification?.data?.user;

  if (!user) redirect("/portal/login");

  let shellContext;
  try {
    shellContext = await portalData("shell");
  } catch (error) {
    if (Number(error?.status) === 401) redirect("/portal/login");
    return <PortalSessionCheckUnavailable retryAfterMs={error.retryAfterMs} />;
  }

  return (
    <PortalShell email={user.email} shellContext={shellContext}>
      {children}
    </PortalShell>
  );
}

function PortalSessionCheckUnavailable({ retryAfterMs }) {
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
        <PortalSessionRetry
          key={retryAfterMs ?? 0}
          retryAfterMs={retryAfterMs}
        />
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
