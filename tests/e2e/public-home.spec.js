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
    page.getByRole("heading", { name: "Katalog dataset", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Kata kunci")).toBeVisible();
});
test("Portal Admin meminta pengguna masuk", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/portal\/login/);
});

test("rate limit sementara tidak menghapus sesi atau mengalihkan ke login", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-rate-limited-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal");
  await expect(
    page.getByRole("heading", { name: "Portal belum dapat dibuka" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/portal(?:\?|$)/);
  await expect(
    page.getByRole("button", { name: /Coba lagi dalam 1 detik/ }),
  ).toBeVisible();

  const cookieBeforeRetry = await context.cookies();
  expect(
    cookieBeforeRetry.some((cookie) => cookie.name === "wajo_portal_token"),
  ).toBe(true);

  const retryButton = page.getByRole("button", { name: "Coba periksa lagi" });
  await expect(retryButton).toBeEnabled({ timeout: 3_000 });
  await retryButton.click();
  await expect(page).toHaveURL(/\/portal(?:\?|$)/);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portal belum dapat dibuka" }),
  ).toHaveCount(0);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "wajo_portal_token",
    ),
  ).toBe(true);
});

test("sesi yang benar-benar tidak valid mengarahkan pengguna ke login", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-invalid-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(
    page.getByRole("heading", { name: "Masuk ke Portal Admin" }),
  ).toBeVisible();
});

test("perpindahan cepat antar menu portal tata kelola tidak merusak sesi", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-valid-navigation-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal");
  const navigation = page
    .getByRole("navigation", {
      name: "Navigasi pengelola",
    })
    .first();
  await expect(navigation).toBeVisible();

  // Do not wait for each RSC transition to settle: this reproduces quick menu
  // changes while older route requests may still be completing on the server.
  await navigation.getByRole("link", { name: "Organisasi" }).click();
  await navigation.getByRole("link", { name: "Dataset" }).click();
  await navigation.getByRole("link", { name: "Organisasi" }).click();

  await expect(page).toHaveURL(/\/portal\/organisasi/);
  await expect(
    page.getByRole("heading", { name: "Organisasi", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Halaman ini belum dapat dibuka" }),
  ).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/portal\/login/);
});

test("riwayat aktivitas membuka detail perubahan dalam dialog", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-audit-detail-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal/riwayat");
  await expect(
    page.getByRole("heading", { name: "Riwayat perubahan" }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Lihat detail aktivitas: Memperbarui organisasi",
    })
    .click();

  const dialog = page.getByRole("dialog", {
    name: "Memperbarui organisasi",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Bagian yang berubah")).toBeVisible();
  await expect(dialog.getByText("Nama", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Situs resmi", { exact: true })).toBeVisible();
  await expect(dialog.getByText("ORG-01")).toBeVisible();
  await expect(
    dialog.getByText("78b3bd20-584f-46de-b49a-e27ca694f57a"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("halaman integrasi SDI menjaga kontrol dan teks di viewport ponsel", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-sdi-mobile-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal/integrasi");
  await expect(
    page.getByRole("heading", {
      name: "Kesiapan integrasi Satu Data Indonesia",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Profil yang diperiksa")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Periksa sekarang" }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test("form tambah organisasi menyimpan lewat API portal dan kembali ke daftar", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-organization-create-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal/organisasi/baru");
  await page.getByLabel("Kode organisasi").fill("E2E-ORG");
  await page
    .getByLabel("Bagian alamat halaman organisasi")
    .fill("dinas-e2e-wajo");
  await page.getByLabel("Nama resmi organisasi").fill("Dinas Uji Wajo");
  await page.getByRole("button", { name: "Simpan organisasi" }).click();

  await expect(page).toHaveURL(/\/portal\/organisasi\?saved=1/);
  await expect(
    page.getByRole("heading", { name: "Daftar organisasi" }),
  ).toBeVisible();
  await expect(page.getByText("Dinas Uji Wajo")).toBeVisible();
  await expect(page.getByText("Kode: E2E-ORG")).toBeVisible();
});

test("tabel akses pengguna menampilkan identitas dan lingkup yang mudah dibaca", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "wajo_portal_token",
      value: "e2e-user-list-session",
      url: "http://127.0.0.1:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/portal/pengguna");
  await expect(page.getByText("Operator Contoh")).toBeVisible();
  await expect(page.getByText("operator@example.test")).toBeVisible();
  await expect(page.getByText("Lingkup: Seluruh portal")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Administrator data" }),
  ).toBeVisible();
});

test("katalog publik membuka popover filter dengan panel yang tidak terpotong di desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dataset");
  await page.locator('summary[aria-label="Buka filter katalog"]').click();
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
  await page.locator('summary[aria-label="Buka filter katalog"]').click();
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
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.locator('button[aria-controls="site-mobile-navigation"]');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAccessibleName("Buka navigasi");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Tutup navigasi");
  await expect(
    page.getByRole("navigation", { name: "Navigasi seluler" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#site-mobile-navigation")
      .getByRole("link", { name: /Masuk Portal Admin/ }),
  ).toHaveAttribute("href", "/portal/login");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAccessibleName("Buka navigasi");
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
