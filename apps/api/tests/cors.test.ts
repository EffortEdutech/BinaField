import { describe, expect, it } from 'vitest';
import { allowedOrigins, preflight, withCors } from '../src/cors';

const O = ['https://bina-field.vercel.app'];
const req = (method: string, origin?: string) => new Request('https://api.test/api/x', { method, headers: origin ? { origin } : {} });

describe('cors', () => {
  it('answers a preflight from an allowed origin with the headers the PWA sends', () => {
    const r = preflight(req('OPTIONS', 'https://bina-field.vercel.app'), O)!;
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe('https://bina-field.vercel.app');
    for (const h of ['authorization', 'x-device-id', 'idempotency-key', 'content-type']) expect(r.headers.get('access-control-allow-headers')).toContain(h);
  });
  it('refuses a preflight from another origin and ignores non-preflight requests', () => {
    expect(preflight(req('OPTIONS', 'https://evil.test'), O)!.status).toBe(403);
    expect(preflight(req('GET', 'https://bina-field.vercel.app'), O)).toBeNull();
  });
  it('adds the origin header only for allowed origins', () => {
    expect(withCors(req('GET', 'https://bina-field.vercel.app'), new Response('x'), O).headers.get('access-control-allow-origin')).toBe('https://bina-field.vercel.app');
    expect(withCors(req('GET', 'https://evil.test'), new Response('x'), O).headers.get('access-control-allow-origin')).toBeNull();
  });
  it('reads the origin list from the environment', () => {
    expect(allowedOrigins('https://a.test, https://b.test')).toEqual(['https://a.test', 'https://b.test']);
    expect(allowedOrigins(undefined)).toContain('https://bina-field.vercel.app');
  });
});
