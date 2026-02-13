CREATE TABLE IF NOT EXISTS service_policies (
  id BIGSERIAL PRIMARY KEY,
  service_id TEXT NOT NULL UNIQUE REFERENCES services(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  max_calls_per_minute INTEGER,
  max_spend_per_hour_atomic NUMERIC(78, 0),
  max_spend_per_day_atomic NUMERIC(78, 0),
  allowlist_consumer_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  blocklist_consumer_ids TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (max_calls_per_minute IS NULL OR max_calls_per_minute >= 0),
  CHECK (max_spend_per_hour_atomic IS NULL OR max_spend_per_hour_atomic >= 0),
  CHECK (max_spend_per_day_atomic IS NULL OR max_spend_per_day_atomic >= 0)
);

CREATE INDEX IF NOT EXISTS idx_service_policies_service_id ON service_policies(service_id);
CREATE INDEX IF NOT EXISTS idx_service_policies_active ON service_policies(active);

