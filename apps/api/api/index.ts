// Vercel entry point. All /api/* requests are rewritten here (see vercel.json).
import { handle } from '../src/handler';
import { createPgDb } from '../src/db';
import { createSupabaseVerifier } from '../src/auth';

let deps: Parameters<typeof handle>[1] | null = null;
function getDeps() {
  if (!deps) {
    const url = process.env.DATABASE_URL, supabase = process.env.SUPABASE_URL;
    if (!url || !supabase) throw new Error('MISSING_ENV');
    deps = { db: createPgDb(url), verify: createSupabaseVerifier(supabase) };
  }
  return deps;
}

async function run(request: Request) {
  try { return await handle(request, getDeps()); }
  catch { return new Response(JSON.stringify({ code: 'SERVICE_UNAVAILABLE', status: 503, retryable: true }), { status: 503, headers: { 'content-type': 'application/problem+json' } }); }
}
export const GET = run;
export const POST = run;
