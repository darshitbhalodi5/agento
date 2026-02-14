ALTER TABLE orchestration_runs
  ALTER COLUMN started_at DROP NOT NULL,
  ALTER COLUMN completed_at DROP NOT NULL;

ALTER TABLE orchestration_runs
  ADD COLUMN IF NOT EXISTS run_status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE orchestration_runs
SET run_status = CASE
  WHEN ok THEN 'completed'
  ELSE 'failed'
END
WHERE run_status IS NULL OR run_status = 'completed';

CREATE TABLE IF NOT EXISTS orchestration_run_queue (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES orchestration_runs(run_id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  queue_status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_orchestration_queue_status CHECK (queue_status IN ('queued', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_orchestration_run_queue_status_available
  ON orchestration_run_queue(queue_status, available_at, created_at);
