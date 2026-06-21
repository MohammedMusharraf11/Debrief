import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import SentimentBadge from "@/components/debrief/SentimentBadge";
import { formatDate, locationLabel } from "@/lib/utils";

export default function DebriefCard({ row }) {
  const visit = row.visit || row;
  const debrief = row.debrief || {};
  const firstFinding = debrief.key_findings?.[0]?.finding || visit.notes || "Debrief not generated yet.";

  return (
    <Link href={`/debrief/${visit.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">{visit.program_area}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(visit.visit_date)}</span>
            <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{locationLabel(visit)}</span>
          </div>
        </div>
        <SentimentBadge sentiment={debrief.sentiment} />
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{firstFinding}</p>
      <div className="mt-3 text-xs font-black text-slate-500">{debrief.blockers?.length || 0} blockers</div>
    </Link>
  );
}
