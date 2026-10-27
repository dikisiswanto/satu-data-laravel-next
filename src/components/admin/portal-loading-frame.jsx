import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { PortalNavigation } from "@/components/portal-navigation";

export function PortalLoadingFrame({
  children,
  label = "Memuat halaman pengelola",
}) {
  return (
    <div className="portal-app min-h-screen" aria-busy="true">
      <header className="portal-topbar sticky top-0 z-30 border-b">
        <div className="page-container flex min-h-16 items-center justify-between gap-4">
          <Link
            href="/portal"
            className="flex min-w-0 items-center gap-3.5 py-2"
            aria-label="Portal Satu Data — ringkasan pengelola"
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
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#e5edf5] text-primary">
                <ShieldCheck size={17} aria-hidden="true" />
              </span>
              <span className="text-xs font-medium text-muted">
                Akun pengelola
              </span>
            </div>
            <span
              className="inline-flex items-center gap-2 text-xs text-muted"
              role="status"
              aria-label={label}
              title={label}
            >
              <LoaderCircle
                size={14}
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Memuat…
            </span>
          </div>
        </div>
      </header>
      <div className="page-container grid gap-6 py-6 sm:py-8 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-[100px] lg:self-start">
          <div className="portal-sidebar rounded-2xl border p-3 sm:p-4">
            <p className="px-3 pb-3 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Menu pengelola
            </p>
            <PortalNavigation />
            <div className="portal-sidebar-note mt-4 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-ink">Area pengelola</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Menu dan data yang tampil menyesuaikan peran serta organisasi
                akun Anda.
              </p>
            </div>
          </div>
        </aside>
        <main
          id="konten-utama"
          tabIndex={-1}
          className="portal-main min-w-0 rounded-2xl sm:rounded-[1.5rem]"
          aria-live="off"
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
