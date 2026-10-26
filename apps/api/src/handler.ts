import type { Db } from './db';
import { bearerFrom, type TokenVerifier } from './auth';
import { loadPrincipal } from './principal';
import { authorize } from '../../../packages/security/src/authorization';
import { parseAttempt, payloadHashOf } from './submission';

export interface Deps { db: Db; verify: TokenVerifier }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', 'cache-control': 'no-store', ...extra } });

function problem(status: number, code: string, detail: string, correlationId: string, retryable = false) {
  return json(status, { type: `https://contracts.binafield.io/problem/${code}`, title: code, status, code, detail, correlation_id: correlationId, retryable }, { 'x-correlation-id': correlationId });
}

/** Single entry point: maps Request to Response. Routes follow packages/contracts/api/openapi.v1.yaml paths under /api. */
export async function handle(req: Request, deps: Deps): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const incoming = req.headers.get('x-correlation-id');
  const correlationId = incoming && UUID.test(incoming) ? incoming : crypto.randomUUID();

  if (req.method === 'GET' && path === '/health') {
    const p = await deps.db.ping();
    return json(p.ok ? 200 : 503, { status: p.ok ? 'ok' : 'degraded', database: p.ok, ...(p.ok ? {} : { reason: p.reason ?? 'UNKNOWN' }) }, { 'x-correlation-id': correlationId });
  }

  const me = /^\/organizations\/([^/]+)\/me$/.exec(path);
  if (req.method === 'GET' && me) {
    const organizationId = me[1]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    const deviceId = req.headers.get('x-device-id');
    if (deviceId && !UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'X-Device-Id must be a UUID', correlationId);

    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
        // An unknown user or a membership outside this organisation is concealed as absent (ADR-0005).
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        // "Who am I" needs no permission, only an ACTIVE membership; same reason codes as authorize().
        if (r.principal.membershipState !== 'ACTIVE') {
          return problem(403, r.principal.membershipState === 'REVOKED' ? 'MEMBERSHIP_REVOKED' : 'MEMBERSHIP_INACTIVE', 'Access denied', correlationId);
        }
        return json(200, {
          user_id: r.userId, membership_id: r.membershipId, organization_id: organizationId,
          membership_state: r.principal.membershipState, device_id: deviceId, device_state: r.principal.deviceState,
          permissions: [...r.principal.permissions].sort(), scopes: r.principal.scopes
        }, { 'x-correlation-id': correlationId });
      });
    } catch {
      return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true);
    }
  }

  const sub = /^\/organizations\/([^/]+)\/field\/submission-attempts$/.exec(path);
  const outcome = /^\/organizations\/([^/]+)\/field\/submission-attempts\/([^/]+)\/outcome$/.exec(path);
  if ((req.method === 'POST' && sub) || (req.method === 'GET' && outcome)) {
    const organizationId = (sub ?? outcome)![1]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    const deviceId = req.headers.get('x-device-id');
    if (deviceId && !UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'X-Device-Id must be a UUID', correlationId);
    const hdr = { 'x-correlation-id': correlationId };
    const deny = (reason: string) => problem(reason === 'RESOURCE_NOT_FOUND' ? 404 : 403, reason, 'Access denied', correlationId);

    if (outcome) {
      const attemptId = outcome[2]!;
      if (!UUID.test(attemptId)) return problem(400, 'INVALID_ATTEMPT_ID', 'attempt_id must be a UUID', correlationId);
      try {
        return await deps.db.tx(async (q) => {
          const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
          if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
          const a0 = authorize(r.principal, { organizationId, permission: 'submission.acceptance.read' });
          if (a0.decision === 'DENY') return deny(a0.reasonCode);
          const a = await q.query<{ project_id: string; received_at: string }>('SELECT project_id, received_at FROM field.submission_attempts WHERE id = $1 AND organization_id = $2', [attemptId, organizationId]);
          if (!a.rows[0]) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
          const a1 = authorize(r.principal, { organizationId, permission: 'submission.acceptance.read', projectId: a.rows[0].project_id });
          if (a1.decision === 'DENY') return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
          const s = await q.query<{ id: string; lifecycle_state: string; rejection_code: string | null }>('SELECT id, lifecycle_state, rejection_code FROM field.submissions WHERE submission_attempt_id = $1 AND organization_id = $2', [attemptId, organizationId]);
          const row = s.rows[0];
          return json(200, { attempt_id: attemptId, status: row ? row.lifecycle_state : 'RECEIVED', submission_id: row?.id ?? null, rejection_code: row?.rejection_code ?? null, received_at: a.rows[0].received_at }, hdr);
        });
      } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
    }

    const idem = req.headers.get('idempotency-key');
    if (!idem || idem.length < 8 || idem.length > 200) return problem(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header (8-200 characters) is required', correlationId);
    let raw: unknown;
    try { raw = await req.json(); } catch { return problem(400, 'INVALID_REQUEST', 'Body must be valid JSON', correlationId); }
    const parsed = parseAttempt(raw, organizationId);
    if (!parsed.ok) return problem(400, 'INVALID_REQUEST', parsed.detail, correlationId);
    const b = parsed.body;
    if (!deviceId || deviceId !== b.device_id) return problem(400, 'DEVICE_MISMATCH', 'X-Device-Id must be present and equal device_id in the body', correlationId);
    // The server never trusts the phone's hash: recompute it from the payload and refuse any difference.
    if (payloadHashOf(b.payload) !== b.payload_hash) return problem(422, 'PAYLOAD_HASH_MISMATCH', 'payload_hash does not match the canonical hash of payload', correlationId);

    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const base = { organizationId, permission: 'submission.create', deviceRequired: true };
        const a0 = authorize(r.principal, base);
        if (a0.decision === 'DENY') return deny(a0.reasonCode);
        const as = await q.query<{ project_id: string; template_version_id: string; revision: string; assignee_membership_id: string | null; lifecycle_state: string }>(
          'SELECT project_id, template_version_id, revision, assignee_membership_id, lifecycle_state FROM ops.assignments WHERE id = $1 AND organization_id = $2', [b.assignment_id, organizationId]);
        const asg = as.rows[0];
        if (!asg || (asg.assignee_membership_id && asg.assignee_membership_id !== r.membershipId)) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a1 = authorize(r.principal, { ...base, projectId: asg.project_id });
        if (a1.decision === 'DENY') return deny(a1.reasonCode);
        if (asg.template_version_id !== b.template_version_id) return problem(422, 'TEMPLATE_VERSION_MISMATCH', 'template_version_id does not match the assignment', correlationId);
        if (b.assignment_revision_used > Number(asg.revision)) return problem(422, 'ASSIGNMENT_REVISION_UNKNOWN', 'assignment_revision_used is newer than the server revision', correlationId);

        // Idempotency: the unique (organization, assignment, idempotency_key) row is the record. Same hash = replay, different = conflict.
        const ex = await q.query<{ id: string; payload_hash: string; received_at: string }>(
          'SELECT id, payload_hash, received_at FROM field.submission_attempts WHERE organization_id = $1 AND assignment_id = $2 AND idempotency_key = $3', [organizationId, b.assignment_id, idem]);
        if (ex.rows[0]) {
          if (ex.rows[0].id !== b.attempt_id || ex.rows[0].payload_hash !== b.payload_hash) return problem(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency-Key was already used with a different request', correlationId);
          return json(200, { attempt_id: b.attempt_id, status: 'RECEIVED', replayed: true, received_at: ex.rows[0].received_at }, hdr);
        }
        const dup = await q.query<{ id: string }>('SELECT id FROM field.submission_attempts WHERE organization_id = $1 AND id = $2', [organizationId, b.attempt_id]);
        if (dup.rows[0]) return problem(409, 'IDEMPOTENCY_CONFLICT', 'attempt_id already exists with another Idempotency-Key', correlationId);

        const ins = await q.query<{ received_at: string }>(
          `INSERT INTO field.submission_attempts (id, organization_id, project_id, assignment_id, template_version_id, submission_session_id, attempt_no, membership_id, device_id,
             assignment_revision, blueprint_hash, payload_json, payload_hash, evidence_manifest_json, client_completed_at, client_submitted_at, idempotency_key, correlation_id)
           VALUES ($1,$2,$3,$4,$5,$6,(SELECT COALESCE(MAX(attempt_no),0)+1 FROM field.submission_attempts WHERE organization_id = $2 AND submission_session_id = $6),$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14,$15,$16,$17)
           RETURNING received_at`,
          [b.attempt_id, organizationId, asg.project_id, b.assignment_id, b.template_version_id, b.session_id, r.membershipId, deviceId, b.assignment_revision_used, b.blueprint_hash,
           JSON.stringify(b.payload), b.payload_hash, JSON.stringify(b.evidence_manifest), b.client_completed_at ?? null, b.client_submitted_at, idem, correlationId]);
        return json(201, { attempt_id: b.attempt_id, status: 'RECEIVED', replayed: false, received_at: ins.rows[0]!.received_at }, hdr);
      });
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
  }

  return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
}
