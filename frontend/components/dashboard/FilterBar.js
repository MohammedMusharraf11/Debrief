"use client";

import { RotateCcw, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { BLOCKER_CATEGORIES, PROGRAM_AREAS, SENTIMENTS } from "@/lib/constants";

export default function FilterBar({ filters, setFilters }) {
  function update(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="app-surface grid gap-3 rounded-xl p-3 lg:grid-cols-[1.2fr_repeat(4,1fr)_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search notes, blockers, location" value={filters.search} onChange={(event) => update("search", event.target.value)} />
      </div>
      <Input placeholder="District" value={filters.district} onChange={(event) => update("district", event.target.value)} />
      <Select value={filters.program_area} onChange={(event) => update("program_area", event.target.value)}>
        <option value="">All programs</option>
        {PROGRAM_AREAS.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select value={filters.sentiment} onChange={(event) => update("sentiment", event.target.value)}>
        <option value="">All sentiment</option>
        {SENTIMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select value={filters.blocker_category} onChange={(event) => update("blocker_category", event.target.value)}>
        <option value="">All blockers</option>
        {BLOCKER_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Button variant="secondary" size="icon" onClick={() => setFilters({ search: "", district: "", program_area: "", sentiment: "", blocker_category: "" })} aria-label="Clear filters">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
