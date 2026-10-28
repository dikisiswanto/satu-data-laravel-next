import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("multi-agency site branding", () => {
  it("derives branding and regional profile defaults from the configured region", async () => {
    vi.stubEnv("NEXT_PUBLIC_REGION_NAME", "Kabupaten Luwu");
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
});
