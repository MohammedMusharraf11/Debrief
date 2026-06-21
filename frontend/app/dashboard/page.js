"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingPanel from "@/components/ui/LoadingPanel";
import StatsRow from "@/components/dashboard/StatsRow";
import FilterBar from "@/components/dashboard/FilterBar";
import DebriefTable from "@/components/dashboard/DebriefTable";
import { api } from "@/lib/api";

const initialFilters = { search: "", district: "", program_area: "", sentiment: "", blocker_category: "" };

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters((current) => ({
      ...current,
      search: params.get("search") || current.search,
      district: params.get("district") || current.district,
      program_area: params.get("program_area") || current.program_area,
      sentiment: params.get("sentiment") || current.sentiment,
      blocker_category: params.get("blocker_category") || current.blocker_category,
    }));
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const suffix = query ? `?${query}` : "";
        const [list, statPayload] = await Promise.all([
          api.get(`/api/dashboard/debriefs${suffix}`),
          api.get(`/api/dashboard/stats${filters.district || filters.program_area ? suffix : ""}`),
        ]);
        if (alive) {
          setRows(list.items || []);
          setStats(statPayload);
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [query, filters.district, filters.program_area]);

  return (
    <>
      <PageHeader eyebrow="Manager view" title="Dashboard">
        Scan visits, filter debriefs, and jump into the source notes when something needs action.
      </PageHeader>
      <main className="safe-bottom grid gap-4 px-4 sm:px-6 lg:px-8">
        <StatsRow stats={stats || {}} />
        <FilterBar filters={filters} setFilters={setFilters} />
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {loading ? <LoadingPanel label="Loading dashboard" /> : <DebriefTable rows={rows} />}
      </main>
    </>
  );
}
