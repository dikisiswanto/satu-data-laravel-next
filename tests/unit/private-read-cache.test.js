import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearPrivateReadCacheForTests,
  createPrivateReadCacheIdentity,
  getOrCreatePrivateReadCache,
  getPrivateReadCache,
  invalidatePrivateReadCache,
  setPrivateReadCache,
} from "@/lib/backend/private-read-cache";

const tokenA = "token-for-test-user-a-0123456789";
const tokenB = "token-for-test-user-b-0123456789";

afterEach(() => clearPrivateReadCacheForTests());

describe("token-scoped private API microcache", () => {
  it("reuses a response only for the same token and endpoint", () => {
    const a = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/organizations",
      headers: new Headers({ Accept: "application/json" }),
    });
    const otherUser = createPrivateReadCacheIdentity({
      token: tokenB,
      path: "/api/v1/portal/organizations",
      headers: new Headers({ Accept: "application/json" }),
    });
    setPrivateReadCache(a, { data: [{ id: "org-a" }] });

    expect(getPrivateReadCache(a)).toEqual({ data: [{ id: "org-a" }] });
    expect(getPrivateReadCache(otherUser)).toBeUndefined();
  });

  it("returns copies so callers cannot mutate cached data", () => {
    const identity = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/profile",
    });
    setPrivateReadCache(identity, { data: { name: "Initial" } });
    const response = getPrivateReadCache(identity);
    response.data.name = "Mutated";
    expect(getPrivateReadCache(identity).data.name).toBe("Initial");
  });

  it("expires entries and invalidates all entries after a mutation", () => {
    const first = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/profile",
    });
    const second = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/organizations",
    });
    setPrivateReadCache(first, { data: true }, { now: 100, ttlMs: 50 });
    expect(getPrivateReadCache(first, 151)).toBeUndefined();

    setPrivateReadCache(first, { data: true });
    setPrivateReadCache(second, { data: true });
    invalidatePrivateReadCache(tokenA);
    expect(getPrivateReadCache(first)).toBeUndefined();
    expect(getPrivateReadCache(second)).toBeUndefined();
  });

  it("coalesces concurrent reads for the same user and endpoint", async () => {
    const identity = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/organizations",
    });
    let resolveLoad;
    const loader = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = getOrCreatePrivateReadCache(identity, loader);
    const secondLoader = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "duplicate" }] });
    const second = getOrCreatePrivateReadCache(identity, secondLoader);
    resolveLoad({ data: [{ id: "org-a" }] });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: [{ id: "org-a" }] },
      { data: [{ id: "org-a" }] },
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(secondLoader).not.toHaveBeenCalled();
  });

  it("does not repopulate cache when a mutation invalidates an in-flight read", async () => {
    const identity = createPrivateReadCacheIdentity({
      token: tokenA,
      path: "/api/v1/portal/organizations",
    });
    let resolveLoad;
    const pending = getOrCreatePrivateReadCache(
      identity,
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );

    invalidatePrivateReadCache(tokenA);
    resolveLoad({ data: [{ id: "stale" }] });
    await pending;

    expect(getPrivateReadCache(identity)).toBeUndefined();
  });

  it("never creates an identity for a malformed or short token", () => {
    expect(
      createPrivateReadCacheIdentity({
        token: "short",
        path: "/api/v1/portal/profile",
      }),
    ).toBeNull();
  });
});
