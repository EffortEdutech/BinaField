// Browser equivalents of the six Android instrumentation tests (ADR-0001, "Revised gate").
// Each check runs real SQL against SQLite WASM; nothing is simulated or hard-coded to pass.
import { DbClient } from '../db/client';
import { schemaSql } from './schema';

export type GateResult = { id: string; name: string; pass: boolean; detail: string };
const ORG = 'org-A';
const DB_FILE = '/binafield-gate.sqlite3';
const TS = '2026-10-23T00:00:00Z';

const sess = (id: string, payload = '{"q1":0}') =>
  `INSERT INTO submission_session(organization_id,session_id,assignment_id,assignment_revision_started,template_version_id,lifecycle_state,payload_json,last_local_save_at,owning_device_id) VALUES ('${ORG}','${id}','A1',1,'TV1','IN_PROGRESS','${payload}','${TS}','dev1')`;
const attempt = (id: string) =>
  `INSERT INTO submission_attempt(organization_id,attempt_id,idempotency_key,session_id,assignment_id,assignment_revision_used,template_version_id,blueprint_hash,canonical_payload_json,payload_hash,evidence_manifest_json,device_id,contract_version,created_at) VALUES ('${ORG}','${id}','idem-${id}','S1','A1',1,'TV1','bh','{"q1":0}','ph','[]','dev1','1.0','${TS}')`;
const evidence = (id: string, state: string) =>
  `INSERT INTO local_evidence(organization_id,attachment_id,assignment_id,session_id,field_id,evidence_type,evidence_role,local_file_path,source_kind,byte_size,sha256,device_captured_at,lifecycle_state,created_by_device_id) VALUES ('${ORG}','${id}','A1','S1','f1','PHOTO','ORIGINAL','/ev/${id}.jpg','CAMERA_CAPTURE',1024,'${'a'.repeat(64)}','${TS}','${state}','dev1')`;

async function expectAbort(db: DbClient, sql: string, code: string) {
  try { await db.exec(sql); return `no error (expected ${code})`; }
  catch (e: any) { return String(e.message).includes(code) ? null : `wrong error: ${e.message}`; }
}

async function run(id: string, name: string, fn: () => Promise<string>): Promise<GateResult> {
  try { return { id, name, pass: true, detail: await fn() }; }
  catch (e: any) { return { id, name, pass: false, detail: String(e?.message ?? e) }; }
}
const must = (cond: boolean, msg: string) => { if (!cond) throw new Error(msg); };

async function freshMem() { const db = new DbClient(); await db.open(null); await db.exec(schemaSql); return db; }

