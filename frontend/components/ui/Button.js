import { Loader2 } from "lucide-react";
import { cx } from "@/lib/utils";

const variants = {
  primary: "bg-[#0f2d2e] text-white shadow-lg shadow-teal-950/15 hover:bg-[#143b3c]",
  secondary: "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
  ghost: "text-slate-700 hover:bg-white/70",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizes = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-4 text-sm",
  lg: "min-h-14 px-5 text-base",
  icon: "h-12 w-12 p-0",
};

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
