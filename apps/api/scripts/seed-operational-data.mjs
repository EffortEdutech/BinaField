import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';

const { Pool } = pg;
const args = new Map(process.argv.slice(2).filter((value) => value.startsWith('--')).map((value) => {
  const [key, ...rest] = value.replace(/^--/, '').split('=');
  return [key, rest.join('=') || 'true'];
}));
const org = args.get('organization') || process.env.npm_config_organization;
const environment = args.get('environment') || process.env.npm_config_environment;
const write = args.get('write') === 'true';
const expected = org && environment ? `${org}:${environment}` : '';

if (!org || !environment || !/^[0-9a-f-]{36}$/i.test(org)) {
  console.error('Usage: node scripts/seed-operational-data.mjs --organization=<UUID> --environment=<pilot|test> [--write --confirm=<ORG:ENV>]');
  process.exit(2);
}
if (!['pilot', 'test'].includes(environment)) {
  console.error('Refusing environment. Allowed values: pilot, test. Production seeding is not supported by this command.');
  process.exit(2);
}
if (write && args.get('confirm') !== expected) {
  console.error(`Refusing write. Add --confirm=${expected} exactly.`);
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required and is never read from a committed file.');
  process.exit(2);
}
try {
  const connectionUrl = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(connectionUrl.protocol) || connectionUrl.hostname === '*****REDACTED*****') throw new Error();
} catch {
  console.error('DATABASE_URL must be a real postgresql:// or postgres:// connection string in the current shell. The redacted value shown in logs cannot be used.');
  process.exit(2);
}

const stableId = (key) => {
  const hex = crypto.createHash('sha256').update(`${org}:${environment}:${key}`).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + (Number.parseInt(hex[16], 16) % 4)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20)}`;
};
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });
const client = await pool.connect();
const plan = {
  project_code: `BF-${environment.toUpperCase()}`,
  template_key: `binafield-${environment}-site-check`,
  deployment_id: stableId('deployment:site-check'),
  assignment_id: stableId('assignment:site-check'),
};

try {
  await client.query('BEGIN');
  await client.query('SET LOCAL ROLE app_runtime');
  // Match the API runtime's transaction-local tenant context before any RLS-protected read.
  await client.query('SELECT set_config(\'app.organization_id\', $1, true)', [org]);
  const membership = await client.query("SELECT id FROM iam.memberships WHERE organization_id=$1 AND lifecycle_state='ACTIVE' ORDER BY id LIMIT 1", [org]);
  if (!membership.rows[0]) throw new Error('No ACTIVE membership exists for the target organisation');
  const memberId = membership.rows[0].id;
  await client.query('SELECT set_config(\'app.membership_id\', $1, true)', [memberId]);
  const existing = await client.query(`
    SELECT
      (SELECT count(*) FROM core.projects WHERE organization_id=$1 AND project_code=$2) AS projects,
      (SELECT count(*) FROM blueprint.templates WHERE organization_id=$1 AND template_key=$3) AS templates,
      (SELECT count(*) FROM ops.deployments WHERE organization_id=$1 AND id=$4) AS deployments,
      (SELECT count(*) FROM ops.assignments WHERE organization_id=$1 AND id=$5) AS assignments`, [org, plan.project_code, plan.template_key, plan.deployment_id, plan.assignment_id]);
  console.log(JSON.stringify({ mode: write ? 'WRITE' : 'DRY_RUN', organization_id: org, environment, plan, existing: existing.rows[0] }, null, 2));
  if (!write) { await client.query('ROLLBACK'); process.exit(0); }

  const project = await client.query(`INSERT INTO core.projects (id, organization_id, project_code, name, lifecycle_state)
    VALUES ($1::uuid,$2::uuid,$3::text,$4::text,'ACTIVE') ON CONFLICT (organization_id, project_code) DO UPDATE SET name=EXCLUDED.name, lifecycle_state='ACTIVE', updated_at=now() RETURNING id`, [stableId('project:site-check'), org, plan.project_code, `BinaField ${environment} site checks`]);
  const template = await client.query(`INSERT INTO blueprint.templates (id, organization_id, template_key, name, lifecycle_state, created_by_membership_id)
    VALUES ($1::uuid,$2::uuid,$3::text,$4::text,'ACTIVE',$5::uuid) ON CONFLICT (organization_id, template_key) DO UPDATE SET name=EXCLUDED.name, lifecycle_state='ACTIVE', updated_at=now() RETURNING id`, [stableId('template:site-check'), org, plan.template_key, `BinaField ${environment} site check`, memberId]);
  const blueprint = { schema: 'bf-blueprint/1.0', title: 'BinaField site check', fields: [{ id: 'status', type: 'select', label: 'Site status', options: ['OK', 'ATTENTION', 'FAIL'], required: true }, { id: 'notes', type: 'text', label: 'Notes', required: false }] };
  const hash = crypto.createHash('sha256').update(JSON.stringify(blueprint)).digest('hex');
  const version = await client.query(`INSERT INTO blueprint.template_versions (id, organization_id, template_id, version_no, lifecycle_state, schema_version, component_registry_version, blueprint_json, blueprint_hash, published_at, created_by_membership_id)
    VALUES ($1::uuid,$2::uuid,$3::uuid,1,'PUBLISHED','1.0','1.0',$4::jsonb,$5::text,now(),$6::uuid) ON CONFLICT (organization_id, template_id, version_no) DO UPDATE SET id=blueprint.template_versions.id RETURNING id`, [stableId('version:site-check'), org, template.rows[0].id, JSON.stringify(blueprint), hash, memberId]);
  await client.query(`INSERT INTO ops.deployments (id, organization_id, project_id, template_version_id, name, lifecycle_state, effective_from, created_by_membership_id)
    VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,'ACTIVE',now(),$6::uuid) ON CONFLICT (organization_id,id) DO UPDATE SET name=EXCLUDED.name, lifecycle_state='ACTIVE', updated_at=now()`, [plan.deployment_id, org, project.rows[0].id, version.rows[0].id, `BinaField ${environment} site-check deployment`, memberId]);
  await client.query(`INSERT INTO ops.assignments (id, organization_id, project_id, deployment_id, template_version_id, assignee_membership_id, operational_subject_ref, lifecycle_state, issued_at)
    VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7::jsonb,'ASSIGNED',now()) ON CONFLICT (organization_id,id) DO UPDATE SET operational_subject_ref=EXCLUDED.operational_subject_ref, lifecycle_state='ASSIGNED', updated_at=now()`, [plan.assignment_id, org, project.rows[0].id, plan.deployment_id, version.rows[0].id, memberId, JSON.stringify({ label: `${environment} seeded site check`, seed_key: 'site-check' })]);
  await client.query(`INSERT INTO audit.audit_events (id, organization_id, actor_type, actor_id, action_key, target_type, target_id, result, metadata_json, correlation_id)
    VALUES ($1,$2,'MEMBERSHIP',$3,'seed.operational_data','organization',$2,'SUCCEEDED',$4::jsonb,$5)`, [crypto.randomUUID(), org, memberId, JSON.stringify({ environment, seed_key: 'site-check', mode: 'idempotent' }), crypto.randomUUID()]);
  await client.query('COMMIT');
  console.log(JSON.stringify({ status: 'SEEDED', organization_id: org, environment, project_id: project.rows[0].id, template_id: template.rows[0].id, version_id: version.rows[0].id, deployment_id: plan.deployment_id, assignment_id: plan.assignment_id }, null, 2));
} catch (error) {
  await client.query('ROLLBACK');
  console.error(`Seed failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
