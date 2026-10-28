// Vercel entry point. All /api/* requests are rewritten here (see vercel.json).
import { handle } from '../src/handler';
import { createPgDb } from '../src/db';
import { createSupabaseVerifier } from '../src/auth';
import { createSupabaseStorage } from '../src/storage';
import { allowedOrigins, preflight, withCors } from '../src/cors';

let deps: Parameters<typeof handle>[1] | null = null;
function getDeps() {
  if (!deps) {
    const url = process.env.DATABASE_URL, supabase = process.env.SUPABASE_URL;
    if (!url || !supabase) throw new Error('MISSING_ENV');
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY; // storage only, see ADR-0006
    deps = { db: createPgDb(url), verify: createSupabaseVerifier(supabase, process.env.SUPABASE_ANON_KEY), storage: secret ? createSupabaseStorage(supabase, secret) : undefined };
  }
  return deps;
}

async function run(request: Request) {
  const origins = allowedOrigins(process.env.CORS_ORIGINS);
  try { return withCors(request, await handle(request, getDeps()), origins); }
  catch { return new Response(JSON.stringify({ code: 'SERVICE_UNAVAILABLE', status: 503, retryable: true }), { status: 503, headers: { 'content-type': 'application/problem+json' } }); }
}
const entry = (request: Request) => preflight(request, allowedOrigins(process.env.CORS_ORIGINS)) ?? run(request);
export const GET = entry;
export const POST = entry;
export const OPTIONS = entry;
