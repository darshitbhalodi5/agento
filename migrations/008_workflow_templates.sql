CREATE TABLE IF NOT EXISTS workflow_templates (
  workflow_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  step_graph_json JSONB NOT NULL,
  default_policies_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON workflow_templates(active);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_updated_at ON workflow_templates(updated_at DESC);
