import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const read = (file) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("admin request efficiency and perimeter controls", () => {
  it("disables implicit prefetch for portal navigation targets", () => {
    const root = resolve(process.cwd(), "src/app/portal/(workspace)");
    const paths = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const file = join(dir, name);
        if (statSync(file).isDirectory()) walk(file);
        else if (file.endsWith(".jsx")) paths.push(file);
      }
    };
    walk(root);
    for (const file of paths) {
      const source = readFileSync(file, "utf8");
      const linkCount = (source.match(/<Link\b/g) || []).length;
      const noPrefetchCount = (source.match(/prefetch=\{false\}/g) || [])
        .length;
      expect(
        noPrefetchCount,
        `${file}: each portal Link should disable implicit prefetch`,
      ).toBe(linkCount);
    }
    expect(read("src/components/ui/button.jsx")).toContain(
      'href.startsWith("/portal") ? false : undefined',
    );
  });

  it("does not turn cancelled browser requests into service-unavailable responses", () => {
    const proxy = read("src/app/api/v1/portal/[...path]/route.js");
    expect(proxy).toContain(
      'request.signal.aborted || error?.name === "AbortError"',
    );
    expect(proxy).toContain("status: 499");
    expect(proxy).toContain("portal_api_upstream_unavailable");
    expect(proxy).toContain('"X-Request-Id"');
    expect(proxy).toContain('responseHeaders.set("X-Request-Id", requestId)');
    expect(read("src/lib/backend/portal-api.js")).toContain(
      "portal_api_request_failed",
    );
    expect(proxy).not.toMatch(
      /const REQUEST_HEADERS = \[\s*"accept",\s*"content-type",\s*"cookie"/,
    );
  });

  it("does not synthesize HTTP 503 for offline or cancelled navigation", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain(
      'request.signal.aborted || error?.name === "AbortError"',
    );
    expect(worker).toContain("return Response.error()");
    expect(worker).not.toContain("status: 503");
  });

  it("applies separate edge and backend limits to portal API and writes", () => {
    const edge = read("deploy/edge-nginx.conf");
    const provider = read("backend/app/Providers/AppServiceProvider.php");
    const routes = read("backend/routes/api.php");
    expect(edge).toContain("zone=api_portal:10m rate=8r/s");
    expect(edge).toContain("limit_req zone=api_portal burst=30 nodelay");
    expect(edge).toContain("location ~ ^/api/portal/");
    expect(edge).toContain(
      "location ~ ^/api/(auth|v1/auth)/(login|forgot-password|reset-password)$",
    );
    expect(edge).toContain("location ~ ^/api/(auth|v1/auth)/ {");
    expect(provider).toContain("RateLimiter::for('portal-write'");
    expect(routes).toContain("'throttle:portal-write'");
    const versionedAuthRoutes = routes.slice(
      routes.indexOf("Route::prefix('auth')->group"),
    );
    expect(versionedAuthRoutes).toContain("Route::post('/login'");
    expect(versionedAuthRoutes).toContain("['same.origin', 'throttle:10,1']");
    expect(versionedAuthRoutes).not.toMatch(
      /Route::prefix\('auth'\)->middleware\('throttle:10,1'\)/,
    );
  });

  it("avoids automatic focus refetch and caps generic query retries at one", () => {
    const provider = read("src/components/query-provider.jsx");
    expect(provider).toContain("staleTime: 30_000");
    expect(provider).toContain("refetchOnWindowFocus: false");
    expect(provider).toContain("return failureCount < 1;");
  });
});
