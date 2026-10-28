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
  return withInvalidSessionRedirect(() =>
    backendFetch(portalPath(path), options),
  );
}

/** Fetch the `data` member from a Laravel portal API response. */
export function portalData(path, options = {}) {
  return withInvalidSessionRedirect(() =>
    backendData(portalPath(path), options),
  );
}

async function withInvalidSessionRedirect(request) {
  try {
    return await request();
  } catch (error) {
    if (Number(error?.status) === 401) redirect("/portal/login");
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
