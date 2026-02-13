CREATE TABLE IF NOT EXISTS usage_ledger (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT,
  service_id TEXT,
  payment_tx_hash TEXT,
  status TEXT NOT NULL CHECK (
    status IN (
      'VALIDATION_FAILED',
      'SERVICE_NOT_FOUND',
      'SERVICE_INACTIVE',
      'REPLAY_BLOCKED',
      'VERIFICATION_FAILED',
      'EXECUTION_FAILED',
      'EXECUTION_SUCCEEDED',
      'POLICY_BLOCKED'
    )
  ),
  error_code TEXT,
  amount_atomic NUMERIC(78, 0),
  payer_address TEXT,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_ledger_created_at ON usage_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_service_id ON usage_ledger(service_id);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_status ON usage_ledger(status);
