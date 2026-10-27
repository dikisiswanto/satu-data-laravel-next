"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Synchronous submission lock for actions that must not run twice before React
 * has committed the pending state. `pending` is for rendering; the ref is the
 * actual duplicate-submit guard.
 */
export function useSubmissionLock() {
  const lockedRef = useRef(false);
  const uncertainRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  const begin = useCallback(() => {
    // A timeout/network failure can leave the server-side result unknown. Do
    // not allow a second mutation until the user has reloaded and checked state.
    if (lockedRef.current || uncertainRef.current) return false;
    lockedRef.current = true;
    setPending(true);
    return true;
  }, []);

  const finish = useCallback(() => {
    lockedRef.current = false;
    setPending(false);
  }, []);

  const isLocked = useCallback(() => lockedRef.current, []);
  const markUncertain = useCallback(() => {
    uncertainRef.current = true;
    setUncertain(true);
  }, []);
  return { pending, begin, finish, isLocked, uncertain, markUncertain };
}
