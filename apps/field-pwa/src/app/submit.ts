import { payloadHash } from './canonical';
import type { Settings } from './config';
import { enqueueIn } from './outbox';
import { files, sha256Hex } from '../spikes/fileClient';
import { now, q, tx } from './store';

export interface Field { id: string; type: 'select' | 'text' | 'photo'; label: string; options?: string[]; required: boolean }
export interface Blueprint { title: string; fields: Field[]; schema: string }

export async function blueprintFor(templateVersionId: string): Promise<{ bp: Blueprint; hash: string } | null> {
  const r = await q<{ blueprint_json: string; blueprint_hash: string }>('SELECT blueprint_json, blueprint_hash FROM template_package WHERE template_version_id=? AND integrity_verified=1', [templateVersionId]);
  return r[0] ? { bp: JSON.parse(r[0].blueprint_json), hash: r[0].blueprint_hash } : null;
}

/** Returns the open draft for an assignment, creating one the first time. */
export async function openDraft(set: Settings, assignmentId: string) {
  const a = (await q<any>('SELECT template_version_id, authoritative_revision FROM assignment_cache WHERE organization_id=? AND assignment_id=?', [set.organizationId, assignmentId]))[0];
  if (!a) throw new Error('ASSIGNMENT_NOT_FOUND');
  const open = await q<any>("SELECT * FROM submission_session WHERE organization_id=? AND assignment_id=? AND lifecycle_state IN ('CREATED','IN_PROGRESS') ORDER BY last_local_save_at DESC LIMIT 1", [set.organizationId, assignmentId]);
  if (open[0]) return { session: open[0], payload: JSON.parse(open[0].payload_json) as Record<string, unknown> };
  const id = crypto.randomUUID();
  await q("INSERT INTO submission_session(organization_id,session_id,assignment_id,assignment_revision_started,template_version_id,lifecycle_state,payload_json,device_started_at,last_local_save_at,owning_device_id) VALUES (?,?,?,?,?,'CREATED','{}',?,?,?)",
    [set.organizationId, id, assignmentId, a.authoritative_revision, a.template_version_id, now(), now(), set.deviceId]);
  return { session: (await q<any>('SELECT * FROM submission_session WHERE organization_id=? AND session_id=?', [set.organizationId, id]))[0], payload: {} as Record<string, unknown> };
}

/** Saves the draft on every change so a closed tab or dead battery loses nothing. */
export const saveDraft = (set: Settings, sessionId: string, payload: Record<string, unknown>) =>
  q("UPDATE submission_session SET payload_json=?, lifecycle_state='IN_PROGRESS', local_revision=local_revision+1, last_local_save_at=? WHERE organization_id=? AND session_id=? AND lifecycle_state IN ('CREATED','IN_PROGRESS')",
    [JSON.stringify(payload), now(), set.organizationId, sessionId]);

export async function addPhoto(set: Settings, sessionId: string, assignmentId: string, fieldId: string, file: File) {
  const bytes = await file.arrayBuffer();
  const sha = await sha256Hex(bytes.slice(0));
  const attachmentId = crypto.randomUUID();
  const name = `ev-${attachmentId}`;
  await files.write(name, bytes);                      // bytes are safe on disk before the row exists
  await q(`INSERT INTO local_evidence(organization_id,attachment_id,assignment_id,session_id,field_id,evidence_type,evidence_role,local_file_path,source_kind,byte_size,sha256,claimed_mime_type,device_captured_at,lifecycle_state,created_by_device_id)
    VALUES (?,?,?,?,?,'PHOTO','ORIGINAL',?,'CAMERA_CAPTURE',?,?,?,?,'LOCAL_CAPTURED',?)`,
    [set.organizationId, attachmentId, assignmentId, sessionId, fieldId, name, file.size, sha, file.type || 'image/jpeg', now(), set.deviceId]);
  return attachmentId;
}
export const listPhotos = (sessionId: string) => q<{ attachment_id: string; field_id: string; byte_size: number; sha256: string; lifecycle_state: string; local_file_path: string; claimed_mime_type: string }>(
  'SELECT attachment_id, field_id, byte_size, sha256, lifecycle_state, local_file_path, claimed_mime_type FROM local_evidence WHERE session_id=? ORDER BY device_captured_at', [sessionId]);
export const removePhoto = (attachmentId: string) => q("DELETE FROM local_evidence WHERE attachment_id=? AND lifecycle_state='LOCAL_CAPTURED'", [attachmentId]);

