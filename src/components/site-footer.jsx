import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="page-container grid gap-8 py-10 sm:grid-cols-2 sm:items-end">
        <div className="flex items-start gap-3">
          <Image
            src={siteConfig.logoPath}
            alt={siteConfig.logoAlt}
            width={48}
            height={56}
            className="h-12 w-auto shrink-0 object-contain"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {siteConfig.organizationName}
            </p>
            <p className="mt-1 font-semibold">{siteConfig.shortName}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Satu pintu untuk menemukan, memahami, dan menggunakan data publik
              daerah. Informasi dataset yang belum tersedia ditandai secara
              terbuka.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted sm:justify-end">
          <Link href="/dataset" className="public-link">
            Katalog dataset
          </Link>
          <Link href="/api-data" className="public-link">
            API data
          </Link>
          <Link href="/portal/login" className="public-link">
            Portal pengelola
          </Link>
        </div>
        <p className="text-xs text-muted sm:col-span-2">
          © {new Date().getFullYear()} {siteConfig.name}. Data resmi hanya
          ditampilkan setelah dipublikasikan oleh pengelola berwenang.
        </p>
      </div>
    </footer>
  );
}
