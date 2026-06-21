import { AlertTriangle, CalendarClock, ClipboardList, SmilePlus } from "lucide-react";

const cards = [
  { key: "total_visits", label: "Total visits", icon: ClipboardList, tone: "bg-teal-100 text-teal-800" },
  { key: "visits_with_blockers", label: "With blockers", icon: AlertTriangle, tone: "bg-rose-100 text-rose-800" },
  { key: "visits_this_week", label: "This week", icon: CalendarClock, tone: "bg-sky-100 text-sky-800" },
  { key: "sentiment", label: "Positive", icon: SmilePlus, tone: "bg-emerald-100 text-emerald-800" },
];

export default function StatsRow({ stats }) {
  const positive = stats?.sentiment_distribution?.positive || 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, tone }) => {
        const value = key === "sentiment" ? positive : stats?.[key] || 0;
        return (
          <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          </div>
        );
      })}
    </div>
  );
}
