CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    visitor_name TEXT NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    block TEXT,
    village TEXT,
    postal_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    program_area TEXT NOT NULL,
    stakeholders TEXT[] NOT NULL DEFAULT '{}',
    pillar_governance TEXT NOT NULL DEFAULT 'not_observed'
        CHECK (pillar_governance IN ('on_track', 'at_risk', 'off_track', 'not_observed')),
    pillar_financials TEXT NOT NULL DEFAULT 'not_observed'
        CHECK (pillar_financials IN ('on_track', 'at_risk', 'off_track', 'not_observed')),
    pillar_activities TEXT NOT NULL DEFAULT 'not_observed'
        CHECK (pillar_activities IN ('on_track', 'at_risk', 'off_track', 'not_observed')),
    pillar_outcomes TEXT NOT NULL DEFAULT 'not_observed'
        CHECK (pillar_outcomes IN ('on_track', 'at_risk', 'off_track', 'not_observed')),
    notes TEXT,
    debrief_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (debrief_status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS media_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'voice', 'handwritten')),
    storage_path TEXT NOT NULL,
    original_name TEXT,
    mime_type TEXT,
    file_size_bytes BIGINT,
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_text TEXT,
    processing_error TEXT
);

CREATE TABLE IF NOT EXISTS debrief_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID NOT NULL UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    key_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
    sentiment_rationale TEXT,
    follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_llm_response TEXT,
    model_used TEXT
);

CREATE INDEX IF NOT EXISTS idx_visits_district ON visits(district);
CREATE INDEX IF NOT EXISTS idx_visits_block ON visits(block);
CREATE INDEX IF NOT EXISTS idx_visits_program ON visits(program_area);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(debrief_status);
CREATE INDEX IF NOT EXISTS idx_media_visit ON media_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_debrief_visit ON debrief_summaries(visit_id);
CREATE INDEX IF NOT EXISTS idx_debrief_blockers_gin ON debrief_summaries USING gin(blockers);

INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-media', 'visit-media', false)
ON CONFLICT (id) DO NOTHING;
