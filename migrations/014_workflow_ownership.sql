ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS owner_id TEXT;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner_id ON workflow_templates(owner_id);
