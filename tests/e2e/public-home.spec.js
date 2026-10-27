import { test, expect } from "@playwright/test";
test("beranda publik memiliki landmark, judul, dan navigasi", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Portal Satu Data Kabupaten Wajo/);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Temukan Data",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pahami Wajo",
  );
  await expect(page.getByRole("search")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigasi utama" }),
  ).toBeVisible();
});
test("katalog dataset mempunyai pencarian yang berlabel", async ({ page }) => {
  await page.goto("/dataset");
  await expect(
    page.getByRole("heading", { name: "Katalog dataset" }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Kata kunci" }),
  ).toBeVisible();
});
test("Portal Admin meminta pengguna masuk", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/portal\/login/);
});

test("katalog publik membuka popover filter dengan panel yang tidak terpotong di desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dataset");
  await page.getByRole("button", { name: "Buka filter katalog" }).click();
  const panel = page.locator(".catalog-filter-popover-panel");
  await expect(panel).toBeVisible();
  await expect(page.getByLabel("Topik")).toBeVisible();
  await expect(page.getByLabel("Organisasi")).toBeVisible();
  await expect(page.getByLabel("Tahun data")).toBeVisible();
  await expect(page.getByLabel("Format berkas")).toBeVisible();
  await expect(page.getByLabel("Urutkan")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Terapkan filter/ }),
  ).toBeVisible();

  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(480);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
});

test("popover filter katalog tetap berada di dalam viewport mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dataset");
  await page.getByRole("button", { name: "Buka filter katalog" }).click();
  const panel = page.locator(".catalog-filter-popover-panel");
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeLessThanOrEqual(343);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
});
test("beranda menampilkan label statistik portal yang bersumber dari database", async ({
  page,
}) => {
  await page.goto("/");
  const stats = page.getByRole("region", { name: "Ringkasan data publik" });
  await expect(stats).toBeVisible();
  await expect(stats.getByText("Dataset terbuka")).toBeVisible();
  await expect(stats.getByText("Perangkat daerah")).toBeVisible();
  await expect(stats.getByText("Indikator statistik")).toBeVisible();
});

test("menu seluler membuka navigasi yang dapat diakses dan Portal Admin menuju login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Buka navigasi" });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(
    page.getByRole("navigation", { name: "Navigasi seluler" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Portal Admin/ }),
  ).toHaveAttribute("href", "/portal/login");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Buka navigasi" }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("tabel pratinjau menjaga overflow di area tabel pada layar ponsel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dataset", { waitUntil: "domcontentloaded" });
  const preview = page.locator(".public-table-scroll-region").first();
  if (!(await preview.count()))
    test.skip(
      true,
      "Belum ada dataset terbit dengan resource pratinjau pada lingkungan E2E",
    );
  await expect(preview).toBeVisible();
  const overflow = await preview.evaluate((element) => ({
    scrollable: element.scrollWidth >= element.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    tabIndex: element.getAttribute("tabindex"),
  }));
  expect(overflow.tabIndex).toBe("0");
  expect(overflow.pageWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  if (overflow.scrollable)
    expect(overflow.pageWidth).toBeLessThanOrEqual(375 + 1);
});

test("halaman publik tetap berada dalam viewport ponsel", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    "/",
    "/dataset",
    "/organisasi",
    "/statistik",
    "/bantuan",
    "/api-data",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".public-app-shell")).toBeVisible();
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(
      dimensions.document,
      `${route} melewati lebar viewport: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(
      dimensions.body,
      `${route} memiliki body lebih lebar dari viewport: ${JSON.stringify(dimensions)}`,
    ).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});
