import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import { canonicalJson, payloadHashOf } from '../src/submission';
import type { Db, Queryable } from '../src/db';

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const MEM = '44444444-4444-4444-8444-444444444444';
const DEV = '55555555-5555-4555-8555-555555555555';
const ASG = '66666666-6666-4666-8666-666666666666';
const TPL = '77777777-7777-4777-8777-777777777777';
const PRJ = '88888888-8888-4888-8888-888888888888';
const ATT = '99999999-9999-4999-8999-999999999999';
const SES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function fake(o: { perms?: string[]; device?: string | null; assignee?: string | null; tpl?: string; rev?: number; existing?: { id: string; payload_hash: string } | null; scope?: 'ORG_WIDE' | 'PROJECT_RESTRICTED' } = {}) {
  const inserts: unknown[][] = [];
  const q: Queryable = {
    async query(sql: string, params: readonly unknown[] = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) return { rows: [] } as never;
      if (s.includes('FROM iam.users')) return { rows: [{ id: USER }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: [{ id: MEM, lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: (o.perms ?? ['submission.create', 'submission.acceptance.read']).map((permission_key) => ({ permission_key })) } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r1', scope_mode: o.scope ?? 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: o.device === null ? [] : [{ lifecycle_state: o.device ?? 'ACTIVE' }] } as never;
      if (s.includes('FROM ops.assignments')) return { rows: [{ project_id: PRJ, template_version_id: o.tpl ?? TPL, revision: String(o.rev ?? 3), assignee_membership_id: o.assignee === undefined ? MEM : o.assignee, lifecycle_state: 'ASSIGNED' }] } as never;
      if (s.includes('AND idempotency_key')) return { rows: o.existing ? [{ ...o.existing, received_at: 't0' }] : [] } as never;
      if (s.includes('FROM field.submission_attempts WHERE organization_id = $1 AND id = $2')) return { rows: [] } as never;
      if (s.startsWith('INSERT INTO field.submission_attempts')) { inserts.push([...params]); return { rows: [{ received_at: 't1' }] } as never; }
      throw new Error('unexpected sql: ' + s);
    }
  };
  const db: Db = { tx: (fn) => fn(q), ping: async () => ({ ok: true }) };
  return { db, inserts };
}
const verify = async (t: string) => { if (t !== 'good') throw new Error('bad'); return { sub: 'sb', authenticationStrength: 'PASSWORD' }; };
const payload = { b: 2, a: { z: 1, y: [3, { k: 'é' }] } };
const body = (over: Record<string, unknown> = {}) => ({
  attempt_id: ATT, session_id: SES, assignment_id: ASG, assignment_revision_used: 3, template_version_id: TPL, blueprint_hash: 'b'.repeat(64),
  payload, payload_hash: payloadHashOf(payload), evidence_manifest: [], device_id: DEV, client_submitted_at: '2026-10-27T01:00:00Z', ...over
});
const post = (db: Db, b: unknown, h: Record<string, string> = {}) => handle(new Request(`https://x.test/api/organizations/${ORG}/field/submission-attempts`, {
  method: 'POST', body: JSON.stringify(b), headers: { authorization: 'Bearer good', 'x-device-id': DEV, 'idempotency-key': 'idem-0001', 'content-type': 'application/json', ...h } }), { db, verify });

describe('canonical hash', () => {
  it('sorts keys recursively without whitespace', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }] })).toBe('{"a":[{"c":2,"d":1}],"b":1}');
    expect(payloadHashOf({ a: 1, b: 2 })).toBe(payloadHashOf({ b: 2, a: 1 }));
  });
  it('matches the Python field-client rule (sha256 of sort_keys, compact, non-ASCII kept)', () => {
    // python: hashlib.sha256(json.dumps({"a":"é","b":[1,2]},sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
    expect(canonicalJson({ b: [1, 2], a: 'é' })).toBe('{"a":"é","b":[1,2]}');
  });
});

describe('POST submission-attempts', () => {
  it('stores a valid attempt and returns 201', async () => {
    const f = fake(); const r = await post(f.db, body());
    expect(r.status).toBe(201); expect(await r.json()).toMatchObject({ attempt_id: ATT, status: 'RECEIVED', replayed: false });
    expect(f.inserts).toHaveLength(1); expect(f.inserts[0]![2]).toBe(PRJ);
  });
  it('rejects a payload whose hash the server cannot reproduce', async () => {
    const f = fake(); const r = await post(f.db, body({ payload_hash: 'c'.repeat(64) }));
    expect(r.status).toBe(422); expect((await r.json()).code).toBe('PAYLOAD_HASH_MISMATCH'); expect(f.inserts).toHaveLength(0);
  });
  it('rejects a tampered payload even when the hash is well formed', async () => {
    const r = await post(fake().db, body({ payload: { ...payload, extra: 1 } }));
    expect((await r.json()).code).toBe('PAYLOAD_HASH_MISMATCH');
  });
  it('requires an Idempotency-Key and a valid body', async () => {
    expect((await post(fake().db, body(), { 'idempotency-key': '' })).status).toBe(400);
    expect((await post(fake().db, body({ attempt_id: 'x' }))).status).toBe(400);
  });
  it('requires the device header to equal the body device', async () => {
    expect((await post(fake().db, body(), { 'x-device-id': 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })).status).toBe(400);
  });
  it('denies missing permission, unregistered and suspended devices', async () => {
    expect((await (await post(fake({ perms: ['assignment.read'] }).db, body())).json()).code).toBe('PERMISSION_DENIED');
    expect((await (await post(fake({ device: null }).db, body())).json()).code).toBe('DEVICE_NOT_REGISTERED');
    expect((await (await post(fake({ device: 'SUSPENDED' }).db, body())).json()).code).toBe('DEVICE_SUSPENDED');
  });
  it('conceals an assignment that belongs to someone else', async () => {
    expect((await post(fake({ assignee: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }).db, body())).status).toBe(404);
  });
  it('denies a project outside the restricted scope', async () => {
    expect((await (await post(fake({ scope: 'PROJECT_RESTRICTED' }).db, body())).json()).code).toBe('SCOPE_DENIED');
  });
  it('rejects template mismatch and a revision newer than the server', async () => {
    expect((await (await post(fake({ tpl: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }).db, body())).json()).code).toBe('TEMPLATE_VERSION_MISMATCH');
    expect((await (await post(fake({ rev: 2 }).db, body())).json()).code).toBe('ASSIGNMENT_REVISION_UNKNOWN');
  });
  it('replays an identical retry and conflicts on a different request', async () => {
    const same = fake({ existing: { id: ATT, payload_hash: payloadHashOf(payload) } });
    const r = await post(same.db, body()); expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ replayed: true }); expect(same.inserts).toHaveLength(0);
    const other = fake({ existing: { id: ATT, payload_hash: 'f'.repeat(64) } });
    expect((await post(other.db, body())).status).toBe(409);
  });
  it('requires authentication', async () => {
    expect((await post(fake().db, body(), { authorization: '' })).status).toBe(401);
  });
});
