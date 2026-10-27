import { PortalBreadcrumbs } from "@/components/portal-breadcrumbs";
import { cn } from "@/lib/utils";

/** Shared heading for authenticated workspace pages. */
export function PortalPageHeading({
  eyebrow,
  title,
  description,
  children,
  className,
  id,
}) {
  return (
    <header id={id} className={cn("portal-page-heading", className)}>
      <PortalBreadcrumbs />
      <div className="portal-page-heading-row">
        <div className="portal-page-heading-copy">
          {eyebrow ? (
            <p className="portal-page-eyebrow">{eyebrow}</p>
          ) : null}
          <h1 className="portal-page-title">{title}</h1>
          {description ? (
            <p className="portal-page-description">{description}</p>
          ) : null}
        </div>
        {children ? <div className="portal-page-actions">{children}</div> : null}
      </div>
    </header>
  );
}
