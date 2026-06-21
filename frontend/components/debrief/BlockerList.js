import { AlertTriangle } from "lucide-react";
import { severityTone } from "@/lib/utils";

export default function BlockerList({ blockers = [] }) {
  if (!blockers.length) {
    return <p className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No blockers surfaced.</p>;
  }

  return (
    <div className="grid gap-3">
      {blockers.map((blocker, index) => (
        <div key={`${blocker.description}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-slate-700">{blocker.category}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${severityTone(blocker.severity)}`}>{blocker.severity}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{blocker.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
