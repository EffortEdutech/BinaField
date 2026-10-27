import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import type { Db, Queryable } from '../src/db';

const ORG = '11111111-1111-4111-8111-111111111111';
const MEM = '44444444-4444-4444-8444-444444444444';
const DEV = '55555555-5555-4555-8555-555555555555';
const PRJ = '88888888-8888-4888-8888-888888888888';
const OTHER_PRJ = '99999999-9999-4999-8999-999999999999';

function fake(o: { scope?: 'ORG_WIDE' | 'PROJECT_RESTRICTED'; perms?: string[]; device?: string | null; rows?: number[] } = {}) {
  const seen: { sql: string; params: readonly unknown[] }[] = [];
  const q: Queryable = {
    async query(sql: string, params: readonly unknown[] = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) return { rows: [] } as never;
      if (s.includes('FROM iam.users')) return { rows: [{ id: 'u' }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: [{ id: MEM, lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: (o.perms ?? ['assignment.read']).map((permission_key) => ({ permission_key })) } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r1', scope_mode: o.scope ?? 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: o.device === null ? [] : [{ lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM sync.change_log')) {
        seen.push({ sql: s, params });
        const all = (o.rows ?? [5, 6]).map((n) => ({ sequence_id: String(n), entity_type: 'assignment', entity_id: 'e1', entity_revision: '2', change_type: n === 6 ? 'TOMBSTONE' : 'UPSERT', occurred_at: '2026-10-27T00:00:00Z',
          payload_json: { assignment_id: 'e1', assignment_revision: 2, template_version_id: 't', blueprint_hash: 'h', project_id: n === 6 && o.scope ? OTHER_PRJ : PRJ, tombstone_type: 'CANCELLED', payload: { lifecycle_state: 'ASSIGNED' } } }));
        return { rows: all.slice(0, Number(params[3])) } as never;
      }
      throw new Error('unexpected sql: ' + s);
    }
  };
  return { db: { tx: (fn) => fn(q), ping: async () => ({ ok: true }) } as Db, seen };
}
const verify = async (t: string) => { if (t !== 'good') throw new Error('bad'); return { sub: 'sb', authenticationStrength: 'PASSWORD' }; };
const get = (db: Db, qs = '', h: Record<string, string> = {}) => handle(new Request(`https://x.test/api/organizations/${ORG}/field/delta${qs}`, { headers: { authorization: 'Bearer good', 'x-device-id': DEV, ...h } }), { db, verify });

describe('GET field/delta', () => {
  it('returns this person\'s changes after the cursor and a next cursor', async () => {
    const f = fake(); const r = await get(f.db, '?cursor=c1:4');
    expect(r.status).toBe(200); const b = await r.json();
    expect(b).toMatchObject({ sync_protocol_version: '1.0', prior_cursor: 'c1:4', next_cursor: 'c1:6' });
    expect(b.entries.map((e: { change_type: string }) => e.change_type)).toEqual(['UPSERT', 'TOMBSTONE']);
    expect(b.entries[0].payload).toMatchObject({ assignment_id: 'e1', blueprint_hash: 'h' });
    expect(b.entries[1].payload).toMatchObject({ tombstone_type: 'CANCELLED', authoritative_revision: 2 });
    expect(f.seen[0]!.params).toEqual([ORG, 4, MEM, 101]);
  });
  it('starts from zero without a cursor and keeps the cursor when nothing is new', async () => {
    const f = fake({ rows: [] }); const b = await (await get(f.db)).json();
    expect(b).toMatchObject({ prior_cursor: '', next_cursor: 'c1:0', entries: [] });
    expect((await (await get(fake({ rows: [] }).db, '?cursor=c1:9')).json()).next_cursor).toBe('c1:9');
  });
  it('pages: limit 1 returns one entry and a cursor that continues after it', async () => {
    const b = await (await get(fake().db, '?limit=1')).json();
    expect(b).toMatchObject({ next_cursor: 'c1:5' }); expect(b.entries).toHaveLength(1);
  });
  it('rejects bad cursor and bad limit', async () => {
    expect((await (await get(fake().db, '?cursor=zzz')).json()).code).toBe('INVALID_CURSOR');
    expect((await (await get(fake().db, '?limit=0')).json()).code).toBe('INVALID_LIMIT');
    expect((await get(fake().db, '?limit=501')).status).toBe(400);
  });
  it('requires a registered device and the assignment.read permission', async () => {
    expect((await (await get(fake({ device: null }).db)).json()).code).toBe('DEVICE_NOT_REGISTERED');
    expect((await (await get(fake({ perms: [] }).db)).json()).code).toBe('PERMISSION_DENIED');
    expect((await get(fake().db, '', { authorization: '' })).status).toBe(401);
  });
  it('drops entries from projects outside a restricted scope', async () => {
    const b = await (await get(fake({ scope: 'PROJECT_RESTRICTED' }).db)).json();
    expect(b.entries).toHaveLength(0);   // scope has no projects, so nothing is visible
  });
});
