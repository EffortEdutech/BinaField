import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface VerifiedToken { sub: string; authenticationStrength: string }
export type TokenVerifier = (bearer: string) => Promise<VerifiedToken>;

/** Verifies a Supabase Auth access token against the project's JWKS (ADR-0005). */
export function createSupabaseVerifier(supabaseUrl: string): TokenVerifier {
  const base = supabaseUrl.replace(/\/+$/, '');
  const jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  return async (bearer) => {
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
