import type { Db } from './db';
import { bearerFrom, type TokenVerifier } from './auth';
import { loadPrincipal } from './principal';

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
    const db = await deps.db.ping();
    return json(db ? 200 : 503, { status: db ? 'ok' : 'degraded', database: db }, { 'x-correlation-id': correlationId });
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

  return problem(404, 'RESOURCE_NOT_FOUND', 'Not found', correlationId);
}
