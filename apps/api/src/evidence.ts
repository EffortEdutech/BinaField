import type { Deps } from './handler';
import { bearerFrom } from './auth';
import { loadPrincipal } from './principal';
import { authorize } from '../../../packages/security/src/authorization';
import { UUID, json, problem } from './http';

const MAX_BYTES = 25 * 1024 * 1024;          // EVIDENCE_SIZE_LIMIT_EXCEEDED above this
const SESSION_MINUTES = 15;
const SOURCE: Record<string, string> = { CAMERA_CAPTURE: 'CAMERA_CAPTURE', FILE_IMPORT: 'FILE_IMPORT', SIGNATURE_RENDER: 'SIGNATURE_SURFACE', SYSTEM_DERIVATIVE: 'SYSTEM_DERIVATIVE' };
const HASH = /^[a-f0-9]{64}$/;

function parseInit(b: unknown, organizationId: string): { ok: true; v: Record<string, any> } | { ok: false; code: string; detail: string } {
  const bad = (detail: string, code = 'METADATA_INVALID') => ({ ok: false as const, code, detail });
  if (!b || typeof b !== 'object' || Array.isArray(b)) return bad('Body must be a JSON object');
  const o = b as Record<string, any>;
  for (const k of ['attachment_id', 'assignment_id', 'session_id']) if (typeof o[k] !== 'string' || !UUID.test(o[k])) return bad(`${k} must be a UUID`);
  if (o.organization_id !== organizationId) return bad('organization_id does not match the path', 'TENANT_MISMATCH');
  if (!['PHOTO', 'SIGNATURE', 'FILE_ATTACHMENT'].includes(o.evidence_type)) return bad('evidence_type is not supported');
  if (o.evidence_role !== 'ORIGINAL') return bad('Only ORIGINAL evidence can be uploaded in this version');
  if (!Number.isInteger(o.byte_size) || o.byte_size < 1) return bad('byte_size must be a positive integer');
  if (o.byte_size > MAX_BYTES) return bad(`byte_size exceeds ${MAX_BYTES}`, 'EVIDENCE_SIZE_LIMIT_EXCEEDED');
  if (typeof o.sha256 !== 'string' || !HASH.test(o.sha256)) return bad('sha256 must be 64 lowercase hex characters');
  if (typeof o.claimed_mime_type !== 'string' || !o.claimed_mime_type) return bad('claimed_mime_type is required');
  if (!SOURCE[o.source_kind]) return bad('source_kind is not supported');
  if (o.upload_protocol_version !== '1.0') return bad('upload_protocol_version must be "1.0"');
  if (o.field_id != null && typeof o.field_id !== 'string') return bad('field_id must be a string');
  return { ok: true, v: o };
}

