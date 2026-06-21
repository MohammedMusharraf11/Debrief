"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, MapPin, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import LocationPicker from "@/components/visit/LocationPicker";
import PillarsChecklist from "@/components/visit/PillarsChecklist";
import MediaUploader from "@/components/visit/MediaUploader";
import { INDIA_STATE_DISTRICTS, INDIA_STATES, PROGRAM_AREAS, STAKEHOLDERS } from "@/lib/constants";
import { api } from "@/lib/api";
import { cx } from "@/lib/utils";

const initialForm = {
  visitor_name: "",
  visit_date: new Date().toISOString().slice(0, 10),
  state: "",
  district: "",
  village: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  program_area: PROGRAM_AREAS[0],
  stakeholders: [],
  pillar_governance: "not_observed",
  pillar_financials: "not_observed",
  pillar_activities: "not_observed",
  pillar_outcomes: "not_observed",
  notes: "",
};

export default function VisitForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const stateOptions = form.state && !INDIA_STATES.includes(form.state) ? [form.state, ...INDIA_STATES] : INDIA_STATES;
  const districtBaseOptions = INDIA_STATE_DISTRICTS[form.state] || [];
  const districtOptions = form.district && !districtBaseOptions.includes(form.district)
    ? [form.district, ...districtBaseOptions]
    : districtBaseOptions;

  useEffect(() => {
    const saved = localStorage.getItem("debrief.form.defaults");
    if (saved) setForm((current) => ({ ...current, ...JSON.parse(saved) }));
    const draft = sessionStorage.getItem("debrief.visit.draft");
    if (draft) setForm((current) => ({ ...current, ...JSON.parse(draft) }));
  }, []);

  useEffect(() => {
    sessionStorage.setItem("debrief.visit.draft", JSON.stringify(form));
  }, [form]);

  const canContinue = useMemo(() => {
    if (step === 0) return form.visitor_name && form.state && form.district && form.village;
    if (step === 1) return form.program_area;
    return Boolean(form.notes || files.length);
  }, [step, form, files.length]);

  function update(key, value) {
    setForm((current) => {
      if (key === "state") {
        return { ...current, state: value, district: "", village: "" };
      }
      return { ...current, [key]: value };
    });
  }

  function toggleStakeholder(stakeholder) {
    setForm((current) => ({
      ...current,
      stakeholders: current.stakeholders.includes(stakeholder)
        ? current.stakeholders.filter((item) => item !== stakeholder)
        : [...current.stakeholders, stakeholder],
    }));
  }

  const handleLocationChange = useCallback((coords) => {
    setForm((current) => {
      const nextState = coords.state || current.state;
      return {
        ...current,
        ...coords,
        state: nextState,
        district: coords.district || current.district,
        village: coords.village || current.village,
        postal_code: coords.postal_code || current.postal_code,
      };
    });
  }, []);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...form,
        village: form.village || null,
        postal_code: form.postal_code || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
        notes: form.notes || null,
      };
      const visit = await api.post("/api/visits", payload);
      localStorage.setItem(
        "debrief.form.defaults",
        JSON.stringify({
          visitor_name: form.visitor_name,
          state: form.state,
          district: form.district,
          village: form.village,
          postal_code: form.postal_code,
        })
      );

      for (const item of files) {
        setFiles((current) => current.map((file) => (file.id === item.id ? { ...file, status: "uploading" } : file)));
        const body = new FormData();
        body.append("media_type", item.media_type);
        body.append("file", item.file);
        await api.postForm(`/api/visits/${visit.id}/media`, body);
        setFiles((current) => current.map((file) => (file.id === item.id ? { ...file, status: "processed" } : file)));
      }

      await api.post(`/api/visits/${visit.id}/debrief`, {});
      sessionStorage.removeItem("debrief.visit.draft");
      router.push(`/debrief/${visit.id}`);
    } catch (err) {
      setError(err.message || "Could not save visit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="safe-bottom px-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4">
          {["Where", "What", "Notes"].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={cx(
                "h-2 rounded-full transition",
                index <= step ? "bg-teal-700" : "bg-slate-200"
              )}
              aria-label={`Go to ${label}`}
            />
          ))}
        </div>

        <section className="app-surface rounded-xl p-3 sm:p-6">
          {step === 0 ? (
            <div className="grid gap-3 sm:gap-4">
              <Field label="Visitor name">
                <Input value={form.visitor_name} onChange={(event) => update("visitor_name", event.target.value)} placeholder="e.g. Anjali Kumar" />
              </Field>
              <Field label="Visit date">
                <Input type="date" value={form.visit_date} onChange={(event) => update("visit_date", event.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <Field label="State">
                  <Select value={form.state} onChange={(event) => update("state", event.target.value)}>
                    <option value="">Select state</option>
                    {stateOptions.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="District">
                  <Select value={form.district} onChange={(event) => update("district", event.target.value)} disabled={!form.state}>
                    <option value="">{form.state ? "Select district" : "Select state first"}</option>
                    {districtOptions.map((district) => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Village">
                  <Input value={form.village} onChange={(event) => update("village", event.target.value)} placeholder="Village or hamlet" />
                </Field>
                <Field label="PIN code">
                  <Input inputMode="numeric" value={form.postal_code} onChange={(event) => update("postal_code", event.target.value)} placeholder="563101" />
                </Field>
              </div>
              <LocationPicker
                state={form.state}
                district={form.district}
                village={form.village}
                postal_code={form.postal_code}
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={handleLocationChange}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-5">
              <Field label="Program area">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PROGRAM_AREAS.map((program) => (
                    <button
                      key={program}
                      type="button"
                      onClick={() => update("program_area", program)}
                      className={cx(
                        "min-h-14 rounded-lg border px-3 text-left text-sm font-black transition",
                        form.program_area === program ? "border-teal-700 bg-teal-50 text-teal-950" : "border-slate-200 bg-white text-slate-700"
                      )}
                    >
                      {program}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Stakeholders met">
                <div className="flex flex-wrap gap-2">
                  {STAKEHOLDERS.map((stakeholder) => (
                    <button key={stakeholder} type="button" onClick={() => toggleStakeholder(stakeholder)}>
                      <Badge tone={form.stakeholders.includes(stakeholder) ? "teal" : "slate"} className="min-h-10 px-3">
                        {stakeholder}
                      </Badge>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Four pillars quick check" helper="Tap each item to cycle status.">
                <PillarsChecklist value={form} onChange={setForm} />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-5">
              <Field label="Field notes">
                <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="What changed? What felt blocked? What needs follow-up?" />
              </Field>
              <Field label="Media capture">
                <MediaUploader files={files} setFiles={setFiles} />
              </Field>
            </div>
          ) : null}
        </section>

        {error ? <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="sticky bottom-[4.75rem] mt-3 grid grid-cols-[auto_1fr] gap-2 min-[430px]:bottom-20 sm:mt-4 sm:gap-3 [@media(max-height:720px)]:static">
          <Button variant="secondary" size="icon" disabled={step === 0 || submitting} onClick={() => setStep((value) => value - 1)} aria-label="Previous step">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {step < 2 ? (
            <Button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button disabled={!canContinue} loading={submitting} onClick={submit}>
              {submitting ? "Saving and generating" : "Save visit"}
              {submitting ? null : <Save className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="mt-4 hidden items-center justify-center gap-2 text-xs font-bold text-slate-500 min-[380px]:flex">
          <MapPin className="h-4 w-4 text-teal-700" />
          Mobile-first capture for field conditions
          <Check className="h-4 w-4 text-emerald-700" />
        </div>
      </div>
    </main>
  );
}
