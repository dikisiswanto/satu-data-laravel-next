import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("multi-agency site branding", () => {
  it("derives branding and regional profile defaults from the configured region", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "Kabupaten Luwu");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PROFILE", "generic");
    vi.stubEnv("NEXT_PUBLIC_REGION_SHORT_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_SHORT_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_ORGANIZATION_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_DESCRIPTION", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_CONTACT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_ADDRESS", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_PHONE", "");
    vi.stubEnv("NEXT_PUBLIC_LOGO_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_HERO_IMAGE", "");

    vi.resetModules();
    const { siteConfig } = await import("../../src/lib/site-config.js");

    expect(siteConfig.regionName).toBe("Kabupaten Luwu");
    expect(siteConfig.regionShortName).toBe("Luwu");
    expect(siteConfig.name).toBe("Portal Satu Data Kabupaten Luwu");
    expect(siteConfig.organizationName).toBe("Pemerintah Kabupaten Luwu");
    expect(siteConfig.logoPath).toBe("/icons/portal.svg");
    expect(siteConfig.heroImage).toBe("/portal-social.svg");
    expect(siteConfig.ppidUrl).toBe("");
    expect(siteConfig.ppidEmail).toBe("");
  });

  it("defaults to the Wajo brand and assets when no tenant is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PROFILE", "");
    vi.stubEnv("NEXT_PUBLIC_REGION_SHORT_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_SHORT_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_ORGANIZATION_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_DESCRIPTION", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_CONTACT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_ADDRESS", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_PHONE", "");
    vi.stubEnv("NEXT_PUBLIC_LOGO_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_HERO_IMAGE", "");
    vi.stubEnv("NEXT_PUBLIC_ICON_PATH", "");

    vi.resetModules();
    const { siteConfig } = await import("../../src/lib/site-config.js");

    expect(siteConfig.name).toBe("Portal Satu Data Kabupaten Wajo");
    expect(siteConfig.shortName).toBe("Satu Data Wajo");
    expect(siteConfig.regionName).toBe("Kabupaten Wajo");
    expect(siteConfig.organizationName).toBe("Pemerintah Kabupaten Wajo");
    expect(siteConfig.brandProfile).toBe("wajo");
    expect(siteConfig.logoPath).toBe("/logo-kabupaten-wajo.webp");
    expect(siteConfig.heroImage).toBe("/wajo-hero-panorama.webp");
    expect(siteConfig.iconPath).toBe("/icons/icon.svg");
    expect(siteConfig.pwaIcon192).toBe("/icons/icon-192.png");
    expect(siteConfig.pwaIcon512).toBe("/icons/icon-512.png");
    expect(siteConfig.ppidUrl).toBe("https://e-ppid-utama.wajokab.go.id/");
  });

  it("falls back to the generic asset profile when a custom region has a stale Wajo profile", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "Kabupaten Luwu");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PROFILE", "wajo");
    vi.stubEnv("NEXT_PUBLIC_LOGO_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_HERO_IMAGE", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_URL", "");

    vi.resetModules();
    const { siteConfig } = await import("../../src/lib/site-config.js");

    expect(siteConfig.brandProfile).toBe("generic");
    expect(siteConfig.logoPath).toBe("/icons/portal.svg");
    expect(siteConfig.heroImage).toBe("/portal-social.svg");
    expect(siteConfig.ppidUrl).toBe("");
  });

  it("does not infer the Wajo logo or PPID details from a region name alone", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "Kabupaten Wajo");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PROFILE", "generic");
    vi.stubEnv("NEXT_PUBLIC_LOGO_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_HERO_IMAGE", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_CONTACT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_ADDRESS", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_PHONE", "");

    vi.resetModules();
    const { siteConfig } = await import("../../src/lib/site-config.js");

    expect(siteConfig.regionName).toBe("Kabupaten Wajo");
    expect(siteConfig.name).toBe("Portal Satu Data Kabupaten Wajo");
    expect(siteConfig.logoPath).toBe("/icons/portal.svg");
    expect(siteConfig.heroImage).toBe("/portal-social.svg");
    expect(siteConfig.ppidUrl).toBe("");
    expect(siteConfig.ppidContactUrl).toBe("");
    expect(siteConfig.ppidAddress).toBe("");
    const { datasetStarterReferences } =
      await import("../../src/lib/data/dataset-starter-references.js");
    expect(datasetStarterReferences).toHaveLength(0);
  });

  it("loads Wajo-specific assets only when the Wajo profile is explicitly configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "Kabupaten Wajo");
    vi.stubEnv("NEXT_PUBLIC_BRAND_PROFILE", "wajo");
    vi.stubEnv("NEXT_PUBLIC_LOGO_PATH", "");
    vi.stubEnv("NEXT_PUBLIC_HERO_IMAGE", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_CONTACT_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_ADDRESS", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_EMAIL", "");
    vi.stubEnv("NEXT_PUBLIC_PPID_PHONE", "");

    vi.resetModules();
    const { siteConfig } = await import("../../src/lib/site-config.js");

    expect(siteConfig.logoPath).toBe("/logo-kabupaten-wajo.webp");
    expect(siteConfig.heroImage).toBe("/wajo-hero-panorama.webp");
    expect(siteConfig.iconPath).toBe("/icons/icon.svg");
    expect(siteConfig.pwaIcon192).toBe("/icons/icon-192.png");
    expect(siteConfig.pwaIcon512).toBe("/icons/icon-512.png");
    expect(siteConfig.ppidUrl).toBe("https://e-ppid-utama.wajokab.go.id/");
    const { datasetStarterReferences } =
      await import("../../src/lib/data/dataset-starter-references.js");
    expect(datasetStarterReferences.length).toBeGreaterThan(0);
  });
});
