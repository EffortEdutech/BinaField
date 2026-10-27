import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import { payloadHashOf } from '../src/submission';
import type { Db, Queryable } from '../src/db';

const ROOT = join(__dirname, '../../../packages/contracts');
const load = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
// Register the whole sync protocol folder so relative $refs between its schemas resolve.
for (const f of ['delta-entry', 'delta-page', 'submission-attempt', 'cursor']) ajv.addSchema(load(`sync/protocol.v1/${f}.schema.json`));
ajv.addSchema(load('evidence/manifest-entry.schema.json'), 'https://schemas.binafield.io/evidence/manifest-entry.schema.json');
const deltaPage = ajv.getSchema('https://schemas.binafield.io/sync/1.0/delta-page.schema.json')!;
const attemptSchema = ajv.getSchema('https://schemas.binafield.io/sync/1.0/submission-attempt.schema.json')!;
const apiDelta = ajv.compile(load('api/field/delta.schema.json'));
const problem = ajv.compile(load('api/common/problem.schema.json'));

const ORG = '11111111-1111-4111-8111-111111111111';
const MEM = '44444444-4444-4444-8444-444444444444';
const DEV = '55555555-5555-4555-8555-555555555555';
const ASG = '66666666-6666-4666-8666-666666666666';
const TPL = '77777777-7777-4777-8777-777777777777';
const PRJ = '88888888-8888-4888-8888-888888888888';
const verify = async () => ({ sub: 'sb', authenticationStrength: 'PASSWORD' });

function fake(perms: string[]) {
  const q: Queryable = {
    async query(sql: string) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) return { rows: [] } as never;
      if (s.includes('FROM iam.users')) return { rows: [{ id: 'u' }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: [{ id: MEM, lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: perms.map((permission_key) => ({ permission_key })) } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r', scope_mode: 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: [{ lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM sync.change_log')) return { rows: [
        { sequence_id: '1', entity_type: 'assignment', entity_id: ASG, entity_revision: '1', change_type: 'UPSERT', occurred_at: '2026-10-27T00:00:00Z', payload_json: { assignment_id: ASG, assignment_revision: 1, template_version_id: TPL, blueprint_hash: 'h', project_id: PRJ, payload: { lifecycle_state: 'ASSIGNED' } } },
        { sequence_id: '2', entity_type: 'assignment', entity_id: ASG, entity_revision: '2', change_type: 'TOMBSTONE', occurred_at: '2026-10-27T00:01:00Z', payload_json: { assignment_id: ASG, project_id: PRJ, tombstone_type: 'CANCELLED' } }] } as never;
      if (s.includes('FROM ops.assignments')) return { rows: [{ project_id: PRJ, template_version_id: TPL, revision: '1', assignee_membership_id: MEM, lifecycle_state: 'ASSIGNED' }] } as never;
      if (s.includes('AND idempotency_key') || s.includes('AND id = $2') || s.includes('organization_id = $2 AND id = $2')) return { rows: [] } as never;
      if (s.includes('FROM field.submission_attempts WHERE organization_id = $1 AND id = $2')) return { rows: [] } as never;
      if (s.startsWith('INSERT INTO field.submission_attempts')) return { rows: [{ received_at: '2026-10-27T00:00:00Z' }] } as never;
      throw new Error('unexpected sql: ' + s);
    }
  };
  return { tx: (fn) => fn(q), ping: async () => ({ ok: true }) } as Db;
}
const H = { authorization: 'Bearer t', 'x-device-id': DEV };

describe('contract: responses match the frozen schemas', () => {
  it('field delta page matches the sync delta-page schema and each entry the API delta entry schema', async () => {
    const r = await handle(new Request(`https://x.test/api/organizations/${ORG}/field/delta`, { headers: H }), { db: fake(['assignment.read']), verify });
    const body = await r.json();
    expect(deltaPage(body), JSON.stringify(deltaPage.errors)).toBe(true);
    expect(apiDelta({ entries: body.entries, next_cursor: body.next_cursor }), JSON.stringify(apiDelta.errors)).toBe(true);
    expect(body.entries.map((e: { change_type: string }) => e.change_type)).toEqual(['UPSERT', 'TOMBSTONE']);
  });
  it('error responses are valid problem+json', async () => {
    for (const [req, deps] of [
      [new Request(`https://x.test/api/organizations/${ORG}/field/delta`), { db: fake([]), verify }],
      [new Request(`https://x.test/api/organizations/${ORG}/field/delta`, { headers: H }), { db: fake([]), verify }],
      [new Request(`https://x.test/api/organizations/${ORG}/field/delta?cursor=bad`, { headers: H }), { db: fake(['assignment.read']), verify }]
    ] as const) {
      const r = await handle(req, deps); const b = await r.json();
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.headers.get('content-type')).toContain('application/problem+json');
      expect(problem(b), JSON.stringify(problem.errors)).toBe(true);
    }
  });
});

describe('contract: a phone-side attempt per the sync schema is accepted', () => {
  it('validates against the schema and is stored (201) by the endpoint', async () => {
    const payload = { answers: { q1: 'ok' } };
    const attempt = {
      contract_version: '1.0', created_at: '2026-10-27T00:00:00Z', attempt_id: '99999999-9999-4999-8999-999999999999', idempotency_key: 'idem-contract-1',
      session_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', organization_id: ORG, assignment_id: ASG, assignment_revision_used: 1, template_version_id: TPL,
      blueprint_hash: 'b'.repeat(64), payload, payload_hash: payloadHashOf(payload), evidence_manifest: [], device_id: DEV, membership_id: MEM,
      client_submitted_at: '2026-10-27T00:00:00Z', timezone: 'Asia/Kuala_Lumpur'
    };
    expect(attemptSchema(attempt), JSON.stringify(attemptSchema.errors)).toBe(true);
    const r = await handle(new Request(`https://x.test/api/organizations/${ORG}/field/submission-attempts`, {
      method: 'POST', body: JSON.stringify(attempt), headers: { ...H, 'idempotency-key': attempt.idempotency_key } }), { db: fake(['submission.create']), verify });
    expect(r.status).toBe(201);
  });
});
