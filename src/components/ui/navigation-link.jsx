import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  public: {
    base: "public-link relative inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2",
    active: "public-link-active",
    inactive: "text-[#40566a] hover:bg-[#eef4fa] hover:text-[#174ea6]",
  },
  portal: {
    base: "inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] font-medium leading-[1.35] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5fa7] focus-visible:ring-offset-2",
    active:
      "border-[#d9e7f3] bg-[#edf4fb] font-semibold text-[#174f80] shadow-[inset_3px_0_#246d99]",
    inactive:
      "border-transparent text-[#5a6f80] hover:bg-[#f0f6fa] hover:text-[#1d5fa7]",
  },
};

export function NavigationLink({
  href,
  active = false,
  variant = "public",
  icon: Icon,
  children,
  className,
  iconSize = 16,
  ...props
}) {
  const style = variants[variant] ?? variants.public;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      prefetch={variant === "portal" ? false : undefined}
      className={cn(
        style.base,
        active ? style.active : style.inactive,
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          size={iconSize}
          strokeWidth={active ? 2.2 : 1.8}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </Link>
  );
}
