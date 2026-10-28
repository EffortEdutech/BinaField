import { api } from './api';
import { canonicalJson, sha256Text } from './canonical';
import type { Settings } from './config';
import { enqueue } from './outbox';
import { now, q, tx, type Tx } from './store';

export interface PullResult { ok: boolean; batches: number; applied: number; reason?: string }
type Entry = { delta_id: string; entity_type: string; entity_id: string; entity_revision: number | null; change_type: 'UPSERT' | 'TOMBSTONE' | 'OUTCOME' | 'POLICY'; occurred_at: string; payload: any };

async function currentCursor(set: Settings): Promise<string> {
  const r = await q<{ current_cursor: string }>('SELECT current_cursor FROM sync_cursor WHERE organization_id=? AND device_id=?', [set.organizationId, set.deviceId]);
  return r[0]?.current_cursor ?? '';
}

/** Applies one entry inside the caller's transaction. Returns the item's apply state. */
async function applyEntry(t: Tx, org: string, e: Entry, set: Settings): Promise<{ state: string; error?: string }> {
  if (e.change_type === 'UPSERT' && e.entity_type === 'assignment') {
    const p = e.payload, extra = p.payload ?? {};
    const have = await t.exec<{ authoritative_revision: number }>('SELECT authoritative_revision FROM assignment_cache WHERE organization_id=? AND assignment_id=?', [org, e.entity_id]);
    if (have[0] && have[0].authoritative_revision >= p.assignment_revision) return { state: 'IGNORED_STALE' };
    if (extra.blueprint) {
      // The form definition is accepted only if it hashes to the value the server published.
      const h = await sha256Text(canonicalJson(extra.blueprint));
      if (h !== p.blueprint_hash) return { state: 'FAILED', error: 'BLUEPRINT_HASH_MISMATCH' };
      await t.exec(`INSERT OR REPLACE INTO template_package(organization_id,template_version_id,template_id,blueprint_json,blueprint_hash,schema_version,component_registry_version,integrity_verified,downloaded_at) VALUES (?,?,?,?,?,?,?,1,?)`,
        [org, p.template_version_id, p.template_version_id, JSON.stringify(extra.blueprint), p.blueprint_hash, '1.0', '1.0', now()]);
    }
    await t.exec(`INSERT OR REPLACE INTO assignment_cache(organization_id,assignment_id,project_id,deployment_id,template_version_id,authoritative_revision,lifecycle_state,assignee_json,subject_json,due_at,priority,server_updated_at,received_at,local_execution_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, COALESCE((SELECT local_execution_status FROM assignment_cache WHERE organization_id=? AND assignment_id=?),'NOT_STARTED'))`,
      [org, e.entity_id, extra.project_id ?? '', extra.deployment_id ?? '', p.template_version_id, p.assignment_revision, extra.lifecycle_state ?? 'ASSIGNED', '{}', JSON.stringify(extra.operational_subject_ref ?? {}), extra.due_at ?? null, extra.priority ?? null, e.occurred_at, now(), org, e.entity_id]);
    return { state: 'APPLIED' };
  }
  if (e.change_type === 'TOMBSTONE' && e.entity_type === 'assignment') {
    const p = e.payload;
    await t.exec('INSERT OR IGNORE INTO assignment_tombstone(organization_id,assignment_id,authoritative_revision,tombstone_type,effective_at,received_at) VALUES (?,?,?,?,?,?)', [org, e.entity_id, p.authoritative_revision ?? 0, p.tombstone_type, p.effective_at ?? e.occurred_at, now()]);
    const live = await t.exec('SELECT 1 x FROM submission_session WHERE organization_id=? AND assignment_id=? AND lifecycle_state IN (\'CREATED\',\'IN_PROGRESS\',\'COMPLETE\')', [org, e.entity_id]);
    if (live.length) {
      // Local work exists on a withdrawn assignment: keep it and ask the person, never silently drop it.
      await t.exec(`INSERT INTO reconciliation_case(organization_id,case_id,device_id,entity_type,entity_id,conflict_type,created_at,severity,allowed_actions_json,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [org, crypto.randomUUID(), set.deviceId, 'assignment', e.entity_id, 'ASSIGNMENT_WITHDRAWN_WITH_LOCAL_WORK', now(), 'BLOCKING', JSON.stringify(['KEEP_LOCAL', 'DISCARD_LOCAL']), 'OPEN']);
      return { state: 'RECONCILIATION_REQUIRED' };
    }
    await t.exec('DELETE FROM assignment_cache WHERE organization_id=? AND assignment_id=?', [org, e.entity_id]);
    return { state: 'APPLIED' };
  }
  return { state: 'APPLIED' };   // OUTCOME and POLICY entries need no local change yet
}

/** Pull until the server has nothing newer. The cursor moves only after every item of a batch is applied, in the same transaction; the acknowledgement follows. */
export async function pull(set: Settings): Promise<PullResult> {
  let batches = 0, applied = 0;
  for (let guard = 0; guard < 50; guard++) {
    const prior = await currentCursor(set);
    const r = await api(set, 'GET', `/field/delta${prior ? `?cursor=${encodeURIComponent(prior)}` : ''}`);
    if (r.networkError) return { ok: false, batches, applied, reason: 'OFFLINE' };
    if (r.status !== 200) return { ok: false, batches, applied, reason: r.body?.code ?? `HTTP_${r.status}` };
    const entries: Entry[] = r.body.entries ?? [];
    const next: string = r.body.next_cursor;
    if (entries.length === 0) return { ok: true, batches, applied };
    const batchId = crypto.randomUUID(); let failed = null as string | null;
    await tx(async (t) => {
      const org = set.organizationId;
      await t.exec('INSERT INTO sync_inbox(organization_id,inbox_batch_id,prior_cursor,proposed_next_cursor,payload_hash,received_at,apply_state) VALUES (?,?,?,?,?,?,?)', [org, batchId, prior, next, await sha256Text(canonicalJson(entries)), now(), 'APPLYING']);
      let ord = 0;
      for (const e of entries) {
        const res = await applyEntry(t, org, e, set);
        if (res.state === 'FAILED') failed = res.error ?? 'APPLY_FAILED';
        await t.exec('INSERT OR REPLACE INTO sync_inbox_item(organization_id,inbox_batch_id,delta_id,ordinal,entity_type,entity_id,authoritative_revision,change_type,occurred_at,payload_json,apply_state,apply_error) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [org, batchId, e.delta_id, ord++, e.entity_type, e.entity_id, e.entity_revision, e.change_type, e.occurred_at, JSON.stringify(e.payload), res.state, res.error ?? null]);
      }
      if (failed) { throw new Error(failed); }   // rolls back: the cursor does not move
      await t.exec('UPDATE sync_inbox SET apply_state=? WHERE organization_id=? AND inbox_batch_id=?', ['APPLIED', org, batchId]);
      await t.exec('INSERT INTO sync_cursor(organization_id,device_id,current_cursor,last_applied_delta_id,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(organization_id,device_id) DO UPDATE SET current_cursor=excluded.current_cursor,last_applied_delta_id=excluded.last_applied_delta_id,updated_at=excluded.updated_at',
        [org, set.deviceId, next, entries[entries.length - 1]!.delta_id, now()]);
    }).catch((e: Error) => { failed = e.message; });
    if (failed) return { ok: false, batches, applied, reason: failed };
    batches++; applied += entries.length;
    await enqueue({ type: 'SYNC_ACK', entityType: 'sync_cursor', entityId: next, payload: { cursor: next }, idempotencyKey: `ack-${set.deviceId}-${next}` }, set);
  }
  return { ok: true, batches, applied };
}

export const listAssignments = () => q<{ assignment_id: string; template_version_id: string; subject_json: string; lifecycle_state: string; local_execution_status: string; authoritative_revision: number; due_at: string | null }>(
  'SELECT assignment_id,template_version_id,subject_json,lifecycle_state,local_execution_status,authoritative_revision,due_at FROM assignment_cache ORDER BY server_updated_at DESC');
