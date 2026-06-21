import EmptyState from "@/components/ui/EmptyState";

export default function SentimentTrend({ points = [] }) {
  if (!points.length) {
    return <EmptyState title="No sentiment trend yet">Generated debriefs will produce weekly sentiment movement here.</EmptyState>;
  }

  const sorted = [...points].sort((a, b) => `${a.week}-${a.district}`.localeCompare(`${b.week}-${b.district}`));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3">
        {sorted.slice(-16).map((point) => {
          const width = Math.max(8, ((point.avg_sentiment_score + 1) / 2) * 100);
          const tone = point.avg_sentiment_score > 0.25 ? "bg-emerald-500" : point.avg_sentiment_score < -0.25 ? "bg-rose-500" : "bg-sky-500";
          return (
            <div key={`${point.week}-${point.district}`} className="grid gap-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                <span>{point.week} | {point.district}</span>
                <span>{point.avg_sentiment_score} | {point.visit_count} visits</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
