/** Dispatch a toast notification to the shared browser-level portal host. */
export function notifyPortalToast(type, message, options = {}) {
  if (
    typeof window === "undefined" ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent("portal:toast", {
      detail: {
        type: type === "success" ? "success" : "error",
        message: message.trim(),
        duration: Number.isFinite(options.duration)
          ? Math.max(1800, Math.min(9000, options.duration))
          : 4500,
      },
    }),
  );
}
