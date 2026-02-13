CREATE TABLE IF NOT EXISTS orchestration_runs (
  run_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orchestration_step_outcomes (
  run_id TEXT NOT NULL REFERENCES orchestration_runs(run_id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL,
  chosen_service_id TEXT,
  attempts_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_orchestration_step_outcomes PRIMARY KEY (run_id, step_id)
);

CREATE TABLE IF NOT EXISTS orchestration_step_attempts (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES orchestration_runs(run_id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  attempt_index INTEGER NOT NULL,
  service_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  payment_tx_hash TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  status_code INTEGER NOT NULL,
  error_code TEXT,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestration_runs_created_at ON orchestration_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orchestration_step_attempts_run_id ON orchestration_step_attempts(run_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_step_attempts_step_id ON orchestration_step_attempts(step_id);
