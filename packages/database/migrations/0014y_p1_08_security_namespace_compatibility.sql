BEGIN;
-- Batch 6B live-gate compatibility bridge.
-- 0015 was already sealed and references security.current_organization_id().
-- Preserve that migration checksum while routing the legacy symbol to the
-- canonical platform.current_organization_id() defined in 0001.
CREATE SCHEMA IF NOT EXISTS security;

CREATE OR REPLACE FUNCTION security.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT platform.current_organization_id();
$$;

COMMENT ON FUNCTION security.current_organization_id() IS
'Compatibility alias for sealed migration 0015. Canonical tenant context helper is platform.current_organization_id().';
COMMIT;
