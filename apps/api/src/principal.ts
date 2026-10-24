import type { Queryable } from './db';
import { setTransactionTenantContext } from '../../../packages/security/src/tenant-context';
import type { DeviceState, PrincipalContext, PrincipalState, ScopeBinding } from '../../../packages/security/src/authorization';

const POLICY_VERSION = 'sprint1-1';

export type LoadResult =
  | { ok: true; principal: PrincipalContext; userId: string; membershipId: string }
  | { ok: false; reason: 'NO_USER' | 'NO_MEMBERSHIP' };

/**
 * Resolves a verified Supabase subject to a BinaField principal inside the caller's transaction (ADR-0005).
 * The tenant context is taken from the request path, so row-level security hides memberships of other organisations.
 */
export async function loadPrincipal(q: Queryable, args: { sub: string; organizationId: string; deviceId: string | null; correlationId: string; authenticationStrength: string }): Promise<LoadResult> {
  await setTransactionTenantContext(q as never, { organizationId: args.organizationId, principalType: 'HUMAN', correlationId: args.correlationId });

  const u = await q.query<{ id: string }>('SELECT id FROM iam.users WHERE identity_subject = $1', [args.sub]);
  if (!u.rows[0]) return { ok: false, reason: 'NO_USER' };
  const userId = u.rows[0].id;

  const m = await q.query<{ id: string; lifecycle_state: string }>('SELECT id, lifecycle_state FROM iam.memberships WHERE user_id = $1 AND organization_id = $2', [userId, args.organizationId]);
  if (!m.rows[0]) return { ok: false, reason: 'NO_MEMBERSHIP' };
  const membershipId = m.rows[0].id;
  await setTransactionTenantContext(q as never, { organizationId: args.organizationId, principalType: 'HUMAN', membershipId, correlationId: args.correlationId });

  const perms = await q.query<{ permission_key: string }>(
    `SELECT DISTINCT rp.permission_key FROM iam.membership_roles mr JOIN iam.role_permissions rp ON rp.role_id = mr.role_id
      WHERE mr.membership_id = $1 AND mr.organization_id = $2`, [membershipId, args.organizationId]);
  const roles = await q.query<{ id: string; scope_mode: string }>('SELECT id, scope_mode FROM iam.membership_roles WHERE membership_id = $1 AND organization_id = $2', [membershipId, args.organizationId]);
  const projects = await q.query<{ membership_role_id: string; project_id: string }>('SELECT membership_role_id, project_id FROM iam.membership_project_scopes WHERE organization_id = $1', [args.organizationId]);
  const scopes: ScopeBinding[] = roles.rows.map((r) => r.scope_mode === 'ORG_WIDE'
    ? { scopeMode: 'ORG_WIDE', projectIds: [] }
    : { scopeMode: 'PROJECT_RESTRICTED', projectIds: projects.rows.filter((p) => p.membership_role_id === r.id).map((p) => p.project_id) });

  let deviceState: DeviceState = 'NOT_REGISTERED';
  if (args.deviceId) {
    const d = await q.query<{ lifecycle_state: string }>('SELECT lifecycle_state FROM iam.registered_devices WHERE id = $1 AND membership_id = $2 AND organization_id = $3', [args.deviceId, membershipId, args.organizationId]);
    const s = d.rows[0]?.lifecycle_state;
    // REGISTERED (not yet activated) is treated as not usable until an activation flow exists.
    deviceState = s === 'ACTIVE' ? 'ACTIVE' : s === 'SUSPENDED' ? 'SUSPENDED' : s === 'REVOKED' ? 'REVOKED' : 'NOT_REGISTERED';
  }

  const membershipState: PrincipalState = m.rows[0].lifecycle_state === 'ACTIVE' ? 'ACTIVE' : m.rows[0].lifecycle_state === 'REVOKED' ? 'REVOKED' : 'INACTIVE';
  return {
    ok: true, userId, membershipId,
    principal: {
      principalType: 'HUMAN', organizationId: args.organizationId, membershipState,
      deviceId: args.deviceId, deviceState,
      permissions: new Set(perms.rows.map((r) => r.permission_key)), scopes,
      recentAuth: false, authenticationStrength: args.authenticationStrength,
      securityPolicyVersion: POLICY_VERSION, correlationId: args.correlationId
    }
  };
}
