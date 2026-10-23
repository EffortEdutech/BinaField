BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bf_owner') THEN
    CREATE ROLE bf_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bf_migrator') THEN
    CREATE ROLE bf_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worker_runtime') THEN
    CREATE ROLE worker_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bf_readonly') THEN
    CREATE ROLE bf_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

REVOKE ALL ON SCHEMA public FROM PUBLIC;

GRANT USAGE ON SCHEMA platform, iam, core, blueprint, ops, field, evidence, sync, processing, audit, intel
  TO app_runtime, worker_runtime, bf_readonly;

GRANT SELECT ON iam.permissions, iam.roles, iam.role_permissions TO app_runtime, worker_runtime, bf_readonly;

GRANT SELECT, UPDATE ON iam.organizations TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON iam.memberships, iam.membership_roles, iam.membership_project_scopes, iam.registered_devices
  TO app_runtime;
GRANT SELECT ON iam.users TO app_runtime, worker_runtime, bf_readonly;
GRANT SELECT, INSERT, UPDATE ON iam.users TO app_runtime;

GRANT SELECT, INSERT, UPDATE ON core.projects, core.teams, core.team_members TO app_runtime;
GRANT SELECT ON core.projects, core.teams, core.team_members TO worker_runtime, bf_readonly;

GRANT SELECT, INSERT, UPDATE ON blueprint.templates, blueprint.template_versions, blueprint.template_fields TO app_runtime;
GRANT SELECT ON blueprint.templates, blueprint.template_versions, blueprint.template_fields TO worker_runtime, bf_readonly;

GRANT SELECT, INSERT, UPDATE ON ops.deployments, ops.assignments TO app_runtime;
GRANT SELECT ON ops.deployments, ops.assignments TO worker_runtime, bf_readonly;

GRANT SELECT, INSERT ON field.submission_attempts TO app_runtime;
GRANT SELECT, INSERT, UPDATE ON field.submissions TO app_runtime, worker_runtime;
GRANT SELECT ON field.submission_attempts, field.submissions TO worker_runtime, bf_readonly;

GRANT SELECT, INSERT, UPDATE ON evidence.attachments, evidence.upload_sessions, evidence.bindings, evidence.holds
  TO app_runtime, worker_runtime;
GRANT SELECT ON evidence.attachments, evidence.upload_sessions, evidence.bindings, evidence.holds TO bf_readonly;

GRANT SELECT, INSERT, UPDATE ON sync.device_cursors, sync.sync_events TO app_runtime, worker_runtime;
GRANT SELECT, INSERT ON sync.change_log TO app_runtime, worker_runtime;
GRANT SELECT ON sync.change_log, sync.device_cursors, sync.sync_events TO bf_readonly;

GRANT SELECT, INSERT, UPDATE ON processing.workflow_runs, processing.idempotency_records, processing.outbox_events, processing.consumer_receipts
  TO app_runtime, worker_runtime;
GRANT SELECT ON processing.workflow_runs, processing.idempotency_records, processing.outbox_events, processing.consumer_receipts TO bf_readonly;

GRANT SELECT, INSERT ON audit.audit_events TO app_runtime, worker_runtime;
GRANT SELECT ON audit.audit_events TO bf_readonly;

GRANT SELECT ON intel.semantic_registry TO app_runtime, worker_runtime, bf_readonly;
GRANT SELECT, INSERT, UPDATE ON intel.semantic_compatibility, intel.projection_runs, intel.projection_facts,
  intel.fact_numeric, intel.fact_boolean, intel.fact_text, intel.fact_date, intel.fact_datetime, intel.fact_currency,
  intel.fact_geo, intel.metric_definitions, intel.insights TO worker_runtime;
GRANT SELECT ON intel.semantic_compatibility, intel.projection_runs, intel.projection_facts,
  intel.fact_numeric, intel.fact_boolean, intel.fact_text, intel.fact_date, intel.fact_datetime, intel.fact_currency,
  intel.fact_geo, intel.metric_definitions, intel.insights TO app_runtime, bf_readonly;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA sync TO app_runtime, worker_runtime;

REVOKE CREATE ON SCHEMA platform, iam, core, blueprint, ops, field, evidence, sync, processing, audit, intel
  FROM app_runtime, worker_runtime, bf_readonly;

COMMIT;
