CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_wallet TEXT NOT NULL,
  token_address TEXT NOT NULL,
  price_atomic NUMERIC(78, 0) NOT NULL,
  memo_prefix TEXT NOT NULL DEFAULT 'api',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_requests (
  id UUID PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL,
  payment_tx_hash TEXT NOT NULL,
  payer_address TEXT,
  amount_atomic NUMERIC(78, 0),
  memo_raw TEXT,
  verification_status TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  error_code TEXT,
  response_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_service_request UNIQUE (service_id, request_id),
  CONSTRAINT uq_payment_tx_hash UNIQUE (payment_tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_verification_status ON api_requests(verification_status);
