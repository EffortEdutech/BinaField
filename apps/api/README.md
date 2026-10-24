# api

Sprint 1 runtime (v0.8.0). A Web-standard `handle(Request) -> Response` core in `src/`, deployed as one Vercel function (`api/index.ts`).

- `GET /api/health` - database reachability, no auth.
- `GET /api/organizations/{organization_id}/me` - verifies the Supabase Auth token, resolves the user to an `iam` membership under the path organisation's tenant context and returns permissions, scopes and device state. See `docs/adr/ADR-0005-supabase-auth-identity-mapping.md`.

Environment (host only, never committed): `DATABASE_URL` (Session pooler string for the `postgres` user; requests run `SET LOCAL ROLE app_runtime`) and `SUPABASE_URL` (project URL, for the token JWKS).

Tests: `pnpm test` (fake database). The SQL itself was probed on BinaField-test under `app_runtime` with row-level security (rolled back).

`modules/` keeps the frozen module homes from Phase 1.
