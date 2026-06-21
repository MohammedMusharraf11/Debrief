import { ClipboardList } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", children }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-teal-100 text-teal-800">
        <ClipboardList className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
      {children ? <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{children}</p> : null}
    </div>
  );
}
