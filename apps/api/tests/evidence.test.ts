import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { handle } from '../src/handler';
import type { Db, Queryable } from '../src/db';
import type { EvidenceStorage } from '../src/storage';

const ROOT = join(__dirname, '../../../packages/contracts/evidence');
const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
const uploadSession = ajv.compile(JSON.parse(readFileSync(join(ROOT, 'upload-session.schema.json'), 'utf8')));
const attachmentStatus = ajv.compile(JSON.parse(readFileSync(join(ROOT, 'attachment-status.schema.json'), 'utf8')));

const ORG = '11111111-1111-4111-8111-111111111111';
const MEM = '44444444-4444-4444-8444-444444444444';
const DEV = '55555555-5555-4555-8555-555555555555';
const ASG = '66666666-6666-4666-8666-666666666666';
const PRJ = '88888888-8888-4888-8888-888888888888';
const ATT = '99999999-9999-4999-8999-999999999999';
const SES = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UPL = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const HASH = 'a'.repeat(64);

interface Opts { perms?: string[]; assignee?: string | null; existing?: Record<string, unknown> | null; session?: Record<string, unknown> | null; openSession?: Record<string, unknown> | null }
function fake(o: Opts = {}) {
  const log: { sql: string; params: readonly unknown[] }[] = [];
  const q: Queryable = {
    async query(sql: string, params: readonly unknown[] = []) {
      const s = sql.replace(/\s+/g, ' ');
      if (s.startsWith('SELECT set_config')) return { rows: [] } as never;
      if (s.includes('FROM iam.users')) return { rows: [{ id: 'u' }] } as never;
      if (s.includes('FROM iam.memberships')) return { rows: [{ id: MEM, lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM iam.membership_roles mr')) return { rows: (o.perms ?? ['evidence.capture']).map((permission_key) => ({ permission_key })) } as never;
      if (s.includes('FROM iam.membership_roles WHERE')) return { rows: [{ id: 'r', scope_mode: 'ORG_WIDE' }] } as never;
      if (s.includes('membership_project_scopes')) return { rows: [] } as never;
      if (s.includes('registered_devices')) return { rows: [{ lifecycle_state: 'ACTIVE' }] } as never;
      if (s.includes('FROM ops.assignments')) return { rows: [{ project_id: PRJ, assignee_membership_id: o.assignee === undefined ? MEM : o.assignee }] } as never;
      if (s.includes('FROM evidence.attachments WHERE id')) return { rows: o.existing ? [o.existing] : [] } as never;
      if (s.includes('FROM evidence.upload_sessions WHERE organization_id')) return { rows: o.openSession ? [o.openSession] : [] } as never;
      if (s.includes('FROM evidence.upload_sessions u JOIN')) return { rows: o.session ? [o.session] : [] } as never;
      if (s.startsWith('INSERT INTO evidence.upload_sessions')) { log.push({ sql: s, params }); return { rows: [{ expires_at: '2026-10-27T05:00:00Z' }] } as never; }
      if (s.startsWith('INSERT INTO evidence.attachments')) { log.push({ sql: s, params }); return { rows: [] } as never; }
      if (s.startsWith('UPDATE evidence.')) { log.push({ sql: s, params }); return { rows: [{ verified_at: '2026-10-27T05:01:00Z' }] } as never; }
      throw new Error('unexpected sql: ' + s);
    }
  };
  return { db: { tx: (fn) => fn(q), ping: async () => ({ ok: true }) } as Db, log };
}
function storage(obj: { size: number; sha256: string } | null = { size: 1000, sha256: HASH }): EvidenceStorage {
  return { signUpload: async (key) => ({ url: `https://s.test/sign/${key}?token=t` }), hashObject: async () => obj };
}
const verify = async (t: string) => { if (t !== 'good') throw new Error('bad'); return { sub: 'sb', authenticationStrength: 'PASSWORD' }; };
const H = { authorization: 'Bearer good', 'x-device-id': DEV, 'idempotency-key': 'evid-0001' };
const initBody = (over: Record<string, unknown> = {}) => ({ attachment_id: ATT, organization_id: ORG, assignment_id: ASG, session_id: SES, evidence_type: 'PHOTO', evidence_role: 'ORIGINAL', byte_size: 1000, sha256: HASH, claimed_mime_type: 'image/jpeg', source_kind: 'CAMERA_CAPTURE', upload_protocol_version: '1.0', field_id: 'photos', ...over });
const init = (f: { db: Db }, body: unknown, st: EvidenceStorage | null = storage(), h = H) =>
  handle(new Request(`https://x.test/api/organizations/${ORG}/evidence/uploads`, { method: 'POST', body: JSON.stringify(body), headers: h }), { db: f.db, verify, storage: st ?? undefined });
const fin = (f: { db: Db }, body: unknown = { upload_id: UPL, attachment_id: ATT }, st: EvidenceStorage | null = storage(), h = H) =>
  handle(new Request(`https://x.test/api/organizations/${ORG}/evidence/uploads/${UPL}:finalize`, { method: 'POST', body: JSON.stringify(body), headers: h }), { db: f.db, verify, storage: st ?? undefined });
const sess = (over: Record<string, unknown> = {}) => ({ attachment_id: ATT, state: 'INITIALISED', expected_hash: HASH, expected_byte_size: '1000', project_id: PRJ, storage_key: `${ORG}/${ATT}`, live: true, verified_at: null, ...over });

describe('POST evidence/uploads (initiate)', () => {
  it('records the attachment and session and returns a schema-valid session with a signed URL', async () => {
    const f = fake(); const r = await init(f, initBody());
    expect(r.status).toBe(201); const b = await r.json();
    expect(uploadSession(b), JSON.stringify(uploadSession.errors)).toBe(true);
    expect(b).toMatchObject({ upload_strategy: 'SINGLE_PUT', state: 'INITIALISED', expected_sha256: HASH });
    expect(b.provider_upload_reference).toContain(`${ORG}/${ATT}`);
    expect(f.log.map((l) => l.sql.split(' ').slice(0, 3).join(' '))).toEqual(['INSERT INTO evidence.attachments(id,', 'INSERT INTO evidence.upload_sessions(id,']);
  });
  it('rejects oversize, derivative, bad hash and foreign organisation', async () => {
    expect((await init(fake(), initBody({ byte_size: 26 * 1024 * 1024 }))).status).toBe(413);
    expect((await init(fake(), initBody({ evidence_role: 'DERIVATIVE' }))).status).toBe(400);
    expect((await init(fake(), initBody({ sha256: 'xyz' }))).status).toBe(400);
    expect((await (await init(fake(), initBody({ organization_id: '22222222-2222-4222-8222-222222222222' }))).json()).code).toBe('TENANT_MISMATCH');
  });
  it('needs the permission, an Idempotency-Key, a configured store and an owned assignment', async () => {
    expect((await (await init(fake({ perms: [] }), initBody())).json()).code).toBe('PERMISSION_DENIED');
    expect((await init(fake(), initBody(), storage(), { ...H, 'idempotency-key': '' })).status).toBe(400);
    expect((await init(fake(), initBody(), null)).status).toBe(503);
    expect((await init(fake({ assignee: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }), initBody())).status).toBe(404);
    expect((await init(fake(), initBody(), storage(), { ...H, authorization: '' })).status).toBe(401);
  });
  it('a retry reuses the open session (200) and a different file for the same id conflicts (409)', async () => {
    const same = { content_hash: HASH, byte_size: '1000', assignment_id: ASG, integrity_state: 'PENDING', transfer_state: 'UPLOADING' };
    const f = fake({ existing: same, openSession: { id: UPL, state: 'INITIALISED', expires_at: '2026-10-27T05:00:00Z', live: true } });
    const r = await init(f, initBody()); expect(r.status).toBe(200); expect((await r.json()).upload_id).toBe(UPL); expect(f.log).toHaveLength(0);
    expect((await init(fake({ existing: { ...same, content_hash: 'b'.repeat(64) } }), initBody())).status).toBe(409);
  });
});

describe('POST evidence/uploads/{id}:finalize', () => {
  it('verifies size and hash from the stored bytes and marks the attachment VERIFIED', async () => {
    const f = fake({ session: sess() }); const r = await fin(f);
    expect(r.status).toBe(200); const b = await r.json();
    expect(attachmentStatus(b), JSON.stringify(attachmentStatus.errors)).toBe(true);
    expect(b).toMatchObject({ lifecycle_state: 'UPLOADED', integrity_state: 'VERIFIED', binding_state: 'UNBOUND' });
    expect(f.log.some((l) => l.sql.includes("integrity_state = 'VERIFIED'"))).toBe(true);
  });
  it('quarantines a file whose hash differs, even if the phone claims otherwise', async () => {
    const f = fake({ session: sess() }); const r = await fin(f, { upload_id: UPL, attachment_id: ATT, client_observed_sha256: HASH }, storage({ size: 1000, sha256: 'b'.repeat(64) }));
    expect(r.status).toBe(422); expect((await r.json()).code).toBe('HASH_MISMATCH');
    expect(f.log.some((l) => l.sql.includes("integrity_state = 'QUARANTINED'"))).toBe(true);
    expect(f.log.some((l) => l.sql.includes("integrity_state = 'VERIFIED'"))).toBe(false);
  });
  it('quarantines a file of the wrong size', async () => {
    const r = await fin(fake({ session: sess() }), undefined, storage({ size: 999, sha256: HASH }));
    expect((await r.json()).code).toBe('SIZE_MISMATCH');
  });
  it('asks the phone to retry when the file has not arrived, and refuses expired or mismatched sessions', async () => {
    const miss = await fin(fake({ session: sess() }), undefined, storage(null));
    expect(miss.status).toBe(409); expect(await miss.json()).toMatchObject({ code: 'OBJECT_MISSING', retryable: true });
    expect((await (await fin(fake({ session: sess({ live: false }) }))).json()).code).toBe('UPLOAD_SESSION_EXPIRED');
    expect((await (await fin(fake({ session: sess() }), { upload_id: UPL, attachment_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' })).json()).code).toBe('SESSION_MISMATCH');
    expect((await fin(fake({ session: null }))).status).toBe(404);
  });
  it('finalizing twice returns the same verified result without touching storage again', async () => {
    let reads = 0; const st: EvidenceStorage = { signUpload: async () => ({ url: 'u' }), hashObject: async () => { reads++; return null; } };
    const r = await fin(fake({ session: sess({ state: 'COMPLETED', verified_at: '2026-10-27T05:01:00Z' }) }), undefined, st);
    expect(r.status).toBe(200); expect((await r.json()).integrity_state).toBe('VERIFIED'); expect(reads).toBe(0);
  });
  it('needs the permission', async () => {
    expect((await (await fin(fake({ perms: [] }))).json()).code).toBe('PERMISSION_DENIED');
  });
});
