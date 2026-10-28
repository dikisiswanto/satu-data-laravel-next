import { describe, expect, it } from "vitest";
import { getRetryAfterMs } from "../../src/lib/api/client-response.js";
import { isTransientAuthFailure } from "../../src/lib/backend/auth-errors.js";

describe("session resilience during API throttling", () => {
  it("treats rate limiting as temporary and does not mistake it for logout", () => {
    expect(isTransientAuthFailure({ status: 429, code: "rate_limited" })).toBe(
      true,
    );
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
