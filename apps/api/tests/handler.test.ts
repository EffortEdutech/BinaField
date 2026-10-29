import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import type { Db, Queryable } from '../src/db';

const ORG = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const USER = '33333333-3333-4333-8333-333333333333';
const MEM = '44444444-4444-4444-8444-444444444444';
const DEV = '55555555-5555-4555-8555-555555555555';

// A tiny fake database that answers the principal queries from a fixed fixture and records tenant settings.
function fakeDb(opts: { memberState?: string; deviceState?: string | null; knownUser?: boolean } = {}) {
  const settings: unknown[][] = [];
  const q: Queryable = {
    async query(sql: string, params: readonly unknown[] = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) { settings.push([...params]); return { rows: [] } as never; }
      if (s.includes('FROM iam.users')) return { rows: opts.knownUser === false ? [] : [{ id: USER }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: params[1] === ORG ? [{ id: MEM, lifecycle_state: opts.memberState ?? 'ACTIVE' }] : [] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: [{ permission_key: 'assignment.read' }, { permission_key: 'submission.create' }] } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r1', scope_mode: 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: opts.deviceState ? [{ lifecycle_state: opts.deviceState }] : [] } as never;
      throw new Error('unexpected sql: ' + s);
    }
  };
  const db: Db = { tx: (fn) => fn(q), ping: async () => ({ ok: true }) };
  return { db, settings };
}
const verify = async (t: string) => { if (t !== 'good') throw new Error('bad'); return { sub: 'sb-user-1', authenticationStrength: 'PASSWORD' }; };
const call = (path: string, init: RequestInit & { db?: Db } = {}) => {
  const { db = fakeDb().db, ...rest } = init;
  return handle(new Request('https://x.test' + path, rest), { db, verify });
};
const auth = { authorization: 'Bearer good' };

describe('api handler', () => {
  it('health reports ok and degraded', async () => {
    expect((await call('/api/health')).status).toBe(200);
    const down: Db = { tx: async () => { throw new Error('x'); }, ping: async () => ({ ok: false, reason: '28P01' }) };
    const bad = await call('/api/health', { db: down });
    expect(bad.status).toBe(503);
    expect(await bad.json()).toMatchObject({ database: false, reason: '28P01' });
  });
  it('rejects missing and invalid tokens with 401 problem+json', async () => {
    for (const headers of [{} as Record<string, string>, { authorization: 'Bearer nope' }]) {
      const r = await call(`/api/organizations/${ORG}/me`, { headers });
      expect(r.status).toBe(401);
      const b = await r.json();
      expect(b.code).toBe('AUTHENTICATION_REQUIRED');
      expect(b.correlation_id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
  it('protects Admin Studio routes before touching tenant data', async () => {
    const paths = [
      `/api/organizations/${ORG}/templates`,
      `/api/organizations/${ORG}/assignments`,
      `/api/organizations/${ORG}/submissions`,
      `/api/organizations/${ORG}/memberships`,
      `/api/organizations/${ORG}/roles`,
      `/api/organizations/${ORG}/audit-events`,
      `/api/organizations/${ORG}/projects`,
    ];
    for (const path of paths) {
      const r = await call(path);
      expect(r.status).toBe(401);
      expect((await r.json()).code).toBe('AUTHENTICATION_REQUIRED');
    }
  });
  it('rejects invalid administration mutation payloads before database mutation', async () => {
    const invalidMembership = await call(`/api/organizations/${ORG}/memberships`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'invite-test-001' }, body: JSON.stringify({ email: 'bad' }) });
    expect(invalidMembership.status).toBe(403);
    const invalidRole = await call(`/api/organizations/${ORG}/memberships/${MEM}/roles`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json', 'idempotency-key': 'role-test-001' }, body: JSON.stringify({ role_id: 'bad', scope_mode: 'PROJECT_RESTRICTED', project_ids: [] }) });
    expect(invalidRole.status).toBe(400);
  });
  it('rejects a malformed organisation id', async () => {
    expect((await call('/api/organizations/not-a-uuid/me', { headers: auth })).status).toBe(400);
  });
  it('returns the principal and sets the tenant context from the path', async () => {
    const f = fakeDb({ deviceState: 'ACTIVE' });
    const r = await call(`/api/organizations/${ORG}/me`, { headers: { ...auth, 'x-device-id': DEV }, db: f.db });
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b).toMatchObject({ user_id: USER, membership_id: MEM, organization_id: ORG, device_state: 'ACTIVE', permissions: ['assignment.read', 'submission.create'] });
    expect(f.settings[0]![0]).toBe(ORG);          // first context: organisation only
    expect(f.settings.at(-1)![2]).toBe(MEM);      // later context: membership id added
  });
  it('conceals another organisation and unknown users as 404', async () => {
    expect((await call(`/api/organizations/${OTHER}/me`, { headers: auth })).status).toBe(404);
    expect((await call(`/api/organizations/${ORG}/me`, { headers: auth, db: fakeDb({ knownUser: false }).db })).status).toBe(404);
  });
  it('denies revoked and suspended memberships', async () => {
    const rev = await call(`/api/organizations/${ORG}/me`, { headers: auth, db: fakeDb({ memberState: 'REVOKED' }).db });
    expect(rev.status).toBe(403); expect((await rev.json()).code).toBe('MEMBERSHIP_REVOKED');
    const sus = await call(`/api/organizations/${ORG}/me`, { headers: auth, db: fakeDb({ memberState: 'SUSPENDED' }).db });
    expect((await sus.json()).code).toBe('MEMBERSHIP_INACTIVE');
  });
  it('treats an unregistered device as NOT_REGISTERED', async () => {
    const r = await call(`/api/organizations/${ORG}/me`, { headers: { ...auth, 'x-device-id': DEV }, db: fakeDb({ deviceState: null }).db });
    expect((await r.json()).device_state).toBe('NOT_REGISTERED');
  });
  it('maps database failure to a retryable 503', async () => {
    const broken: Db = { tx: async () => { throw new Error('boom'); }, ping: async () => ({ ok: true }) };
    const r = await call(`/api/organizations/${ORG}/me`, { headers: auth, db: broken });
    expect(r.status).toBe(503); expect((await r.json()).retryable).toBe(true);
  });
  it('returns 404 for unknown routes', async () => {
    expect((await call('/api/nope')).status).toBe(404);
  });
});
