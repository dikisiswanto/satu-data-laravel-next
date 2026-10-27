import Image from "next/image";
import Link from "next/link";
import { LogOut, ArrowUpRight, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/portal/actions";
import { PortalNavigation } from "@/components/portal-navigation";
import { PortalOnboarding } from "@/components/portal-onboarding";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { createBackendServerClient } from "@/lib/backend/compat-server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";

import { assertBackendQuery } from "@/lib/backend/query-guard";
export async function PortalShell({
  children,
  email,
  shellContext: providedContext,
}) {
  let shellContext = providedContext || null;
  if (!shellContext) {
    const supabase = await createBackendServerClient();
    const {
      data: { user },
    } = await getRequestVerifiedUser(supabase);
    // One RLS-respecting RPC replaces two sequential reads on each admin page.
    const { data, error } = user
      ? await supabase.rpc("get_portal_shell_context")
      : { data: null, error: null };
    assertBackendQuery(error, "portal_shell_context");
    shellContext = data;
  }
  const roles = Array.isArray(shellContext?.roles)
    ? [
        ...new Set(
          shellContext.roles.filter((role) => typeof role === "string"),
        ),
      ]
    : [];
  const roleLabel = roles.includes("super_admin")
    ? "Superadmin"
    : roles.includes("data_admin")
      ? "Admin data"
      : roles.includes("admin_opd")
        ? "Admin perangkat daerah"
        : roles.includes("editor")
          ? "Editor data"
          : roles.includes("reviewer")
            ? "Pemeriksa data"
            : "Pengguna portal";
  return (
    <div className="portal-app min-h-screen">
      {shellContext ? (
        <PortalOnboarding
          roleLabel={roleLabel}
          roles={roles}
          completed={Boolean(shellContext.onboarding_completed_at)}
        />
      ) : null}
      <header className="portal-topbar sticky top-0 z-30 border-b">
        <div className="page-container flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/portal"
            className="flex min-w-0 items-center gap-3.5 py-2"
          >
            <span className="flex size-10 shrink-0 items-center justify-center">
              <Image
                src="/logo-kabupaten-wajo.webp"
                alt="Lambang Kabupaten Wajo"
                width={48}
                height={56}
                className="h-10 w-auto object-contain"
                priority
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold tracking-tight text-ink sm:text-base">
                Satu Data Wajo
              </span>
              <span className="mt-0.5 truncate text-xs text-muted">
                Portal Admin
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-white hover:text-primary sm:inline-flex"
            >
              Portal publik <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <span className="hidden h-8 w-px bg-line sm:block" />
            <div className="hidden max-w-[220px] items-center gap-2.5 md:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#e5edf5] text-primary">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink">
                  {email || "Akun pengelola"}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Akun aktif
                </span>
              </span>
            </div>
            <form action={logoutAction}>
              <FormSubmitButton
                className="portal-logout inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:bg-white"
                pendingText="Keluar…"
                aria-label="Keluar dari akun"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
              </FormSubmitButton>
            </form>
          </div>
        </div>
      </header>
      <div className="page-container grid gap-6 py-6 sm:py-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-[100px] lg:self-start">
          <div className="portal-sidebar rounded-2xl border p-3 sm:p-4">
            <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Menu pengelola
            </p>
            <PortalNavigation roles={roles} />
            <div className="portal-sidebar-note mt-4 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-ink">Area pengelola</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Menu dan data yang tampil menyesuaikan peran serta organisasi
                yang ditetapkan untuk akun Anda.
              </p>
              <Link
                href="/portal?tour=1&step=0#portal-dashboard-overview"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4"
              >
                Lihat panduan portal{" "}
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </aside>
        <main
          id="konten-utama"
          tabIndex={-1}
          className="portal-main min-w-0 rounded-2xl sm:rounded-[1.5rem]"
        >
          {children}
        </main>
      </div>
      <footer className="page-container pb-6 pt-1 text-center text-xs text-muted sm:text-left">
        Portal Satu Data Kabupaten Wajo <span aria-hidden="true">·</span> Ruang
        pengelola
      </footer>
    </div>
  );
}
