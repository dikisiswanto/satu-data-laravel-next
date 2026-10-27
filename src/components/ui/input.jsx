import { cn } from "@/lib/utils";
export function Input({ className, ...props }) {
  return <input className={cn("field", className)} {...props} />;
}
