import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import type { Db, Queryable } from '../src/db';

const ORG = '11111111-1111-4111-8111-111111111111';
const DEV = '55555555-5555-4555-8555-555555555555';
function fake(o: { perms?: string[]; device?: string | null; max?: number; stored?: number } = {}) {
  const writes: unknown[][] = [];
  const q: Queryable = {
    async query(sql: string, params: readonly unknown[] = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) return { rows: [] } as never;
      if (s.includes('FROM iam.users')) return { rows: [{ id: 'u' }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: [{ id: 'm', lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: (o.perms ?? ['assignment.execute']).map((permission_key) => ({ permission_key })) } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r', scope_mode: 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: o.device === null ? [] : [{ lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('max(sequence_id)')) return { rows: [{ max: String(o.max ?? 10) }] } as never;
      if (s.includes('INSERT INTO sync.device_cursors')) { writes.push([...params]); return { rows: [{ cursor_sequence: String(Math.max(o.stored ?? 0, Number(params[2]))) }] } as never; }
      throw new Error('unexpected sql: ' + s);
    }
  };
  return { db: { tx: (fn) => fn(q), ping: async () => ({ ok: true }) } as Db, writes };
}
const verify = async (t: string) => { if (t !== 'good') throw new Error('bad'); return { sub: 'sb', authenticationStrength: 'PASSWORD' }; };
const post = (db: Db, body: unknown, h: Record<string, string> = {}) => handle(new Request(`https://x.test/api/organizations/${ORG}/field/acknowledgements`, {
  method: 'POST', body: JSON.stringify(body), headers: { authorization: 'Bearer good', 'x-device-id': DEV, 'idempotency-key': 'ack-00001', ...h } }), { db, verify });

describe('POST field/acknowledgements', () => {
  it('moves the device cursor forward', async () => {
    const f = fake(); const r = await post(f.db, { cursor: 'c1:7' });
    expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ acknowledged_cursor: 'c1:7', advanced: true });
    expect(f.writes[0]).toEqual([ORG, DEV, 7]);
  });
  it('accepts the cursor inside payload and never moves backward', async () => {
    const b = await (await post(fake({ stored: 9 }).db, { payload: { cursor: 'c1:4' } })).json();
    expect(b).toMatchObject({ acknowledged_cursor: 'c1:9', advanced: false });
  });
  it('refuses a cursor the server never published', async () => {
    const r = await post(fake({ max: 5 }).db, { cursor: 'c1:6' });
    expect(r.status).toBe(422); expect((await r.json()).code).toBe('CURSOR_AHEAD_OF_SERVER');
  });
  it('validates input and access', async () => {
    expect((await post(fake().db, { cursor: 'nope' })).status).toBe(400);
    expect((await post(fake().db, { cursor: 'c1:1' }, { 'idempotency-key': '' })).status).toBe(400);
    expect((await (await post(fake({ perms: [] }).db, { cursor: 'c1:1' })).json()).code).toBe('PERMISSION_DENIED');
    expect((await (await post(fake({ device: null }).db, { cursor: 'c1:1' })).json()).code).toBe('DEVICE_NOT_REGISTERED');
    expect((await post(fake().db, { cursor: 'c1:1' }, { authorization: '' })).status).toBe(401);
  });
});
