BEGIN;

CREATE TABLE IF NOT EXISTS platform.rls_registry (
  schema_name text NOT NULL,
  table_name text NOT NULL,
  policy_mode text NOT NULL DEFAULT 'ORGANIZATION_ID'
    CHECK (policy_mode IN ('ORGANIZATION_ID','ORGANIZATION_ROOT','ROLE_VISIBILITY','ROLE_PERMISSION_VISIBILITY','SYSTEM_OR_ORG')),
  PRIMARY KEY (schema_name, table_name)
);

INSERT INTO platform.rls_registry(schema_name, table_name, policy_mode) VALUES
  ('iam','organizations','ORGANIZATION_ROOT'),
  ('iam','memberships','ORGANIZATION_ID'),
  ('iam','membership_roles','ORGANIZATION_ID'),
  ('iam','membership_project_scopes','ORGANIZATION_ID'),
  ('iam','registered_devices','ORGANIZATION_ID'),
  ('iam','roles','ROLE_VISIBILITY'),
  ('iam','role_permissions','ROLE_PERMISSION_VISIBILITY'),
  ('core','projects','ORGANIZATION_ID'),
  ('core','teams','ORGANIZATION_ID'),
  ('core','team_members','ORGANIZATION_ID'),
  ('blueprint','templates','ORGANIZATION_ID'),
  ('blueprint','template_versions','ORGANIZATION_ID'),
  ('blueprint','template_fields','ORGANIZATION_ID'),
  ('ops','deployments','ORGANIZATION_ID'),
  ('ops','assignments','ORGANIZATION_ID'),
  ('field','submission_attempts','ORGANIZATION_ID'),
  ('field','submissions','ORGANIZATION_ID'),
  ('evidence','attachments','ORGANIZATION_ID'),
  ('evidence','upload_sessions','ORGANIZATION_ID'),
  ('evidence','bindings','ORGANIZATION_ID'),
  ('evidence','holds','ORGANIZATION_ID'),
  ('sync','change_log','ORGANIZATION_ID'),
  ('sync','device_cursors','ORGANIZATION_ID'),
  ('sync','sync_events','ORGANIZATION_ID'),
  ('processing','workflow_runs','ORGANIZATION_ID'),
  ('processing','idempotency_records','ORGANIZATION_ID'),
  ('processing','outbox_events','ORGANIZATION_ID'),
  ('processing','consumer_receipts','ORGANIZATION_ID'),
  ('audit','audit_events','ORGANIZATION_ID'),
  ('intel','semantic_compatibility','ORGANIZATION_ID'),
  ('intel','projection_runs','ORGANIZATION_ID'),
  ('intel','projection_facts','ORGANIZATION_ID'),
  ('intel','fact_numeric','ORGANIZATION_ID'),
  ('intel','fact_boolean','ORGANIZATION_ID'),
  ('intel','fact_text','ORGANIZATION_ID'),
  ('intel','fact_date','ORGANIZATION_ID'),
  ('intel','fact_datetime','ORGANIZATION_ID'),
  ('intel','fact_currency','ORGANIZATION_ID'),
  ('intel','fact_geo','ORGANIZATION_ID'),
  ('intel','metric_definitions','SYSTEM_OR_ORG'),
  ('intel','insights','ORGANIZATION_ID')
ON CONFLICT (schema_name, table_name) DO UPDATE SET policy_mode = EXCLUDED.policy_mode;

ALTER TABLE iam.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON iam.organizations;
CREATE POLICY tenant_isolation ON iam.organizations
  USING (id = platform.current_organization_id())
  WITH CHECK (id = platform.current_organization_id());

ALTER TABLE intel.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel.metric_definitions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metric_definition_visibility ON intel.metric_definitions;
CREATE POLICY metric_definition_visibility ON intel.metric_definitions
  USING (organization_id IS NULL OR organization_id = platform.current_organization_id())
  WITH CHECK (organization_id = platform.current_organization_id());

ALTER TABLE iam.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.roles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_visibility ON iam.roles;
CREATE POLICY role_visibility ON iam.roles
  USING (is_system OR organization_id = platform.current_organization_id())
  WITH CHECK (NOT is_system AND organization_id = platform.current_organization_id());

ALTER TABLE iam.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iam.role_permissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permission_visibility ON iam.role_permissions;
CREATE POLICY role_permission_visibility ON iam.role_permissions
  USING (
    EXISTS (
      SELECT 1
      FROM iam.roles r
      WHERE r.id = role_permissions.role_id
        AND (r.is_system OR r.organization_id = platform.current_organization_id())
    )
  );

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schema_name, table_name
    FROM platform.rls_registry
    WHERE policy_mode = 'ORGANIZATION_ID'
    ORDER BY schema_name, table_name
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schema_name, r.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I.%I', r.schema_name, r.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I.%I USING (organization_id = platform.current_organization_id()) WITH CHECK (organization_id = platform.current_organization_id())',
      r.schema_name, r.table_name
    );
  END LOOP;
END
$$;

GRANT SELECT ON platform.rls_registry TO bf_readonly;

COMMIT;
