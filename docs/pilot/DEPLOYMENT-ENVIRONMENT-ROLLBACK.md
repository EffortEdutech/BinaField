# Deployment, environment, and rollback guide

## Required environments

API production requires these Vercel environment variables:

- `DATABASE_URL` — Supabase session-pooler connection string.
- `SUPABASE_URL` — Supabase project URL used for JWT verification.
- `SUPABASE_ANON_KEY` — public verifier configuration.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only evidence storage access.
- `CORS_ORIGINS` — approved Admin Studio and Field PWA origins.

Admin Studio keeps the bearer token in the browser session only. It does not persist or commit the token.

## Deployment

1. Merge or push the reviewed commit to `main`.
2. Deploy API from the repository root `apps/api`; verify `npm run build` and the Vercel deployment state `READY`.
3. Deploy Admin Studio from root `apps/admin-web`; verify `npm run build` and state `READY`.
4. Run `npm run smoke` from `apps/admin-web` with a fresh local `BINAField_TOKEN`.
5. Record deployment IDs, commit SHA, smoke output, and any pilot data IDs in the evidence folder.

## Rollback

1. Stop issuing new assignments and tell field users to keep offline work local.
2. Identify the last known-good Vercel deployment and promote it through the Vercel deployment controls.
3. Do not roll back database migrations or mutate published template versions; published content is immutable.
4. Recheck `/api/health`, Admin Studio load, and the Field PWA sync path.
5. Reconcile any submissions received during the incident using idempotency keys and the submission outcome API.
6. Record incident time, deployment IDs, affected assignments, corrective action, and reopening approval.
