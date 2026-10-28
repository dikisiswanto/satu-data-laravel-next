"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Button for client-side mutations; keeps the action visibly pending and inert. */
export function PendingActionButton({
  children,
  pending = false,
  pendingText = "Sedang memproses…",
  disabled = false,
  type = "button",
  className,
  ...props
}) {
  return (
    <>
      <button
        {...props}
        type={type}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        data-stateful-button="true"
        data-pending={pending ? "true" : "false"}
        className={cn(
          className,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className="button-state-stack grid min-w-0 grid-cols-[max-content] [&>*]:col-start-1 [&>*]:row-start-1">
          <span
            className={
              pending
                ? "button-state-layer button-state-normal invisible"
                : "button-state-layer button-state-normal"
            }
            aria-hidden={pending || undefined}
          >
            {children}
          </span>
          <span
            className={
              pending
                ? "button-state-layer button-state-pending"
                : "button-state-layer button-state-pending invisible"
            }
            aria-hidden={!pending || undefined}
          >
            <LoaderCircle
              size={16}
              aria-hidden="true"
              className="shrink-0 motion-safe:animate-spin motion-reduce:animate-none"
            />
            <span>{pendingText}</span>
          </span>
        </span>
      </button>
      {pending ? (
        <span className="sr-only" role="status">
          {pendingText}
        </span>
      ) : null}
    </>
  );
}