/** Finds what the person still has to fill in. */
export function missingFields(bp: Blueprint, payload: Record<string, unknown>, photoFieldIds: string[]): string[] {
  return bp.fields.filter((f) => f.required && (f.type === 'photo' ? !photoFieldIds.includes(f.id) : payload[f.id] === undefined || payload[f.id] === '')).map((f) => f.label);
}

/** Freezes the draft into an immutable attempt and queues everything needed to send it. One transaction: either all of it exists or none of it does. */
export async function submit(set: Settings, sessionId: string): Promise<{ attemptId: string; missing: string[] }> {
  const s = (await q<any>('SELECT * FROM submission_session WHERE organization_id=? AND session_id=?', [set.organizationId, sessionId]))[0];
  if (!s) throw new Error('SESSION_NOT_FOUND');
  const b = await blueprintFor(s.template_version_id);
  if (!b) throw new Error('BLUEPRINT_MISSING');
  const payload = JSON.parse(s.payload_json) as Record<string, unknown>;
  const ev = await q<any>('SELECT * FROM local_evidence WHERE organization_id=? AND session_id=? ORDER BY device_captured_at', [set.organizationId, sessionId]);
  const missing = missingFields(b.bp, payload, ev.map((e) => e.field_id));
  if (missing.length) return { attemptId: '', missing };
  const attemptId = crypto.randomUUID();
  const manifest = ev.map((e) => ({ attachment_id: e.attachment_id, field_id: e.field_id, evidence_type: e.evidence_type, required: true, evidence_role: e.evidence_role, hash_algorithm: 'SHA-256', sha256: e.sha256, byte_size: e.byte_size,
    source_kind: e.source_kind, captured_at: e.device_captured_at, classification: 'INTERNAL', claimed_mime_type: e.claimed_mime_type }));
  const pHash = await payloadHash(payload);
  const stamp = now();
  await tx(async (t) => {
    await t.exec(`INSERT INTO submission_attempt(organization_id,attempt_id,idempotency_key,session_id,assignment_id,assignment_revision_used,template_version_id,blueprint_hash,canonical_payload_json,payload_hash,evidence_manifest_json,device_id,client_submitted_at,timezone,contract_version,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [set.organizationId, attemptId, `sub-${attemptId}`, sessionId, s.assignment_id, s.assignment_revision_started, s.template_version_id, b.hash, JSON.stringify(payload), pHash, JSON.stringify(manifest), set.deviceId, stamp, Intl.DateTimeFormat().resolvedOptions().timeZone, '1.0', stamp]);
    await t.exec("UPDATE submission_session SET lifecycle_state='SUBMITTED', device_submitted_at=?, last_local_save_at=? WHERE organization_id=? AND session_id=?", [stamp, stamp, set.organizationId, sessionId]);
    await t.exec("UPDATE assignment_cache SET local_execution_status='SUBMITTED_PENDING_SYNC' WHERE organization_id=? AND assignment_id=?", [set.organizationId, s.assignment_id]);
    const finals: string[] = [];
    for (const e of ev) {
      await t.exec("UPDATE local_evidence SET lifecycle_state='QUEUED_FOR_UPLOAD' WHERE organization_id=? AND attachment_id=?", [set.organizationId, e.attachment_id]);
      const init = await enqueueIn(t, set.organizationId, { type: 'EVIDENCE_UPLOAD_INIT', entityType: 'evidence', entityId: e.attachment_id, payload: { attachmentId: e.attachment_id }, idempotencyKey: `init-${e.attachment_id}` });
      const part = await enqueueIn(t, set.organizationId, { type: 'EVIDENCE_UPLOAD_PART', entityType: 'evidence', entityId: e.attachment_id, payload: { attachmentId: e.attachment_id }, idempotencyKey: `part-${e.attachment_id}`, dependsOn: [init] });
      finals.push(await enqueueIn(t, set.organizationId, { type: 'EVIDENCE_UPLOAD_FINALIZE', entityType: 'evidence', entityId: e.attachment_id, payload: { attachmentId: e.attachment_id }, idempotencyKey: `fin-${e.attachment_id}`, dependsOn: [part] }));
    }
    await enqueueIn(t, set.organizationId, { type: 'SUBMISSION_ATTEMPT_SEND', entityType: 'submission_attempt', entityId: attemptId, payload: { attemptId }, idempotencyKey: `sub-${attemptId}`, dependsOn: finals });
  });
  return { attemptId, missing: [] };
}
