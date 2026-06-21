import { cx } from "@/lib/utils";

export function Field({ label, helper, error, children }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
      {helper && !error ? <span className="text-xs text-slate-500">{helper}</span> : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cx(
        "min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(
        "min-h-32 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cx(
        "min-h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
