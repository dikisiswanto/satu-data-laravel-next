"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { portalQueryKeys } from "@/lib/api/query-keys";

/** Remove private portal cache when navigation returns to the login screen. */
export function PortalQueryCacheGuard() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (pathname === "/portal/login" || pathname === "/portal/login/") {
      queryClient.removeQueries({ queryKey: portalQueryKeys.root });
    }
  }, [pathname, queryClient]);

  return null;
}
