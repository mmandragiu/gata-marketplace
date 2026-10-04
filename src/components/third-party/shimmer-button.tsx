/**
 * Shimmer Button — adapted from Watermelon UI (https://ui.watermelon.sh, MIT License,
 * © Watermelon Platform Contributors). Changes: exported class helper so links can share the style.
 */
import { cn } from "@/lib/utils";

export const shimmerClasses = (className?: string) =>
  cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 font-semibold",
    "bg-primary text-primary-foreground shadow-sm transition-shadow duration-300 hover:shadow-lg",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
    className,
  );

export function ShimmerShine() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
    />
  );
}

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function ShimmerButton({ children, className, ...props }: ShimmerButtonProps) {
  return (
    <button className={shimmerClasses(className)} {...props}>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <ShimmerShine />
    </button>
  );
}
