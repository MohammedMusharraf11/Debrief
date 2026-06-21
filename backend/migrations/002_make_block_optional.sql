ALTER TABLE visits
ALTER COLUMN block DROP NOT NULL;

COMMENT ON COLUMN visits.block IS 'Deprecated. Village is now the primary field location unit for the prototype.';
