import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const migrationDir = path.join(root, 'packages/database/migrations');
const requiredMigrations = [
  '0001_platform_extensions_and_schemas.sql',
  '0002_iam_and_security_registry.sql',
  '0003_core_projects_teams.sql',
  '0004_blueprint_templates.sql',
  '0005_ops_deployments_assignments.sql',
  '0006_field_submission_model.sql',
  '0007_evidence_storage_model.sql',
  '0008_sync_transport_model.sql',
  '0009_processing_audit_outbox.sql',
  '0010_intelligence_projection_model.sql',
  '0011_runtime_roles_and_grants.sql',
  '0012_rls_tenant_isolation.sql',
  '0013_seed_permission_and_role_registry.sql'
];

const failures = [];
const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();
check('migration-file-set', JSON.stringify(migrations) === JSON.stringify(requiredMigrations), migrations.join(','));

for (const file of migrations) {
  const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
  check(`${file}:transaction-start`, /^\s*BEGIN;/i.test(sql));
  check(`${file}:transaction-end`, /COMMIT;\s*$/i.test(sql));
  check(`${file}:no-embedded-secret`, !/(password\s*=|secret\s*=|api[_-]?key\s*=)/i.test(sql));
}

const allSql = migrations.map(f => fs.readFileSync(path.join(migrationDir, f), 'utf8')).join('\n');
check('postgres-16-postgis-baseline', /CREATE EXTENSION IF NOT EXISTS postgis;/i.test(allSql));
check('template-version-immutability-trigger', /guard_published_version_immutability/i.test(allSql));
check('submission-attempt-immutability-trigger', /prevent_submission_attempt_mutation/i.test(allSql));
check('tenant-context-function', /current_organization_id\(\)/i.test(allSql));
check('force-rls-present', /FORCE ROW LEVEL SECURITY/i.test(allSql));
check('runtime-role-app-nobypassrls', /CREATE ROLE app_runtime[\s\S]*?NOBYPASSRLS;/i.test(allSql));
check('runtime-role-worker-nobypassrls', /CREATE ROLE worker_runtime[\s\S]*?NOBYPASSRLS;/i.test(allSql));
check('runtime-role-readonly-nobypassrls', /CREATE ROLE bf_readonly[\s\S]*?NOBYPASSRLS;/i.test(allSql));
check('no-runtime-bypassrls-grant', !/ALTER ROLE\s+(app_runtime|worker_runtime|bf_readonly)[^;]*BYPASSRLS/i.test(allSql));
check('submission-jsonb-not-evidence-bytes', /evidence_manifest_json jsonb/i.test(allSql) && /CREATE TABLE evidence\.attachments/i.test(allSql));
check('analytical-typed-store', /CREATE TABLE intel\.fact_numeric/i.test(allSql) && /CREATE TABLE intel\.fact_boolean/i.test(allSql));
check('global-system-metrics-policy', /metric_definition_visibility/i.test(allSql));

const rlsSql = fs.readFileSync(path.join(migrationDir, '0012_rls_tenant_isolation.sql'), 'utf8');
const requiredRlsTables = [
  'iam.memberships','iam.membership_roles','iam.membership_project_scopes','iam.registered_devices',
  'core.projects','core.teams','core.team_members',
  'blueprint.templates','blueprint.template_versions','blueprint.template_fields',
  'ops.deployments','ops.assignments','field.submission_attempts','field.submissions',
  'evidence.attachments','evidence.upload_sessions','evidence.bindings','evidence.holds',
  'sync.change_log','sync.device_cursors','sync.sync_events',
  'processing.workflow_runs','processing.idempotency_records','processing.outbox_events','processing.consumer_receipts',
  'audit.audit_events','intel.semantic_compatibility','intel.projection_runs','intel.projection_facts','intel.insights'
];
for (const full of requiredRlsTables) {
  const [schema, table] = full.split('.');
  check(`rls-registry:${full}`, rlsSql.includes(`('${schema}','${table}'`));
}

const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
check('ci-runs-static-verifier', workflow.includes('node tools/verify-batch1.mjs'));
check('ci-runs-db-migrations', workflow.includes('bash scripts/db/migrate.sh'));
check('ci-runs-db-verification', workflow.includes('bash scripts/db/verify.sh'));
check('ci-postgis-service', workflow.includes('postgis/postgis:16-3.4'));

const result = {
  batch: 'BF-P1-Implementation-B01',
  generated_at: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS_STATIC_ONLY',
  checks,
  failures,
  note: 'Static verification does not replace PostgreSQL execution, RLS runtime tests, migration-from-zero proof, or CI evidence.'
};

const outDir = path.join(root, 'artefacts/phase1/manifests');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'batch01-static-verification.json'), JSON.stringify(result, null, 2) + '\n');

const digest = crypto.createHash('sha256').update(JSON.stringify(result.checks)).digest('hex');
console.log(`Batch 1 static verification: ${result.status}`);
console.log(`checks=${checks.length} failures=${failures.length} digest=${digest}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
