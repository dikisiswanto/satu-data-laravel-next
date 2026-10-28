import { describe, expect, it } from "vitest";
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
