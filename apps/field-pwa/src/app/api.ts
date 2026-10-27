import { accessToken } from './auth';
import type { Settings } from './config';

export interface ApiResult<T = any> { status: number; body: T | null; networkError: boolean }

/** One call to the BinaField API. A network failure is reported as status 0, never thrown, so callers can queue and retry. */
export async function api<T = any>(set: Settings, method: 'GET' | 'POST', path: string, opts: { body?: unknown; idempotencyKey?: string } = {}): Promise<ApiResult<T>> {
  const tok = await accessToken(set);
  const headers: Record<string, string> = { 'x-device-id': set.deviceId, 'x-correlation-id': crypto.randomUUID() };
  if (tok) headers.authorization = `Bearer ${tok}`;
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  try {
    const r = await fetch(`${set.apiBase}/organizations/${set.organizationId}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    let body: any = null; try { body = await r.json(); } catch { /* empty body */ }
    return { status: r.status, body, networkError: false };
  } catch { return { status: 0, body: null, networkError: true }; }
}
