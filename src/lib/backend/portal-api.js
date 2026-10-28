import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendData, backendFetch } from "@/lib/backend/server";
import { getRequestVerifiedUser } from "@/lib/backend/request-user";

const PORTAL_API_PREFIX = "/api/v1/portal";

function portalPath(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new TypeError("Portal API path is invalid");
  }
  return `${PORTAL_API_PREFIX}/${normalized}`;
}

/** Fetch the Laravel portal API response, including pagination metadata. */
export function portalApi(path, options = {}) {
  const endpoint = portalPath(path);
  return withInvalidSessionRedirect(
    () => backendFetch(endpoint, options),
    endpoint,
  );
}

/** Fetch the `data` member from a Laravel portal API response. */
export function portalData(path, options = {}) {
  const endpoint = portalPath(path);
  return withInvalidSessionRedirect(
    () => backendData(endpoint, options),
    endpoint,
  );
}

async function withInvalidSessionRedirect(request, endpoint) {
  try {
    return await request();
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status >= 500 || status === 429 || status === 0) {
      const log = status >= 500 || status === 0 ? console.error : console.warn;
      log("portal_api_request_failed", {
        path: String(endpoint).split("?")[0],
        status: status || null,
        code: typeof error?.code === "string" ? error.code : "unknown_error",
        request_id:
          typeof error?.requestId === "string" ? error.requestId : null,
      });
    }
    if (status === 401) redirect("/portal/login");
    throw error;
  }
}

export const getPortalShell = cache(async () => {
  const verification = await getRequestVerifiedUser();
  const user = verification?.data?.user;

  if (verification?.error || !user) redirect("/portal/login");

  return {
    roles: Array.isArray(user.roles) ? user.roles : [],
    memberships: Array.isArray(user.memberships) ? user.memberships : [],
    onboarding_completed_at: user.onboarding_completed_at || null,
  };
});
