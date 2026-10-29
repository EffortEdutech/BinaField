import type { Db } from './db';
import { bearerFrom, type TokenVerifier } from './auth';
import { loadPrincipal } from './principal';
import { authorize } from '../../../packages/security/src/authorization';
import { parseAttempt, payloadHashOf } from './submission';
import { UUID, json, problem } from './http';
import { handleEvidence } from './evidence';
import type { EvidenceStorage } from './storage';

export interface Deps { db: Db; verify: TokenVerifier; storage?: EvidenceStorage }

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

  const device = /^\/organizations\/([^/]+)\/devices$/.exec(path);
  if (req.method === 'POST' && device) {
    const organizationId = device[1]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    let body: Record<string, unknown>;
    try { const raw = await req.json(); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(); body = raw as Record<string, unknown>; }
    catch { return problem(400, 'INVALID_JSON', 'Request body must be a JSON object', correlationId); }
    const membershipId = body.membership_id;
    const platform = body.platform;
    if (typeof membershipId !== 'string' || !UUID.test(membershipId)) return problem(400, 'INVALID_MEMBERSHIP_ID', 'membership_id must be a UUID', correlationId);
    if (typeof platform !== 'string' || !/^[A-Za-z0-9._-]{2,32}$/.test(platform)) return problem(400, 'INVALID_PLATFORM', 'platform must be 2-32 alphanumeric characters', correlationId);
    const deviceId = typeof body.device_id === 'string' ? body.device_id : crypto.randomUUID();
    if (!UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'device_id must be a UUID', correlationId);
    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId: null, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a = authorize(r.principal, { organizationId, permission: 'organization.manage' });
        if (a.decision === 'DENY') return problem(403, a.reasonCode, 'Access denied', correlationId);
        const member = await q.query<{ id: string }>('SELECT id FROM iam.memberships WHERE id = $1 AND organization_id = $2 AND lifecycle_state = \'ACTIVE\'', [membershipId, organizationId]);
        if (!member.rows[0]) return problem(404, 'RESOURCE_NOT_FOUND', 'Membership not found', correlationId);
        const inserted = await q.query<{ id: string; lifecycle_state: string }>(
          `INSERT INTO iam.registered_devices (id, organization_id, membership_id, platform, app_version, runtime_version, lifecycle_state, security_policy_version)
           VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)
           RETURNING id, lifecycle_state`,
          [deviceId, organizationId, membershipId, platform, typeof body.app_version === 'string' ? body.app_version : null, typeof body.runtime_version === 'string' ? body.runtime_version : null, typeof body.security_policy_version === 'string' ? body.security_policy_version : null]);
        return json(201, { device_id: inserted.rows[0]!.id, organization_id: organizationId, membership_id: membershipId, platform, device_state: inserted.rows[0]!.lifecycle_state }, { 'x-correlation-id': correlationId });
      });
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
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

  const delta = /^\/organizations\/([^/]+)\/field\/delta$/.exec(path);
  if (req.method === 'GET' && delta) {
    const organizationId = delta[1]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    const deviceId = req.headers.get('x-device-id');
    if (deviceId && !UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'X-Device-Id must be a UUID', correlationId);
    const cur = url.searchParams.get('cursor') ?? '';
    const m = cur === '' ? ['', '0'] : /^c1:(\d{1,15})$/.exec(cur);
    if (!m) return problem(400, 'INVALID_CURSOR', 'cursor must be empty or a value returned by this endpoint', correlationId);
    const after = Number(m[1]);
    const lim = url.searchParams.get('limit');
    const limit = lim === null ? 100 : Number(lim);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) return problem(400, 'INVALID_LIMIT', 'limit must be an integer from 1 to 500', correlationId);
    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a0 = authorize(r.principal, { organizationId, permission: 'assignment.read', deviceRequired: true });
        if (a0.decision === 'DENY') return problem(403, a0.reasonCode, 'Access denied', correlationId);
        // Only this person's changes are read; the pull never moves the device cursor (the acknowledgement does, after apply).
        const rows = await q.query<{ sequence_id: string; entity_type: string; entity_id: string; entity_revision: string | null; change_type: string; payload_json: Record<string, unknown>; occurred_at: string }>(
          `SELECT sequence_id, entity_type, entity_id, entity_revision, change_type, payload_json, occurred_at FROM sync.change_log
            WHERE organization_id = $1 AND sequence_id > $2 AND entity_type = 'assignment' AND payload_json->>'assignee_membership_id' = $3
            ORDER BY sequence_id LIMIT $4`, [organizationId, after, r.membershipId, limit + 1]);
        const page = rows.rows.slice(0, limit);
        const entries = page.filter((e) => authorize(r.principal, { organizationId, permission: 'assignment.read', projectId: String(e.payload_json.project_id) }).decision === 'ALLOW').map((e) => {
          const pj = e.payload_json; const seq = Number(e.sequence_id);
          const rev = e.entity_revision === null ? null : Number(e.entity_revision);
          return {
            delta_id: '00000000-0000-4000-8000-' + seq.toString(16).padStart(12, '0'), entity_type: e.entity_type, entity_id: e.entity_id, organization_id: organizationId,
            entity_revision: rev, change_type: e.change_type, occurred_at: new Date(e.occurred_at).toISOString(),
            payload: e.change_type === 'UPSERT'
              ? { assignment_id: pj.assignment_id, assignment_revision: pj.assignment_revision, template_version_id: pj.template_version_id, blueprint_hash: pj.blueprint_hash, payload: { project_id: pj.project_id, ...(pj.payload as object) } }
              : { assignment_id: pj.assignment_id, organization_id: organizationId, authoritative_revision: rev ?? 0, tombstone_type: pj.tombstone_type, effective_at: new Date(e.occurred_at).toISOString() }
          };
        });
        // The template is immutable once published, so the form definition travels with the assignment it belongs to.
        const tids = [...new Set(entries.filter((e) => e.change_type === 'UPSERT').map((e) => String((e.payload as { template_version_id: string }).template_version_id)))];
        if (tids.length) {
          const tvs = await q.query<{ id: string; blueprint_json: unknown; blueprint_hash: string }>('SELECT id, blueprint_json, blueprint_hash FROM blueprint.template_versions WHERE organization_id = $1 AND id = ANY($2::uuid[])', [organizationId, tids]);
          for (const e of entries) {
            if (e.change_type !== 'UPSERT') continue;
            const t = tvs.rows.find((x) => x.id === (e.payload as { template_version_id: string }).template_version_id);
            if (t) (e.payload as { payload: Record<string, unknown> }).payload.blueprint = t.blueprint_json;
          }
        }
        const last = page.length ? Number(page[page.length - 1]!.sequence_id) : after;
        return json(200, { sync_protocol_version: '1.0', organization_id: organizationId, prior_cursor: cur, next_cursor: 'c1:' + last, server_time: new Date().toISOString(), entries }, { 'x-correlation-id': correlationId });
      });
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
  }

  const ack = /^\/organizations\/([^/]+)\/field\/acknowledgements$/.exec(path);
  if (req.method === 'POST' && ack) {
    const organizationId = ack[1]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    const deviceId = req.headers.get('x-device-id');
    if (deviceId && !UUID.test(deviceId)) return problem(400, 'INVALID_DEVICE_ID', 'X-Device-Id must be a UUID', correlationId);
    const idem = req.headers.get('idempotency-key');
    if (!idem || idem.length < 8 || idem.length > 200) return problem(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header (8-200 characters) is required', correlationId);
    let raw: Record<string, unknown> | null = null;
    try { raw = (await req.json()) as Record<string, unknown>; } catch { /* handled below */ }
    const c = raw && typeof raw === 'object' ? (raw.cursor ?? (raw.payload as Record<string, unknown> | undefined)?.cursor) : undefined;
    const cm = typeof c === 'string' ? /^c1:(\d{1,15})$/.exec(c) : null;
    if (!cm) return problem(400, 'INVALID_CURSOR', 'cursor must be a value returned by the delta endpoint', correlationId);
    const acked = Number(cm[1]);
    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a0 = authorize(r.principal, { organizationId, permission: 'assignment.execute', deviceRequired: true });
        if (a0.decision === 'DENY') return problem(403, a0.reasonCode, 'Access denied', correlationId);
        // A device can only confirm what the server has actually published.
        const mx = await q.query<{ max: string | null }>('SELECT max(sequence_id) AS max FROM sync.change_log WHERE organization_id = $1', [organizationId]);
        if (acked > Number(mx.rows[0]?.max ?? 0)) return problem(422, 'CURSOR_AHEAD_OF_SERVER', 'cursor is beyond the latest published change', correlationId);
        // The stored cursor only moves forward; a repeat or an older acknowledgement changes nothing.
        const up = await q.query<{ cursor_sequence: string }>(
          `INSERT INTO sync.device_cursors(organization_id, device_id, cursor_sequence, acknowledged_at, updated_at) VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (organization_id, device_id) DO UPDATE SET cursor_sequence = GREATEST(sync.device_cursors.cursor_sequence, EXCLUDED.cursor_sequence),
             acknowledged_at = now(), updated_at = now() RETURNING cursor_sequence`, [organizationId, deviceId, acked]);
        const stored = Number(up.rows[0]!.cursor_sequence);
        return json(200, { device_id: deviceId, acknowledged_cursor: 'c1:' + stored, advanced: stored === acked }, { 'x-correlation-id': correlationId });
      });
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
  }

  const review = /^\/organizations\/([^/]+)\/submissions\/([^/]+)\/review$/.exec(path);
  if (req.method === 'POST' && review) {
    const organizationId = review[1]!, submissionId = review[2]!;
    if (!UUID.test(organizationId)) return problem(400, 'INVALID_ORGANIZATION_ID', 'organization_id must be a UUID', correlationId);
    if (!UUID.test(submissionId)) return problem(400, 'INVALID_SUBMISSION_ID', 'submission_id must be a UUID', correlationId);
    const bearer = bearerFrom(req.headers.get('authorization'));
    if (!bearer) return problem(401, 'AUTHENTICATION_REQUIRED', 'Bearer token required', correlationId);
    let token;
    try { token = await deps.verify(bearer); } catch { return problem(401, 'AUTHENTICATION_REQUIRED', 'Token is invalid or expired', correlationId); }
    let raw: any;
    try { raw = await req.json(); } catch { return problem(400, 'INVALID_REQUEST', 'Body must be valid JSON', correlationId); }
    const decision = raw?.decision;
    if (decision !== 'ACCEPT' && decision !== 'REJECT') return problem(400, 'INVALID_REVIEW_DECISION', 'decision must be ACCEPT or REJECT', correlationId);
    if (decision === 'REJECT' && (typeof raw.rejection_code !== 'string' || !raw.rejection_code)) return problem(400, 'REJECTION_CODE_REQUIRED', 'rejection_code is required when rejecting', correlationId);
    try {
      return await deps.db.tx(async (q) => {
        const r = await loadPrincipal(q, { sub: token.sub, organizationId, deviceId: null, correlationId, authenticationStrength: token.authenticationStrength });
        if (!r.ok) return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
        const a0 = authorize(r.principal, { organizationId, permission: 'submission.review' });
        if (a0.decision === 'DENY') return problem(403, a0.reasonCode, 'Access denied', correlationId);
        const attempt = await q.query<{ id: string; project_id: string; assignment_id: string }>(
          `SELECT a.id, a.project_id, a.assignment_id FROM field.submission_attempts a
           LEFT JOIN field.submissions s ON s.organization_id = a.organization_id AND s.submission_attempt_id = a.id
           WHERE a.organization_id = $1 AND (a.id = $2 OR s.id = $2)`, [organizationId, submissionId]);
        const row = attempt.rows[0];
        if (!row) return problem(404, 'RESOURCE_NOT_FOUND', 'Submission not found', correlationId);
        const a1 = authorize(r.principal, { organizationId, permission: 'submission.review', projectId: row.project_id });
        if (a1.decision === 'DENY') return problem(404, 'RESOURCE_NOT_FOUND', 'Submission not found', correlationId);
        const state = decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
        const updated = await q.query<{ id: string; lifecycle_state: string; rejection_code: string | null; accepted_at: string | null; rejected_at: string | null }>(
          `INSERT INTO field.submissions (id, organization_id, project_id, assignment_id, submission_attempt_id, lifecycle_state, rejection_code, accepted_at, rejected_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6 = 'ACCEPTED' THEN now() ELSE NULL END,CASE WHEN $6 = 'REJECTED' THEN now() ELSE NULL END)
           ON CONFLICT (organization_id, submission_attempt_id) DO UPDATE SET lifecycle_state = EXCLUDED.lifecycle_state, rejection_code = EXCLUDED.rejection_code,
             accepted_at = EXCLUDED.accepted_at, rejected_at = EXCLUDED.rejected_at, updated_at = now(), revision = field.submissions.revision + 1
           RETURNING id, lifecycle_state, rejection_code, accepted_at, rejected_at`,
          [submissionId, organizationId, row.project_id, row.assignment_id, row.id, state, decision === 'REJECT' ? raw.rejection_code : null]);
        return json(200, { submission_id: updated.rows[0]!.id, status: updated.rows[0]!.lifecycle_state, rejection_code: updated.rows[0]!.rejection_code, reviewed_at: updated.rows[0]!.accepted_at ?? updated.rows[0]!.rejected_at }, { 'x-correlation-id': correlationId });
      });
    } catch { return problem(503, 'SERVICE_UNAVAILABLE', 'Temporary failure', correlationId, true); }
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
        const tv = await q.query<{ blueprint_hash: string }>('SELECT blueprint_hash FROM blueprint.template_versions WHERE id = $1 AND organization_id = $2', [b.template_version_id, organizationId]);
        if (!tv.rows[0] || tv.rows[0].blueprint_hash !== b.blueprint_hash) return problem(422, 'BLUEPRINT_HASH_MISMATCH', 'blueprint_hash does not match the template version', correlationId);
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

  const ev = await handleEvidence(req, path, deps, correlationId);
  if (ev) return ev;

  return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
}
