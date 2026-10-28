import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("authenticated portal API routing", () => {
  it("lets local portal route handlers authenticate cookies before fallback rewrites", () => {
    const config = read("next.config.mjs");
    const proxy = read("src/app/api/v1/portal/[...path]/route.js");
    expect(config).toContain("fallback: [");
    expect(config).toContain('source: "/api/:path*"');
    expect(config).not.toMatch(/return\s*\[\s*\{\s*source:\s*"\/api\/:path\*"/);
    expect(proxy).toContain('headers.set("Authorization", `Bearer ${token}`)');
    expect(proxy).toContain("const cookieStore = await cookies()");
  });

  it("registers the Laravel cookie adapter before API route authentication", () => {
    const bootstrap = read("backend/bootstrap/app.php");
    const routes = read("backend/routes/api.php");
    expect(bootstrap).toContain(
      "prependToGroup('api', AttachFrontendToken::class)",
    );
    expect(routes).toContain("'auth:sanctum'");
  });
});
