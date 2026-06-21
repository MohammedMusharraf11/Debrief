"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingPanel from "@/components/ui/LoadingPanel";
import BlockerHeatmap from "@/components/patterns/BlockerHeatmap";
import SentimentTrend from "@/components/patterns/SentimentTrend";
import { api } from "@/lib/api";

export default function PatternsPage() {
  const [state, setState] = useState({ loading: true, blockers: [], sentiment: [], error: "" });

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/api/dashboard/patterns/blockers"),
      api.get("/api/dashboard/patterns/sentiment"),
    ])
      .then(([blockers, sentiment]) => {
        if (alive) setState({ loading: false, blockers, sentiment, error: "" });
      })
      .catch((err) => {
        if (alive) setState((current) => ({ ...current, loading: false, error: err.message }));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="Pattern surfacing" title="Recurring signals">
        See what repeats across visits before it becomes a reporting scramble.
      </PageHeader>
      <main className="safe-bottom grid gap-5 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        {state.error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 lg:col-span-2">{state.error}</p> : null}
        {state.loading ? (
          <div className="lg:col-span-2"><LoadingPanel label="Loading patterns" /></div>
        ) : (
          <>
            <section className="grid gap-3">
              <h2 className="text-lg font-black text-slate-950">Recurring blockers</h2>
              <BlockerHeatmap patterns={state.blockers} />
            </section>
            <section className="grid gap-3">
              <h2 className="text-lg font-black text-slate-950">Sentiment trend</h2>
              <SentimentTrend points={state.sentiment} />
            </section>
          </>
        )}
      </main>
    </>
  );
}
