import { cx } from "@/lib/utils";

const tones = {
  emerald: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  rose: "bg-rose-100 text-rose-800 ring-rose-200",
  sky: "bg-sky-100 text-sky-800 ring-sky-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  teal: "bg-teal-100 text-teal-800 ring-teal-200",
};

export default function Badge({ children, tone = "slate", className }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}