/** Evidence routes (initiate and finalize). Returns null when the path is not an evidence route. */
export async function handleEvidence(req: Request, path: string, deps: Deps, correlationId: string): Promise<Response | null> {
  const init = req.method === 'POST' ? /^\/organizations\/([^/]+)\/evidence\/uploads$/.exec(path) : null;
  const fin = req.method === 'POST' ? /^\/organizations\/([^/]+)\/evidence\/uploads\/([^/:]+):finalize$/.exec(path) : null;
  if (!init && !fin) return null;
  const organizationId = (init ?? fin)![1]!;
  if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
  const bearer = bearerFrom(req.headers.get('authorization'));
  if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
  let token;
  try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
  const deviceId = req.headers.get('x-device-id');
  if (deviceId && !UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'X-Device-Id must be a UUID', correlationId);
  const idem = req.headers.get('idempotency-key');
  if (!idem || idem.length < 8 || idem.length > 200) return problem(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header (8-200 characters) is required', correlationId);
  if (!deps.storage) return problem(503, 'STORAGE_NOT_CONFIGURED', 'Evidence storage is not configured', correlationId, true);
  const storage = deps.storage;
  let raw: any = null;
  try { raw = await req.json(); } catch { /* validated below */ }
  const hdr = { 'x-correlation-id': correlationId };
  const deny = (reason: string) => problem(reason === 'RESOURCE_NOT_FOUND' ? 404 : 403, reason, 'Access denied', correlationId);
  const base = { organizationId, permission: 'evidence.capture', deviceRequired: true };

  try {
    if (init) {
      const p = parseInit(raw, organizationId);
      if (!p.ok) return problem(p.code === 'EVIDENCE_SIZE_LIMIT_EXCEEDED' ? 413 : p.code === 'TENANT_MISMATCH' ? 403 : 400, p.code, p.detail, correlationId);
      const v = p.v;
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a0 = authorize(r.principal, base);
        if (a0.decision === 'DENY') return deny(a0.reasonCode);
        const as = await q.query<{ project_id: string; assignee_membership_id: string | null }>('SELECT project_id, assignee_membership_id FROM ops.assignments WHERE id = $1 AND organization_id = $2', [v.assignment_id, organizationId]);
        const asg = as.rows[0];
        if (!asg || (asg.assignee_membership_id && asg.assignee_membership_id !== r.membershipId)) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a1 = authorize(r.principal, { ...base, projectId: asg.project_id });
        if (a1.decision === 'DENY') return deny(a1.reasonCode);

        const key = `${organizationId}/${v.attachment_id}`;
        const ex = await q.query<{ content_hash: string; byte_size: string; assignment_id: string; integrity_state: string; transfer_state: string }>(
          'SELECT content_hash, byte_size, assignment_id, integrity_state, transfer_state FROM evidence.attachments WHERE id = $1 AND organization_id = $2', [v.attachment_id, organizationId]);
        const e = ex.rows[0];
        if (e && (e.content_hash !== v.sha256 || Number(e.byte_size) !== v.byte_size || e.assignment_id !== v.assignment_id)) return problem(409, 'IDEMPOTENCY_CONFLICT', 'attachment_id already exists with a different description', correlationId);
        if (e && e.integrity_state !== 'PENDING') return problem(409, 'BINDING_CONFLICT', `Attachment is already ${e.integrity_state}`, correlationId);

        let uploadId: string; let expiresAt: string; let state = 'INITIALISED'; let status = 201;
        if (e) {
          // Retry of the same initiation: reuse the open session, or open a fresh one if the old one lapsed.
          const s = await q.query<{ id: string; state: string; expires_at: string; live: boolean }>(
            `SELECT id, state, expires_at, expires_at > now() AS live FROM evidence.upload_sessions WHERE organization_id = $1 AND attachment_id = $2 ORDER BY created_at DESC LIMIT 1`, [organizationId, v.attachment_id]);
          const cur = s.rows[0];
          if (cur && cur.live && (cur.state === 'INITIALISED' || cur.state === 'UPLOADING')) { uploadId = cur.id; expiresAt = cur.expires_at; state = cur.state; status = 200; }
          else {
            uploadId = crypto.randomUUID();
            const ins = await q.query<{ expires_at: string }>(`INSERT INTO evidence.upload_sessions(id, organization_id, attachment_id, expected_hash, expected_byte_size, expected_mime_type, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' minutes')::interval) RETURNING expires_at`,
              [uploadId, organizationId, v.attachment_id, v.sha256, v.byte_size, v.claimed_mime_type, String(SESSION_MINUTES)]);
            expiresAt = ins.rows[0]!.expires_at;
          }
        } else {
          await q.query(`INSERT INTO evidence.attachments(id, organization_id, project_id, assignment_id, submission_session_id, field_id, evidence_type, evidence_role, capture_source, content_hash, byte_size, claimed_mime_type, storage_key, transfer_state)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'ORIGINAL',$8,$9,$10,$11,$12,'UPLOADING')`,
            [v.attachment_id, organizationId, asg.project_id, v.assignment_id, v.session_id, v.field_id ?? null, v.evidence_type, SOURCE[v.source_kind], v.sha256, v.byte_size, v.claimed_mime_type, key]);
          uploadId = crypto.randomUUID();
          const ins = await q.query<{ expires_at: string }>(`INSERT INTO evidence.upload_sessions(id, organization_id, attachment_id, expected_hash, expected_byte_size, expected_mime_type, expires_at) VALUES ($1,$2,$3,$4,$5,$6, now() + ($7 || ' minutes')::interval) RETURNING expires_at`,
            [uploadId, organizationId, v.attachment_id, v.sha256, v.byte_size, v.claimed_mime_type, String(SESSION_MINUTES)]);
          expiresAt = ins.rows[0]!.expires_at;
        }
        const signed = await storage.signUpload(key);
        return json(status, {
          upload_id: uploadId, attachment_id: v.attachment_id, organization_id: organizationId, expected_size: v.byte_size, expected_sha256: v.sha256, expected_mime_type: v.claimed_mime_type,
          upload_strategy: 'SINGLE_PUT', state, expires_at: new Date(expiresAt).toISOString(), max_parts: null, part_size: null, provider_upload_reference: signed.url
        }, hdr);
      });
    }

    // Finalize: the server reads the stored bytes and checks size and SHA-256 itself; the phone's word is not enough.
    const uploadId = fin![2]!;
    if (!UUID.test(uploadId)) return problem(400, 'INVALID_UPLOAD_ID', 'upload_id must be a UUID', correlationId);
    if (raw && raw.upload_id !== undefined && raw.upload_id !== uploadId) return problem(422, 'SESSION_MISMATCH', 'upload_id in the body does not match the path', correlationId);
    return await deps.db.tx(async (q) => {
      const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
      if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
      const a0 = authorize(r.principal, base);
      if (a0.decision === 'DENY') return deny(a0.reasonCode);
      const s = await q.query<{ attachment_id: string; state: string; expected_hash: string; expected_byte_size: string; project_id: string; storage_key: string; live: boolean; verified_at: string | null }>(
        `SELECT u.attachment_id, u.state, u.expected_hash, u.expected_byte_size, a.project_id, a.storage_key, u.expires_at > now() AS live, a.verified_at
           FROM evidence.upload_sessions u JOIN evidence.attachments a ON a.organization_id = u.organization_id AND a.id = u.attachment_id WHERE u.id = $1 AND u.organization_id = $2`, [uploadId, organizationId]);
      const u = s.rows[0];
      if (!u) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
      const a1 = authorize(r.principal, { ...base, projectId: u.project_id });
      if (a1.decision === 'DENY') return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
      if (raw && raw.attachment_id !== undefined && raw.attachment_id !== u.attachment_id) return problem(422, 'SESSION_MISMATCH', 'attachment_id does not belong to this upload', correlationId);
      const status = (lifecycle: string, integrity: string, code: string | null, verifiedAt: string | null) =>
        ({ attachment_id: u.attachment_id, lifecycle_state: lifecycle, integrity_state: integrity, binding_state: 'UNBOUND', bound_at: null, failure_code: code, verified_at: verifiedAt ? new Date(verifiedAt).toISOString() : null });
      if (u.state === 'COMPLETED') return json(200, status('UPLOADED', 'VERIFIED', null, u.verified_at), hdr);
      if (u.state !== 'INITIALISED' && u.state !== 'UPLOADING') return problem(409, u.state === 'FAILED' ? 'QUARANTINED' : 'UPLOAD_SESSION_EXPIRED', `Upload session is ${u.state}`, correlationId);
      if (!u.live) {
        await q.query(`UPDATE evidence.upload_sessions SET state = 'EXPIRED', updated_at = now() WHERE id = $1 AND organization_id = $2`, [uploadId, organizationId]);
        return problem(409, 'UPLOAD_SESSION_EXPIRED', 'Upload session expired; start a new upload', correlationId);
      }
      const obj = await storage.hashObject(u.storage_key);
      if (!obj) return problem(409, 'OBJECT_MISSING', 'No uploaded file was found; upload it and finalize again', correlationId, true);
      const failure = obj.size !== Number(u.expected_byte_size) ? 'SIZE_MISMATCH' : obj.sha256 !== u.expected_hash ? 'HASH_MISMATCH' : null;
      if (failure) {
        await q.query(`UPDATE evidence.attachments SET integrity_state = 'QUARANTINED', transfer_state = 'UPLOADED', uploaded_at = now(), updated_at = now() WHERE id = $1 AND organization_id = $2`, [u.attachment_id, organizationId]);
        await q.query(`UPDATE evidence.upload_sessions SET state = 'FAILED', updated_at = now() WHERE id = $1 AND organization_id = $2`, [uploadId, organizationId]);
        return json(422, { type: `https://contracts.binafield.io/problem/${failure}`, title: failure, status: 422, code: failure, detail: 'Stored file does not match the declared size or hash; the attachment is quarantined', correlation_id: correlationId, retryable: false }, { 'x-correlation-id': correlationId });
      }
      const done = await q.query<{ verified_at: string }>(`UPDATE evidence.attachments SET transfer_state = 'UPLOADED', integrity_state = 'VERIFIED', uploaded_at = now(), verified_at = now(), updated_at = now() WHERE id = $1 AND organization_id = $2 RETURNING verified_at`, [u.attachment_id, organizationId]);
      await q.query(`UPDATE evidence.upload_sessions SET state = 'COMPLETED', updated_at = now() WHERE id = $1 AND organization_id = $2`, [uploadId, organizationId]);
      return json(200, status('UPLOADED', 'VERIFIED', null, done.rows[0]!.verified_at), hdr);
    });
  } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
}
