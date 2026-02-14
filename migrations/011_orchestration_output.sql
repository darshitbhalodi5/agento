ALTER TABLE orchestration_runs
  ADD COLUMN IF NOT EXISTS run_output_json JSONB;
