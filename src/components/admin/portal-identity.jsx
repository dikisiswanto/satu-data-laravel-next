import Image from "next/image";
import { portalBrand } from "@/lib/portal-brand";

/** The same brand lockup is used in the admin header and desktop sidebar. */
export function PortalIdentity({ className = "", priority = false }) {
  return (
    <span
      className={`portal-identity flex min-w-0 items-center gap-3 ${className}`}
    >
      <span className="portal-identity-mark flex size-10 shrink-0 items-center justify-center">
        <Image
          src={portalBrand.logo}
          alt={portalBrand.logoAlt}
          width={48}
          height={56}
          className="h-9 w-auto object-contain"
          priority={priority}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="portal-identity-title truncate text-sm font-bold tracking-tight text-ink sm:text-base">
          {portalBrand.title}
        </span>
        <span className="portal-identity-subtitle mt-0.5 truncate text-xs text-muted">
          {portalBrand.subtitle}
        </span>
      </span>
    </span>
  );
}
