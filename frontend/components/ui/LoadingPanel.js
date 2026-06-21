import { Loader2 } from "lucide-react";

export default function LoadingPanel({ label = "Loading" }) {
  return (
    <div className="grid place-items-center rounded-lg bg-white/80 px-5 py-12 text-slate-600 ring-1 ring-slate-200">
      <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}
