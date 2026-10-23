BEGIN;
-- Compatibility bridge added by Batch 5 after static review of Batch 4.
-- It preserves the released 0015 checksum while extending the original 0012 DB registry
-- to the richer metadata shape that 0015 already writes.
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS table_schema text;
UPDATE platform.rls_registry SET table_schema=schema_name WHERE table_schema IS NULL;
ALTER TABLE platform.rls_registry ALTER COLUMN table_schema SET NOT NULL;
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS tenant_owned boolean NOT NULL DEFAULT true;
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS organization_column text DEFAULT 'organization_id';
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS rls_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS rls_forced boolean NOT NULL DEFAULT true;
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS owning_module text;
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS runtime_roles text[] NOT NULL DEFAULT ARRAY['app_runtime','worker_runtime']::text[];
ALTER TABLE platform.rls_registry ADD COLUMN IF NOT EXISTS notes text;
CREATE UNIQUE INDEX IF NOT EXISTS rls_registry_table_schema_table_name_uq ON platform.rls_registry(table_schema,table_name);
CREATE OR REPLACE FUNCTION platform.sync_rls_registry_schema_names() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.schema_name IS NULL THEN NEW.schema_name:=NEW.table_schema; END IF;
  IF NEW.table_schema IS NULL THEN NEW.table_schema:=NEW.schema_name; END IF;
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS trg_sync_rls_registry_schema_names ON platform.rls_registry;
CREATE TRIGGER trg_sync_rls_registry_schema_names BEFORE INSERT OR UPDATE ON platform.rls_registry FOR EACH ROW EXECUTE FUNCTION platform.sync_rls_registry_schema_names();
COMMIT;
