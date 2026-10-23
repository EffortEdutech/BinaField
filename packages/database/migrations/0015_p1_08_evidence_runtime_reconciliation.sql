BEGIN;
-- Forward-only reconciliation to the final P1-08 state vocabulary.
ALTER TABLE evidence.upload_sessions DROP CONSTRAINT IF EXISTS upload_sessions_state_check;
UPDATE evidence.upload_sessions SET state='UPLOAD_COMPLETE' WHERE state='COMPLETED';
ALTER TABLE evidence.upload_sessions ADD COLUMN IF NOT EXISTS upload_strategy text NOT NULL DEFAULT 'SINGLE_PUT';
ALTER TABLE evidence.upload_sessions ADD COLUMN IF NOT EXISTS finalized_at timestamptz;
ALTER TABLE evidence.upload_sessions ADD CONSTRAINT upload_sessions_strategy_check CHECK (upload_strategy IN ('SINGLE_PUT','MULTIPART'));
ALTER TABLE evidence.upload_sessions ADD CONSTRAINT upload_sessions_state_check CHECK (state IN ('INITIALISED','UPLOADING','UPLOAD_COMPLETE','VERIFYING','VERIFIED','FAILED','EXPIRED','ABORTED'));
UPDATE evidence.attachments SET capture_source='SIGNATURE_RENDER' WHERE capture_source='SIGNATURE_SURFACE';
ALTER TABLE evidence.attachments DROP CONSTRAINT IF EXISTS attachments_capture_source_check;
ALTER TABLE evidence.attachments ADD CONSTRAINT attachments_capture_source_check CHECK (capture_source IS NULL OR capture_source IN ('CAMERA_CAPTURE','FILE_IMPORT','SIGNATURE_RENDER','SCANNER_CAPTURE','SYSTEM_DERIVATIVE'));
ALTER TABLE evidence.attachments ADD COLUMN IF NOT EXISTS storage_provider text;
ALTER TABLE evidence.attachments ADD COLUMN IF NOT EXISTS quarantine_reason text;
CREATE TABLE evidence.upload_parts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  upload_session_id uuid NOT NULL,
  part_number integer NOT NULL CHECK(part_number>0),
  byte_size bigint,
  provider_etag text,
  checksum text,
  state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','UPLOADING','UPLOADED','FAILED')),
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,upload_session_id,part_number),
  FOREIGN KEY(organization_id,upload_session_id) REFERENCES evidence.upload_sessions(organization_id,id) ON DELETE CASCADE
);
ALTER TABLE evidence.upload_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.upload_parts FORCE ROW LEVEL SECURITY;
CREATE POLICY upload_parts_tenant_select ON evidence.upload_parts FOR SELECT USING (organization_id = security.current_organization_id());
CREATE POLICY upload_parts_tenant_insert ON evidence.upload_parts FOR INSERT WITH CHECK (organization_id = security.current_organization_id());
CREATE POLICY upload_parts_tenant_update ON evidence.upload_parts FOR UPDATE USING (organization_id = security.current_organization_id()) WITH CHECK (organization_id = security.current_organization_id());
CREATE POLICY upload_parts_tenant_delete ON evidence.upload_parts FOR DELETE USING (organization_id = security.current_organization_id());
GRANT SELECT,INSERT,UPDATE,DELETE ON evidence.upload_parts TO app_runtime, worker_runtime;
INSERT INTO platform.rls_registry(table_schema,table_name,tenant_owned,organization_column,rls_enabled,rls_forced,owning_module,runtime_roles,notes)
VALUES('evidence','upload_parts',true,'organization_id',true,true,'evidence',ARRAY['app_runtime','worker_runtime'],'P1-08 multipart evidence upload parts')
ON CONFLICT (table_schema,table_name) DO UPDATE SET rls_enabled=excluded.rls_enabled, rls_forced=excluded.rls_forced, notes=excluded.notes;
COMMIT;
