ALTER TABLE visits
ADD COLUMN IF NOT EXISTS postal_code TEXT;

CREATE INDEX IF NOT EXISTS idx_visits_postal_code ON visits(postal_code);
