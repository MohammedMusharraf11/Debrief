"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import LoadingPanel from "@/components/ui/LoadingPanel";
import VisitMap from "@/components/map/VisitMap";
import { api } from "@/lib/api";

export default function MapPage() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get("/api/dashboard/debriefs?format=geo&limit=200")
      .then((payload) => {
        if (alive) setFeatures(payload.features || []);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="Geo view" title="Visit map">
        Pins use captured latitude and longitude, color-weighted by blockers and sentiment.
      </PageHeader>
      <main className="safe-bottom px-4 sm:px-6 lg:px-8">
        {error ? <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
        {loading ? <LoadingPanel label="Loading map" /> : <VisitMap features={features} />}
      </main>
    </>
  );
}
