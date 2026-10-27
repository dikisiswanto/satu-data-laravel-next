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
        className={cn(
          className,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <LoaderCircle
              size={16}
              aria-hidden="true"
              className="shrink-0 animate-spin motion-reduce:animate-none"
            />
            <span>{pendingText}</span>
          </span>
        ) : (
          children
        )}
      </button>
      {pending ? (
        <span className="sr-only" role="status">
          {pendingText}
        </span>
      ) : null}
    </>
  );
}
