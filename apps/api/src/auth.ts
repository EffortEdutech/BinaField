import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';

export interface VerifiedToken { sub: string; authenticationStrength: string }
export type TokenVerifier = (bearer: string) => Promise<VerifiedToken>;

/** Verifies a Supabase Auth access token against the project's JWKS (ADR-0005). */
export function createSupabaseVerifier(supabaseUrl: string, anonKey?: string): TokenVerifier {
  const base = supabaseUrl.replace(/\/+$/, '');
  const jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  return async (bearer) => {
    // Projects still on the legacy shared-secret (HS256) signing key publish no public key, so ask Supabase Auth itself.
    if (decodeProtectedHeader(bearer).alg === 'HS256') {
      if (!anonKey) throw new Error('NO_ANON_KEY');
      const r = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${bearer}` } });
      if (!r.ok) throw new Error('TOKEN_REJECTED');
      const u = (await r.json()) as { id?: string };
      if (!u.id) throw new Error('NO_SUBJECT');
      return { sub: u.id, authenticationStrength: 'PASSWORD' };
    }
    const { payload } = await jwtVerify(bearer, jwks, { issuer: `${base}/auth/v1`, audience: 'authenticated' });
    if (!payload.sub) throw new Error('NO_SUBJECT');
    const amr = Array.isArray(payload.amr) ? payload.amr.length : 0;
    return { sub: payload.sub, authenticationStrength: amr > 1 ? 'MFA' : 'PASSWORD' };
  };
}

export function bearerFrom(header: string | null): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(header ?? '');
  return m ? m[1]!.trim() : null;
}
