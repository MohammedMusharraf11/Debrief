"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Image as ImageIcon, Mic, Video } from "lucide-react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import LoadingPanel from "@/components/ui/LoadingPanel";
import EmptyState from "@/components/ui/EmptyState";
import SentimentBadge from "@/components/debrief/SentimentBadge";
import BlockerList from "@/components/debrief/BlockerList";
import FollowUpList from "@/components/debrief/FollowUpList";
import { api } from "@/lib/api";
import { formatDate, locationLabel } from "@/lib/utils";

const mediaIcons = {
  voice: Mic,
  photo: ImageIcon,
  handwritten: FileText,
  video: Video,
};

export default function DebriefPage() {
  const params = useParams();
  const [state, setState] = useState({ loading: true, visit: null, debrief: null, media: [], error: "" });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [visit, debrief, media] = await Promise.all([
          api.get(`/api/visits/${params.id}`),
          api.get(`/api/visits/${params.id}/debrief`),
          api.get(`/api/visits/${params.id}/media`),
        ]);
        if (alive) setState({ loading: false, visit, debrief, media, error: "" });
      } catch (err) {
        if (alive) setState((current) => ({ ...current, loading: false, error: err.message }));
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [params.id]);

  if (state.loading) {
    return <main className="safe-bottom px-4 pt-6"><LoadingPanel label="Opening debrief" /></main>;
  }

  if (state.error) {
    return <main className="safe-bottom px-4 pt-6"><EmptyState title="Debrief unavailable">{state.error}</EmptyState></main>;
  }

  const { visit, debrief, media } = state;

  return (
    <>
      <PageHeader
        eyebrow={formatDate(visit.visit_date)}
        title={visit.program_area}
        action={
          <Link href="/dashboard">
            <Button variant="secondary" size="icon" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        }
      >
        {locationLabel(visit)} | {visit.visitor_name}
      </PageHeader>

      <main className="safe-bottom grid gap-4 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="app-surface rounded-xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">AI debrief</h2>
              <p className="mt-1 text-sm text-slate-600">{debrief.sentiment_rationale}</p>
            </div>
            <SentimentBadge sentiment={debrief.sentiment} />
          </div>

          <div className="mt-6 grid gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">Key findings</h3>
            {(debrief.key_findings || []).length ? (
              <div className="grid gap-3">
                {debrief.key_findings.map((item, index) => (
                  <div key={`${item.finding}-${index}`} className="rounded-lg bg-teal-50 p-4">
                    <p className="text-sm font-bold leading-6 text-teal-950">{item.finding}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-teal-700">{item.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No key findings generated.</p>
            )}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="app-surface rounded-xl p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-black text-slate-950">Blockers</h2>
            <BlockerList blockers={debrief.blockers} />
          </div>

          <div className="app-surface rounded-xl p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-black text-slate-950">Follow-ups</h2>
            <FollowUpList followUps={debrief.follow_ups} />
          </div>
        </section>

        <section className="app-surface rounded-xl p-4 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-black text-slate-950">Original media</h2>
          {media.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {media.map((item) => {
                const Icon = mediaIcons[item.media_type] || FileText;
                return (
                  <a key={item.id} href={item.signed_url || "#"} target="_blank" className="rounded-lg border border-slate-200 bg-white p-4" rel="noreferrer">
                    <Icon className="h-5 w-5 text-teal-700" />
                    <p className="mt-2 truncate text-sm font-black text-slate-900">{item.original_name || item.media_type}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.extracted_text || item.processing_status}</p>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No media attached.</p>
          )}
        </section>
      </main>
    </>
  );
}
