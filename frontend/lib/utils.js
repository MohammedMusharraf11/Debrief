export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value) {
  if (!value) return "Not dated";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function locationLabel(visit = {}) {
  return [visit.village, visit.block, visit.district, visit.state].filter(Boolean).join(", ");
}

export function sentimentTone(sentiment) {
  return {
    positive: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    neutral: "bg-sky-100 text-sky-800 ring-sky-200",
    negative: "bg-rose-100 text-rose-800 ring-rose-200",
    mixed: "bg-amber-100 text-amber-900 ring-amber-200",
  }[sentiment] || "bg-slate-100 text-slate-700 ring-slate-200";
}

export function severityTone(severity) {
  return {
    high: "bg-rose-100 text-rose-800",
    medium: "bg-amber-100 text-amber-900",
    low: "bg-emerald-100 text-emerald-800",
  }[severity] || "bg-slate-100 text-slate-700";
}
