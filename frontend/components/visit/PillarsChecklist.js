"use client";

import { CheckCircle2, CircleDashed, TriangleAlert, XCircle } from "lucide-react";
import { PILLAR_STATUSES } from "@/lib/constants";
import { cx } from "@/lib/utils";

const statusIcons = {
  on_track: CheckCircle2,
  at_risk: TriangleAlert,
  off_track: XCircle,
  not_observed: CircleDashed,
};

const toneClasses = {
  on_track: "border-emerald-300 bg-emerald-50 text-emerald-900",
  at_risk: "border-amber-300 bg-amber-50 text-amber-950",
  off_track: "border-rose-300 bg-rose-50 text-rose-900",
  not_observed: "border-slate-200 bg-white text-slate-600",
};

const pillars = [
  { key: "pillar_governance", label: "Governance" },
  { key: "pillar_financials", label: "Financials" },
  { key: "pillar_activities", label: "Activities" },
  { key: "pillar_outcomes", label: "Outcomes" },
];

function nextStatus(current) {
  const index = PILLAR_STATUSES.findIndex((item) => item.value === current);
  return PILLAR_STATUSES[(index + 1) % PILLAR_STATUSES.length].value;
}

export default function PillarsChecklist({ value, onChange }) {
  return (
    <div className="grid gap-3">
      {pillars.map((pillar) => {
        const status = value[pillar.key];
        const Icon = statusIcons[status];
        const statusLabel = PILLAR_STATUSES.find((item) => item.value === status)?.label || status;
        return (
          <button
            key={pillar.key}
            type="button"
            onClick={() => onChange({ ...value, [pillar.key]: nextStatus(status) })}
            className={cx(
              "flex min-h-14 items-center justify-between rounded-lg border px-4 text-left transition active:scale-[0.99]",
              toneClasses[status]
            )}
          >
            <span>
              <span className="block text-sm font-black">{pillar.label}</span>
              <span className="block text-xs font-semibold capitalize opacity-80">{statusLabel}</span>
            </span>
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </div>
  );
}
