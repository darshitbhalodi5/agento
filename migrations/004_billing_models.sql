CREATE TABLE IF NOT EXISTS service_billing_models (
  service_id TEXT PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('fixed', 'tiered', 'hybrid')),
  fixed_price_atomic NUMERIC(78, 0),
  free_quota INTEGER NOT NULL DEFAULT 0,
  tier_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_billing_models_active
  ON service_billing_models(active);
