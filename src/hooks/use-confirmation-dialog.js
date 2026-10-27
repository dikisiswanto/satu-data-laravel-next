"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Promise-based dialog state. `confirm()` resolves to a boolean; `alert()`
 * presents the same accessible popup with a single acknowledgement button.
 */
export function useConfirmationDialog() {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const openDialog = useCallback((type, options = {}) => {
    return new Promise((resolve) => {
      // There must be only one unresolved dialog per hook instance.
      if (resolverRef.current) {
        resolve(false);
        return;
      }
      resolverRef.current = resolve;
      setDialog({
        type,
        title: options.title || "",
        description: options.description || "",
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        variant: options.variant || "primary",
      });
    });
  }, []);

  const confirm = useCallback(
    (options) => openDialog("confirm", options),
    [openDialog],
  );
  const alert = useCallback(
    (options) => openDialog("alert", options),
    [openDialog],
  );
  const resolveDialog = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(Boolean(result));
  }, []);

  return { alert, confirm, dialog, resolveDialog };
}
