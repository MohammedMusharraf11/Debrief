"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingPanel from "@/components/ui/LoadingPanel";
import EmptyState from "@/components/ui/EmptyState";
import DebriefCard from "@/components/debrief/DebriefCard";
import RoleSwitcher from "@/components/layout/RoleSwitcher";
import { api } from "@/lib/api";

export default function MyVisitsPage() {
  const [rows, setRows] = useState([]);
  const [visitorName, setVisitorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("debrief.form.defaults");
    const defaults = saved ? JSON.parse(saved) : {};
    setVisitorName(defaults.visitor_name || "");

    api
      .get("/api/dashboard/debriefs?limit=100")
      .then((payload) => {
        const items = payload.items || [];
        setRows(defaults.visitor_name ? items.filter((row) => row.visit.visitor_name === defaults.visitor_name) : items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader eyebrow="Field staff" title="My visits" action={<RoleSwitcher />}>
        {visitorName ? `Showing visits logged as ${visitorName}.` : "Log once to remember your name and filter this list."}
      </PageHeader>
      <main className="safe-bottom px-4 sm:px-6 lg:px-8">
        {error ? <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {loading ? (
          <LoadingPanel label="Loading visits" />
        ) : rows.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => <DebriefCard key={row.visit.id} row={row} />)}
          </div>
        ) : (
          <EmptyState title="No visits yet">Your logged visits and generated summaries will appear here.</EmptyState>
        )}
      </main>
    </>
  );
}
