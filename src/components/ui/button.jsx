import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonStyles = cva(
  "inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors [&_svg]:shrink-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border bg-white text-ink hover:bg-slate-50",
        ghost: "text-ink hover:bg-slate-100",
        danger: "bg-red-700 text-white hover:bg-red-800",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);
export function Button({
  className,
  variant,
  size,
  href,
  children,
  prefetch,
  ...props
}) {
  const classes = cn(buttonStyles({ variant, size }), className);
  if (href)
    return (
      <Link
        className={classes}
        href={href}
        prefetch={prefetch ?? (href.startsWith("/portal") ? false : undefined)}
        {...props}
      >
        {children}
      </Link>
    );
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