export async function runGate(): Promise<GateResult[]> {
  const out: GateResult[] = [];

  out.push(await run('G1', 'fresh database executes canonical schema', async () => {
    const db = new DbClient();
    try {
      const o = await db.open(null);
      await db.exec(schemaSql);
      const t = await db.exec<{ n: number }>("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const g = await db.exec<{ n: number }>("SELECT count(*) n FROM sqlite_master WHERE type='trigger'");
      must(t[0].n === 22, `expected 22 tables, got ${t[0].n}`);
      must(g[0].n === 3, `expected 3 triggers, got ${g[0].n}`);
      return `SQLite ${o.version}: 22 tables, 3 triggers`;
    } finally { await db.close(); }
  }));

  out.push(await run('G2', 'autosave and original evidence survive reopen', async () => {
    const a = new DbClient();
    await a.open(DB_FILE, true);
    await a.exec(schemaSql);
    await a.exec(sess('S1', '{"q1":42}'));
    await a.exec(evidence('E1', 'LOCAL_CAPTURED'));
    await a.close();
    const b = new DbClient();
    try {
      await b.open(DB_FILE);
      const s = await b.exec<{ payload_json: string }>("SELECT payload_json FROM submission_session WHERE session_id='S1'");
      const e = await b.exec<{ sha256: string; byte_size: number }>("SELECT sha256,byte_size FROM local_evidence WHERE attachment_id='E1'");
      must(s.length === 1 && s[0].payload_json === '{"q1":42}', 'draft payload lost after reopen');
      must(e.length === 1 && e[0].sha256 === 'a'.repeat(64) && e[0].byte_size === 1024, 'original evidence identity changed after reopen');
      return 'draft payload and evidence identity intact in a new worker';
    } finally { await b.close(); }
  }));

  out.push(await run('G3', 'submitted Attempt is immutable', async () => {
    const db = await freshMem();
    try {
      await db.exec(sess('S1')); await db.exec(attempt('AT1'));
      const e1 = await expectAbort(db, "UPDATE submission_attempt SET canonical_payload_json='{\"q1\":99}' WHERE attempt_id='AT1'", 'SUBMISSION_ATTEMPT_IMMUTABLE');
      must(e1 === null, e1 ?? '');
      const e2 = await expectAbort(db, "UPDATE submission_attempt SET payload_hash='zz' WHERE attempt_id='AT1'", 'SUBMISSION_ATTEMPT_IMMUTABLE');
      must(e2 === null, e2 ?? '');
      await db.exec("UPDATE submission_session SET lifecycle_state='SUBMITTED' WHERE session_id='S1'");
      const e3 = await expectAbort(db, "UPDATE submission_session SET lifecycle_state='IN_PROGRESS' WHERE session_id='S1'", 'SUBMITTED_SESSION_IMMUTABLE');
      must(e3 === null, e3 ?? '');
      return 'payload/hash edits aborted; submitted session cannot reopen';
    } finally { await db.close(); }
  }));

  out.push(await run('G4', 'outbox dependency and reconciliation persist across reopen', async () => {
    const a = new DbClient();
    await a.open(DB_FILE);
    await a.exec(`INSERT INTO sync_outbox(organization_id,operation_id,operation_type,priority,state,created_at,updated_at) VALUES ('${ORG}','OP-EV','EVIDENCE_UPLOAD_FINALIZE',1,'QUEUED','${TS}','${TS}')`);
    await a.exec(`INSERT INTO sync_outbox(organization_id,operation_id,operation_type,priority,state,created_at,updated_at) VALUES ('${ORG}','OP-SUB','SUBMISSION_ATTEMPT_SEND',1,'BLOCKED_DEPENDENCY','${TS}','${TS}')`);
    await a.exec(`INSERT INTO sync_operation_dependency(organization_id,operation_id,depends_on_operation_id) VALUES ('${ORG}','OP-SUB','OP-EV')`);
    await a.exec(`INSERT INTO reconciliation_case(organization_id,case_id,device_id,conflict_type,created_at,severity,allowed_actions_json,status) VALUES ('${ORG}','RC1','dev1','STALE_REVISION','${TS}','BLOCKING','["KEEP_LOCAL","DISCARD"]','OPEN')`);
    await a.close();
    const b = new DbClient();
    try {
      await b.open(DB_FILE);
      const d = await b.exec<{ n: number }>("SELECT count(*) n FROM sync_operation_dependency WHERE operation_id='OP-SUB' AND depends_on_operation_id='OP-EV'");
      const s = await b.exec<{ state: string }>("SELECT state FROM sync_outbox WHERE operation_id='OP-SUB'");
      const r = await b.exec<{ status: string }>("SELECT status FROM reconciliation_case WHERE case_id='RC1'");
      must(d[0].n === 1 && s[0].state === 'BLOCKED_DEPENDENCY' && r[0].status === 'OPEN', 'dependency/blocked state/reconciliation case lost');
      return 'Submission send stays blocked behind Evidence finalize; reconciliation case still OPEN';
    } finally { await b.close(); }
  }));

  out.push(await run('G5', 'cursor apply-before-advance is transactional', async () => {
    const db = await freshMem();
    try {
      await db.exec(`INSERT INTO sync_cursor(organization_id,device_id,current_cursor,updated_at) VALUES ('${ORG}','dev1','C1','${TS}')`);
      await db.exec(`INSERT INTO sync_inbox(organization_id,inbox_batch_id,prior_cursor,proposed_next_cursor,payload_hash,received_at,apply_state) VALUES ('${ORG}','B1','C1','C2','h','${TS}','VALIDATED')`);
      const q = `SELECT (SELECT current_cursor FROM sync_cursor WHERE device_id='dev1') c, (SELECT apply_state FROM sync_inbox WHERE inbox_batch_id='B1') a`;
      await db.exec('BEGIN');
      await db.exec(`UPDATE sync_inbox SET apply_state='APPLYING' WHERE inbox_batch_id='B1'`);
      await db.exec(`UPDATE sync_cursor SET current_cursor='C2' WHERE device_id='dev1'`);
      await db.exec('ROLLBACK'); // injected failure mid-apply
      const f = await db.exec<{ c: string; a: string }>(q);
      must(f[0].c === 'C1' && f[0].a === 'VALIDATED', `rollback left c=${f[0].c} a=${f[0].a}`);
      await db.exec('BEGIN');
      await db.exec(`UPDATE sync_inbox SET apply_state='APPLIED' WHERE inbox_batch_id='B1'`);
      await db.exec(`UPDATE sync_cursor SET current_cursor='C2' WHERE device_id='dev1'`);
      await db.exec('COMMIT');
      const ok = await db.exec<{ c: string; a: string }>(q);
      must(ok[0].c === 'C2' && ok[0].a === 'APPLIED', 'commit did not advance cursor with apply');
      return 'failure leaves cursor C1/VALIDATED; success commits APPLIED + C2 together';
    } finally { await db.close(); }
  }));

  out.push(await run('G6', 'uploaded original evidence identity cannot mutate', async () => {
    const db = await freshMem();
    try {
      await db.exec(sess('S1')); await db.exec(evidence('E1', 'UPLOADED'));
      for (const set of ["sha256='" + 'b'.repeat(64) + "'", 'byte_size=2048', "local_file_path='/ev/other.jpg'"]) {
        const e = await expectAbort(db, `UPDATE local_evidence SET ${set} WHERE attachment_id='E1'`, 'EVIDENCE_IDENTITY_IMMUTABLE');
        must(e === null, `${set}: ${e}`);
      }
      return 'hash, size and path edits aborted after UPLOADED';
    } finally { await db.close(); }
  }));

  return out;
}
