export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', 'cache-control': 'no-store', ...extra } });
export function problem(status: number, code: string, detail: string, correlationId: string, retryable = false) {
  return json(status, { type: `https://contracts.binafield.io/problem/${code}`, title: code, status, code, detail, correlation_id: correlationId, retryable }, { 'x-correlation-id': correlationId });
}
