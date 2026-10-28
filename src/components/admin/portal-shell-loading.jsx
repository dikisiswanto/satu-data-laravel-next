import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { PortalNavigation } from "@/components/portal-navigation";
import { portalBrand } from "@/lib/portal-brand";

export function PortalShellLoading() {
  return (
    <div
      className="portal-app min-h-screen !bg-[#f5f7f8] text-[#172f43]"
      aria-busy="true"
    >
      <header className="portal-topbar sticky top-0 z-30 min-h-16 border-b border-[#dce5ec] bg-white shadow-[0_1px_2px_rgb(22_47_66_/_0.04)]">
        <div className="page-container flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/portal"
            className="flex min-w-0 items-center gap-3.5 py-2"
            aria-label={`${portalBrand.title} — ringkasan pengelola`}
            prefetch={false}
          >
            <span className="flex size-10 shrink-0 items-center justify-center">
              <Image
                src={portalBrand.logo}
                alt={portalBrand.logoAlt}
                width={48}
                height={56}
                className="h-10 w-auto object-contain"
                priority
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold tracking-tight text-ink sm:text-base">
                {portalBrand.title}
              </span>
              <span className="mt-0.5 truncate text-xs text-muted">
                {portalBrand.subtitle}
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[#f4f7f9] hover:text-primary sm:inline-flex"
              prefetch={false}
            >
              Portal publik <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
            <span className="hidden h-8 w-px bg-line sm:block" />
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#f0f4f6] text-[#49677b]">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <span
                className="h-3 w-28 rounded-sm bg-[#edf1f3]"
                aria-hidden="true"
              />
            </div>
            <span
              className="h-10 w-10 rounded-lg border border-[#d7e2e9] bg-[#f9fbfc] sm:w-[88px]"
              aria-hidden="true"
            />
          </div>
        </div>
      </header>
      <div className="page-container grid gap-6 py-6 sm:py-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-[100px] lg:self-start">
          <div className="rounded-xl border border-[#dce5ec] bg-white p-3 shadow-[0_1px_3px_rgb(22_47_66_/_0.04)] sm:p-4">
            <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Menu pengelola
            </p>
            <PortalNavigation loading />
            <div className="mt-4 hidden rounded-lg border border-[#e0e9ef] bg-[#f7fafc] p-3.5 lg:block">
              <p className="text-xs font-semibold text-ink">Area pengelola</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Menu dan data yang tampil menyesuaikan peran serta organisasi
                akun Anda.
              </p>
            </div>
          </div>
        </aside>
        <main
          className="min-h-[65vh] min-w-0 rounded-2xl"
          aria-label="Memuat area pengelola"
        >
          <div
            className="h-56 rounded-2xl border border-[#dce5ec] bg-white"
            aria-hidden="true"
          />
        </main>
      </div>
      <footer className="page-container pb-6 pt-1 text-center text-xs text-muted sm:text-left">
        {portalBrand.organization} · {portalBrand.title}{" "}
        <span aria-hidden="true">·</span> Ruang pengelola
      </footer>
    </div>
  );
}
