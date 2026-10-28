import { api } from './api';
import type { Settings } from './config';
import { files } from '../spikes/fileClient';
import { now, q, tx, type Tx } from './store';

export type OpType = 'EVIDENCE_UPLOAD_INIT' | 'EVIDENCE_UPLOAD_PART' | 'EVIDENCE_UPLOAD_FINALIZE' | 'SUBMISSION_ATTEMPT_SEND' | 'SYNC_ACK';
export interface NewOp { id?: string; type: OpType; entityType: string; entityId: string; payload: unknown; idempotencyKey: string; priority?: number; dependsOn?: string[] }
interface Op { operation_id: string; operation_type: OpType; entity_type: string; entity_id: string; idempotency_key: string; payload_ref: string; attempt_count: number; terminal_outcome_ref: string | null }

const PRIORITY: Record<OpType, number> = { SYNC_ACK: 0, EVIDENCE_UPLOAD_INIT: 1, EVIDENCE_UPLOAD_PART: 1, EVIDENCE_UPLOAD_FINALIZE: 1, SUBMISSION_ATTEMPT_SEND: 2 };

export async function enqueueIn(t: Tx, org: string, op: NewOp): Promise<string> {
  const id = op.id ?? crypto.randomUUID();
  const dup = await t.exec('SELECT operation_id FROM sync_outbox WHERE organization_id=? AND operation_type=? AND idempotency_key=?', [org, op.type, op.idempotencyKey]);
  if (dup.length) return dup[0]!.operation_id;   // the same intent is never queued twice
  await t.exec('INSERT INTO sync_outbox(organization_id,operation_id,operation_type,entity_type,entity_id,idempotency_key,payload_ref,priority,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [org, id, op.type, op.entityType, op.entityId, op.idempotencyKey, JSON.stringify(op.payload), op.priority ?? PRIORITY[op.type], 'QUEUED', now(), now()]);
  for (const d of op.dependsOn ?? []) await t.exec('INSERT INTO sync_operation_dependency(organization_id,operation_id,depends_on_operation_id) VALUES (?,?,?)', [org, id, d]);
  return id;
}
export const enqueue = (op: NewOp, set: Settings) => tx((t) => enqueueIn(t, set.organizationId, op));

const set_ = (id: string, org: string, state: string, err: string | null = null, outcome: string | null = null, retryInMs: number | null = null) =>
  q(`UPDATE sync_outbox SET state=?, last_error_code=?, terminal_outcome_ref=COALESCE(?,terminal_outcome_ref), attempt_count=attempt_count+?, next_attempt_at=?, updated_at=? WHERE organization_id=? AND operation_id=?`,
    [state, err, outcome, state === 'RETRY_WAIT' ? 1 : 0, retryInMs === null ? null : new Date(Date.now() + retryInMs).toISOString(), now(), org, id]);
const backoff = (attempts: number) => Math.min(60_000, 2000 * 2 ** attempts);

type Outcome = { done: true; outcome?: string } | { retry: string; offline?: boolean } | { fail: string };

async function evidenceRow(org: string, attachmentId: string) {
  return (await q<any>('SELECT * FROM local_evidence WHERE organization_id=? AND attachment_id=?', [org, attachmentId]))[0];
}
async function initBody(set: Settings, ev: any) {
  const s = (await q<any>('SELECT assignment_id FROM submission_session WHERE organization_id=? AND session_id=?', [set.organizationId, ev.session_id]))[0];
  return { attachment_id: ev.attachment_id, organization_id: set.organizationId, assignment_id: s.assignment_id, session_id: ev.session_id, field_id: ev.field_id, evidence_type: ev.evidence_type, evidence_role: ev.evidence_role,
    byte_size: ev.byte_size, sha256: ev.sha256, claimed_mime_type: ev.claimed_mime_type ?? 'application/octet-stream', source_kind: ev.source_kind, upload_protocol_version: '1.0' };
}
/** Opens (or reopens) the upload session. Safe to repeat: the server reuses an open session for the same attachment. */
async function initUpload(set: Settings, ev: any, key: string): Promise<Outcome & { session?: { upload_id: string; url: string } }> {
  const r = await api(set, 'POST', '/evidence/uploads', { body: await initBody(set, ev), idempotencyKey: key });
  if (r.networkError) return { retry: 'OFFLINE', offline: true };
  if (r.status === 200 || r.status === 201) return { done: true, session: { upload_id: r.body.upload_id, url: r.body.provider_upload_reference } };
  if (r.status >= 500 || r.status === 429 || r.status === 401) return { retry: r.body?.code ?? `HTTP_${r.status}` };
  return { fail: r.body?.code ?? `HTTP_${r.status}` };
}
const fileName = (attachmentId: string) => `ev-${attachmentId}`;

async function run(set: Settings, op: Op): Promise<Outcome> {
  const org = set.organizationId, p = JSON.parse(op.payload_ref);
  if (op.operation_type === 'SYNC_ACK') {
    const r = await api(set, 'POST', '/field/acknowledgements', { body: { cursor: p.cursor }, idempotencyKey: op.idempotency_key });
    if (r.networkError) return { retry: 'OFFLINE', offline: true };
    if (r.status === 200) return { done: true };
    if (r.status >= 500 || r.status === 429 || r.status === 401) return { retry: r.body?.code ?? `HTTP_${r.status}` };
    return { fail: r.body?.code ?? `HTTP_${r.status}` };
  }
  if (op.operation_type === 'EVIDENCE_UPLOAD_INIT') {
    const ev = await evidenceRow(org, p.attachmentId);
    await q("UPDATE local_evidence SET lifecycle_state='UPLOADING' WHERE organization_id=? AND attachment_id=? AND lifecycle_state IN ('QUEUED_FOR_UPLOAD','UPLOADING')", [org, p.attachmentId]);
    const r = await initUpload(set, ev, op.idempotency_key);
    if ('session' in r && r.session) { await q('UPDATE local_evidence SET upload_id=? WHERE organization_id=? AND attachment_id=?', [r.session.upload_id, org, p.attachmentId]); return { done: true, outcome: JSON.stringify(r.session) }; }
    return r;
  }
  if (op.operation_type === 'EVIDENCE_UPLOAD_PART') {
    const ev = await evidenceRow(org, p.attachmentId);
    const initOp = (await q<any>("SELECT operation_id, idempotency_key, terminal_outcome_ref FROM sync_outbox WHERE organization_id=? AND operation_type='EVIDENCE_UPLOAD_INIT' AND entity_id=?", [org, p.attachmentId]))[0];
    let session = JSON.parse(initOp.terminal_outcome_ref);
    const bytes = (await files.read(fileName(p.attachmentId))).bytes;
    const put = async (url: string) => { try { const r = await fetch(url, { method: 'PUT', body: bytes, headers: { 'content-type': ev.claimed_mime_type ?? 'application/octet-stream' } }); return r.status; } catch { return 0; } };
    let st = await put(session.url);
    if (st === 400 || st === 401 || st === 403 || st === 404) {   // the signed link lapsed: ask for a fresh one and try once more
      const again = await initUpload(set, ev, initOp.idempotency_key);
      if ('session' in again && again.session) { session = again.session; await q('UPDATE sync_outbox SET terminal_outcome_ref=? WHERE organization_id=? AND operation_id=?', [JSON.stringify(session), org, initOp.operation_id]); await q('UPDATE local_evidence SET upload_id=? WHERE organization_id=? AND attachment_id=?', [session.upload_id, org, p.attachmentId]); st = await put(session.url); }
      else return again;
    }
    if (st === 0) return { retry: 'OFFLINE', offline: true };
    if (st >= 200 && st < 300) return { done: true };
    return st >= 500 || st === 429 ? { retry: `STORAGE_HTTP_${st}` } : { fail: `STORAGE_HTTP_${st}` };
  }
  if (op.operation_type === 'EVIDENCE_UPLOAD_FINALIZE') {
    const ev = await evidenceRow(org, p.attachmentId);
    const r = await api(set, 'POST', `/evidence/uploads/${ev.upload_id}:finalize`, { body: { upload_id: ev.upload_id, attachment_id: p.attachmentId }, idempotencyKey: op.idempotency_key });
    if (r.networkError) return { retry: 'OFFLINE', offline: true };
    if (r.status === 200) { await q("UPDATE local_evidence SET lifecycle_state='UPLOADED', server_integrity_state='VERIFIED' WHERE organization_id=? AND attachment_id=?", [org, p.attachmentId]); return { done: true }; }
    const code = r.body?.code ?? `HTTP_${r.status}`;
    if (code === 'UPLOAD_SESSION_EXPIRED') {   // start the upload again from the stored file
      await q("UPDATE sync_outbox SET state='QUEUED', attempt_count=0, next_attempt_at=NULL WHERE organization_id=? AND entity_id=? AND operation_type IN ('EVIDENCE_UPLOAD_INIT','EVIDENCE_UPLOAD_PART')", [org, p.attachmentId]);
      return { retry: code };
    }
    if (code === 'HASH_MISMATCH' || code === 'SIZE_MISMATCH' || code === 'QUARANTINED') {
      await q("UPDATE local_evidence SET lifecycle_state='FAILED', server_integrity_state='QUARANTINED' WHERE organization_id=? AND attachment_id=?", [org, p.attachmentId]);
      await q(`INSERT INTO reconciliation_case(organization_id,case_id,device_id,entity_type,entity_id,conflict_type,created_at,severity,allowed_actions_json,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [org, crypto.randomUUID(), set.deviceId, 'evidence', p.attachmentId, `EVIDENCE_${code}`, now(), 'BLOCKING', JSON.stringify(['RECAPTURE']), 'OPEN']);
      return { fail: code };
    }
    if (r.body?.retryable || r.status >= 500 || r.status === 429 || r.status === 401) return { retry: code };
    return { fail: code };
  }
  // SUBMISSION_ATTEMPT_SEND
  const a = (await q<any>('SELECT * FROM submission_attempt WHERE organization_id=? AND attempt_id=?', [org, p.attemptId]))[0];
  const body = { contract_version: a.contract_version, created_at: a.created_at, attempt_id: a.attempt_id, idempotency_key: a.idempotency_key, session_id: a.session_id, organization_id: org, assignment_id: a.assignment_id,
    assignment_revision_used: a.assignment_revision_used, template_version_id: a.template_version_id, blueprint_hash: a.blueprint_hash, payload: JSON.parse(a.canonical_payload_json), payload_hash: a.payload_hash,
    evidence_manifest: JSON.parse(a.evidence_manifest_json), device_id: a.device_id, client_submitted_at: a.client_submitted_at, timezone: a.timezone };
  const r = await api(set, 'POST', '/field/submission-attempts', { body, idempotencyKey: a.idempotency_key });
  if (r.networkError) return { retry: 'OFFLINE', offline: true };
  if (r.status === 201 || r.status === 200) {
    await q("UPDATE submission_attempt SET server_submission_state='RECEIVED', server_outcome_at=? WHERE organization_id=? AND attempt_id=?", [now(), org, p.attemptId]);
    return { done: true };
  }
  const code = r.body?.code ?? `HTTP_${r.status}`;
  if (r.status >= 500 || r.status === 429 || r.status === 401) return { retry: code };
  await q("UPDATE submission_attempt SET server_submission_state='REJECTED', rejection_code=?, server_outcome_at=? WHERE organization_id=? AND attempt_id=?", [code, now(), org, p.attemptId]);
  await q(`INSERT INTO reconciliation_case(organization_id,case_id,device_id,entity_type,entity_id,conflict_type,created_at,severity,allowed_actions_json,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [org, crypto.randomUUID(), set.deviceId, 'submission_attempt', p.attemptId, `SERVER_${code}`, now(), 'BLOCKING', JSON.stringify(['REVIEW']), 'OPEN']);
  return { fail: code };
}

let running = false;
export interface RunSummary { ran: number; succeeded: number; failed: number; offline: boolean; busy?: boolean }

/** Sends everything that is ready, in dependency order, until nothing runnable is left or the network is down. */
export async function runOutbox(set: Settings): Promise<RunSummary> {
  if (running) return { ran: 0, succeeded: 0, failed: 0, offline: false, busy: true };
  running = true;
  const sum: RunSummary = { ran: 0, succeeded: 0, failed: 0, offline: false };
  try {
    for (let guard = 0; guard < 200; guard++) {
      const org = set.organizationId;
      const ops = await q<Op>(`SELECT o.* FROM sync_outbox o WHERE o.organization_id=? AND o.state IN ('QUEUED','RETRY_WAIT','BLOCKED_DEPENDENCY')
          AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= ?)
          AND NOT EXISTS (SELECT 1 FROM sync_operation_dependency d JOIN sync_outbox x ON x.organization_id=d.organization_id AND x.operation_id=d.depends_on_operation_id WHERE d.organization_id=o.organization_id AND d.operation_id=o.operation_id AND d.required=1 AND x.state<>'SUCCEEDED')
        ORDER BY o.priority, o.created_at LIMIT 1`, [org, now()]);
      // an operation whose required dependency failed for good can never run
      await q(`UPDATE sync_outbox SET state='FAILED_FINAL', last_error_code='DEPENDENCY_FAILED', updated_at=? WHERE organization_id=? AND state IN ('QUEUED','RETRY_WAIT','BLOCKED_DEPENDENCY') AND EXISTS (SELECT 1 FROM sync_operation_dependency d JOIN sync_outbox x ON x.organization_id=d.organization_id AND x.operation_id=d.depends_on_operation_id WHERE d.organization_id=sync_outbox.organization_id AND d.operation_id=sync_outbox.operation_id AND d.required=1 AND x.state='FAILED_FINAL')`, [now(), org]);
      const op = ops[0]; if (!op) break;
      await q("UPDATE sync_outbox SET state='RUNNING', updated_at=? WHERE organization_id=? AND operation_id=?", [now(), org, op.operation_id]);
      sum.ran++;
      let res: Outcome;
      try { res = await run(set, op); } catch (e: any) { res = { retry: 'LOCAL_ERROR' }; }
      if ('done' in res) { await set_(op.operation_id, org, 'SUCCEEDED', null, res.outcome ?? null); sum.succeeded++; }
      else if ('fail' in res) { await set_(op.operation_id, org, 'FAILED_FINAL', res.fail); sum.failed++; }
      else { await set_(op.operation_id, org, 'RETRY_WAIT', res.retry, null, backoff(op.attempt_count)); if (res.offline) { sum.offline = true; break; } }
    }
  } finally { running = false; }
  return sum;
}

export const listOutbox = () => q<{ operation_id: string; operation_type: string; entity_id: string; state: string; attempt_count: number; last_error_code: string | null; updated_at: string }>(
  'SELECT operation_id,operation_type,entity_id,state,attempt_count,last_error_code,updated_at FROM sync_outbox ORDER BY created_at DESC LIMIT 40');
export { fileName };
