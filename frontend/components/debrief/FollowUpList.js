import { CheckSquare } from "lucide-react";
import { severityTone } from "@/lib/utils";

export default function FollowUpList({ followUps = [] }) {
  if (!followUps.length) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">No follow-ups generated.</p>;
  }

  return (
    <div className="grid gap-3">
      {followUps.map((item, index) => (
        <div key={`${item.action}-${index}`} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-6 text-slate-800">{item.action}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${severityTone(item.priority)}`}>{item.priority}</span>
              {item.assignee_hint ? <span className="text-xs font-semibold text-slate-500">{item.assignee_hint}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
