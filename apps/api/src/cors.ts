// CORS for the browser clients (field PWA, later admin web). Origins come from the CORS_ORIGINS environment variable (comma separated).
const DEFAULT_ORIGINS = ['https://bina-field.vercel.app', 'http://localhost:3031', 'http://127.0.0.1:3031'];
export function allowedOrigins(env: string | undefined): string[] {
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_ORIGINS;
}
const HEADERS = 'authorization, content-type, x-device-id, x-correlation-id, idempotency-key';

function corsHeaders(origin: string | null, origins: string[]): Record<string, string> {
  if (!origin || !origins.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-expose-headers': 'x-correlation-id' };
}
/** Answers a preflight request, or returns null when the request is not a preflight. */
export function preflight(req: Request, origins: string[]): Response | null {
  if (req.method !== 'OPTIONS') return null;
  const h = corsHeaders(req.headers.get('origin'), origins);
  if (!h['access-control-allow-origin']) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: { ...h, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': HEADERS, 'access-control-max-age': '600' } });
}
export function withCors(req: Request, res: Response, origins: string[]): Response {
  const h = corsHeaders(req.headers.get('origin'), origins);
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}
