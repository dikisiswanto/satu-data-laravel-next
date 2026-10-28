import "server-only";
import { cache } from "react";
import { backendData, backendFetch } from "@/lib/backend/server";

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
  return backendFetch(portalPath(path), options);
}

/** Fetch the `data` member from a Laravel portal API response. */
export function portalData(path, options = {}) {
  return backendData(portalPath(path), options);
}

export const getPortalShell = cache(() => portalData("shell"));
