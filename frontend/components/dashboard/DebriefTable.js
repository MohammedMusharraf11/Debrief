import DebriefCard from "@/components/debrief/DebriefCard";
import SentimentBadge from "@/components/debrief/SentimentBadge";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { formatDate, locationLabel } from "@/lib/utils";

export default function DebriefTable({ rows = [] }) {
  if (!rows.length) {
    return <EmptyState title="No debriefs found">Try clearing filters or log a new field visit.</EmptyState>;
  }

  return (
    <>
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => <DebriefCard key={row.visit.id} row={row} />)}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Program</th>
              <th className="px-4 py-3">Sentiment</th>
              <th className="px-4 py-3">Blockers</th>
              <th className="px-4 py-3">Finding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ visit, debrief }) => (
              <tr key={visit.id} className="hover:bg-teal-50/40">
                <td className="px-4 py-4 font-semibold text-slate-700">{formatDate(visit.visit_date)}</td>
                <td className="px-4 py-4 text-slate-600">{locationLabel(visit)}</td>
                <td className="px-4 py-4 font-black text-slate-900">{visit.program_area}</td>
                <td className="px-4 py-4"><SentimentBadge sentiment={debrief?.sentiment} /></td>
                <td className="px-4 py-4 font-black text-slate-700">{debrief?.blockers?.length || 0}</td>
                <td className="px-4 py-4">
                  <Link href={`/debrief/${visit.id}`} className="line-clamp-2 text-slate-600 hover:text-teal-800">
                    {debrief?.key_findings?.[0]?.finding || visit.notes || "Open visit"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
