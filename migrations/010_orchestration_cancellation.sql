ALTER TABLE orchestration_runs
  ADD COLUMN IF NOT EXISTS cancel_requested BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orchestration_run_queue
  DROP CONSTRAINT IF EXISTS chk_orchestration_queue_status;

ALTER TABLE orchestration_run_queue
  ADD CONSTRAINT chk_orchestration_queue_status
  CHECK (queue_status IN ('queued', 'running', 'completed', 'failed', 'cancelled'));
