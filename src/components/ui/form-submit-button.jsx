"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Submit button that reflects the pending state of its parent server-action form. */
export function FormSubmitButton({
  children,
  pendingText = "Sedang menyimpan…",
  className,
  disabled = false,
  ...props
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <button
        type="submit"
        disabled={disabled || pending}
        aria-busy={pending}
        className={cn(
          className,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        )}
        {...props}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <LoaderCircle
              size={16}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
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
