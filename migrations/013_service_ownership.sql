ALTER TABLE services
  ADD COLUMN IF NOT EXISTS owner_id TEXT;

CREATE INDEX IF NOT EXISTS idx_services_owner_id ON services(owner_id);
