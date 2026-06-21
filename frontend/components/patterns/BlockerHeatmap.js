import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { BLOCKER_CATEGORIES } from "@/lib/constants";

export default function BlockerHeatmap({ patterns = [] }) {
  if (!patterns.length) {
    return <EmptyState title="No blocker patterns yet">Generate debriefs with blockers to see geography-level recurrence.</EmptyState>;
  }

  const districts = [...new Set(patterns.map((item) => item.district))];
  const max = Math.max(...patterns.map((item) => item.count), 1);
  const byKey = new Map(patterns.map((item) => [`${item.district}:${item.category}`, item]));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <div className="px-4 py-3">District</div>
          {BLOCKER_CATEGORIES.map((category) => <div key={category} className="px-3 py-3">{category}</div>)}
        </div>
        {districts.map((district) => (
          <div key={district} className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
            <div className="px-4 py-3 text-sm font-black text-slate-900">{district}</div>
            {BLOCKER_CATEGORIES.map((category) => {
              const item = byKey.get(`${district}:${category}`);
              const intensity = item ? item.count / max : 0;
              const background = intensity ? `rgba(225, 29, 72, ${0.14 + intensity * 0.52})` : "rgba(248, 250, 252, 1)";
              return (
                <Link
                  key={category}
                  href={`/dashboard?district=${encodeURIComponent(district)}&blocker_category=${category}`}
                  className="px-3 py-3 text-sm font-black text-slate-800"
                  style={{ background }}
                >
                  {item?.count || 0}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
