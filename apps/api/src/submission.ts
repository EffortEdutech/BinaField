import { createHash } from 'node:crypto';

/** Canonical JSON used for payload_hash: keys sorted recursively, no whitespace, UTF-8 (matches tools/batch6/vs01_field_stage.py). */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  const o = v as Record<string, unknown>;
  return '{' + Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonicalJson(o[k])).join(',') + '}';
}
export const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
export const payloadHashOf = (payload: unknown) => sha256Hex(canonicalJson(payload));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;

export interface AttemptBody {
  attempt_id: string; session_id: string; assignment_id: string; assignment_revision_used: number;
  template_version_id: string; blueprint_hash: string; payload: Record<string, unknown>; payload_hash: string;
  evidence_manifest: unknown[]; device_id: string; client_submitted_at: string; client_completed_at: string | null;
}

/** Shape check against the sync-protocol OfflineSubmissionAttempt contract. Returns the first problem or the typed body. */
export function parseAttempt(raw: unknown, organizationId: string): { ok: true; body: AttemptBody } | { ok: false; detail: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, detail: 'Body must be a JSON object' };
  const b = raw as Record<string, unknown>;
  for (const k of ['attempt_id', 'session_id', 'assignment_id', 'template_version_id', 'device_id']) if (typeof b[k] !== 'string' || !UUID.test(b[k] as string)) return { ok: false, detail: `${k} must be a UUID` };
  if (b.organization_id !== undefined && b.organization_id !== organizationId) return { ok: false, detail: 'organization_id does not match the path' };
  for (const k of ['blueprint_hash', 'payload_hash']) if (typeof b[k] !== 'string' || !HASH.test(b[k] as string)) return { ok: false, detail: `${k} must be 64 lowercase hex characters` };
  if (!Number.isInteger(b.assignment_revision_used) || (b.assignment_revision_used as number) < 1) return { ok: false, detail: 'assignment_revision_used must be a positive integer' };
  if (!b.payload || typeof b.payload !== 'object' || Array.isArray(b.payload)) return { ok: false, detail: 'payload must be an object' };
  if (!Array.isArray(b.evidence_manifest)) return { ok: false, detail: 'evidence_manifest must be an array' };
  if (typeof b.client_submitted_at !== 'string' || Number.isNaN(Date.parse(b.client_submitted_at))) return { ok: false, detail: 'client_submitted_at must be a date-time' };
  return { ok: true, body: b as unknown as AttemptBody };
}
