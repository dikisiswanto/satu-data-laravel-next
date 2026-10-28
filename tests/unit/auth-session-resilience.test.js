import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
import { getRetryAfterMs } from "../../src/lib/api/client-response.js";
import {
  assertPortalSessionVerification,
  isInvalidPortalSession,
  isTransientAuthFailure,
} from "../../src/lib/backend/auth-errors.js";

describe("session resilience during API throttling", () => {
  it("treats rate limiting as temporary and does not mistake it for logout", () => {
    expect(isTransientAuthFailure({ status: 429, code: "rate_limited" })).toBe(
      true,
    );
    expect(isInvalidPortalSession({ status: 429, code: "rate_limited" })).toBe(
      false,
    );
  });

  it("only treats an unauthorized or explicitly missing session as invalid", () => {
    expect(isInvalidPortalSession({ status: 401, code: "unauthorized" })).toBe(
      true,
    );
    expect(
      isInvalidPortalSession({
        code: "auth_session_missing",
        message: "Auth session missing",
      }),
    ).toBe(true);
    expect(isInvalidPortalSession({ status: 503 })).toBe(false);
  });

  it("throws transient verification errors so pages cannot mistake them for logout", () => {
    const rateLimit = Object.assign(new Error("Too many requests."), {
      status: 429,
      code: "rate_limited",
    });

    expect(() =>
      assertPortalSessionVerification({
        data: { user: null },
        error: rateLimit,
      }),
    ).toThrow("Too many requests.");
    expect(
      assertPortalSessionVerification({
        data: { user: null },
        error: { status: 401, code: "unauthorized" },
      }).error.status,
    ).toBe(401);
  });

  it("honors a numeric Retry-After header for query retries", () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "7" },
    });

    expect(getRetryAfterMs(response)).toBe(7000);
  });

  it("keeps a long server retry delay bounded to one minute", () => {
    const response = new Response(null, {
      status: 429,
      headers: { "Retry-After": "300" },
    });

    expect(getRetryAfterMs(response)).toBe(60_000);
  });
});

describe("configurable session cookie migration", () => {
  it("uses the generic cookie name and retains a legacy-cookie fallback", () => {
    const helper = read("src/lib/auth/session-cookie.js");
    const backendHelper = read("backend/app/Support/FrontendTokenCookie.php");
    const appConfig = read("backend/config/app.php");
    expect(helper).toContain('"portal_session_token"');
    expect(helper).toContain('"wajo_portal_token"');
    expect(helper).toContain("getFrontendToken");
    expect(backendHelper).toContain("LEGACY_COOKIE_NAME");
    expect(backendHelper).toContain("config('app.frontend_token_cookie'");
    expect(appConfig).toContain(
      "env('FRONTEND_TOKEN_COOKIE', 'portal_session_token')",
    );
  });
});
