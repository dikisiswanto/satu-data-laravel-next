import { cn } from "@/lib/utils";
const variants = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-700/15",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-700/15",
  danger: "bg-red-50 text-red-800 ring-1 ring-red-700/15",
  primary: "bg-accent text-primary",
};
export function Badge({ variant = "neutral", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant] || variants.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
