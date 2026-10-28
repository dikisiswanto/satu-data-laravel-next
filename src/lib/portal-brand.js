import { siteConfig } from "@/lib/site-config";

/** All visible portal branding is resolved from deployment configuration. */
export const portalBrand = Object.freeze({
  title: siteConfig.shortName,
  subtitle: siteConfig.portalTitle,
  organization: siteConfig.organizationName,
  logo: siteConfig.logoPath,
  logoAlt: siteConfig.logoAlt,
});
