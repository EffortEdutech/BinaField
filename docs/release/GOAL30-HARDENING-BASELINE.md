# Goal 30 hardening baseline

Date: 2026-11-17  
Status: **BLOCKED — production database configuration is unavailable**

This record starts the final product-hardening and release audit. It deliberately separates repository evidence, deployment evidence, and checks that require authenticated or network-enabled execution.

## Verified at baseline

| Area | Result | Evidence |
|---|---|---|
| Admin Studio source audit | PASS | `apps/admin-web/scripts/check-goal27.mjs` |
| Goals 17–20 source checks | PASS | `apps/admin-web/scripts/check-goals17-20.mjs` |
| Goal 24 report checks | PASS | `apps/admin-web/scripts/check-goal24.mjs` |
| Admin Studio build and type check | PASS | `apps/admin-web` `npm run build` |
| Kebuniti contract checks | PASS | `apps/field-pwa` `npm run check:kebuniti` |
| Field PWA production commit | PUSHED | `f5a34506119691dbc904734727a64de8a6997245` |
| Field PWA deployment | READY | Vercel deployment `dpl_3GrtHvYgYyccdxFmrm3Px8txvZf2`, production alias `bina-field.vercel.app`, commit `1f6cb26` |
| Admin Studio deployment | READY | Vercel deployment `dpl_ANsKY3fo6WuFZSooFWb8umqxNpM3`, production alias `binafield-admin-studio.vercel.app`, commit `1f6cb26` |
| API deployment | READY | Vercel deployment `dpl_EacYWUYcHj7Frqyo9vruDiXTfJed`, production alias `binafield-api.vercel.app`, commit `1f6cb26` |
| API typecheck | PASS | `apps/api` `npm run typecheck` |
| API tests | PASS | 7 files, 53 tests |
| Field PWA build | PASS | `apps/field-pwa` `npm run build` |
| Production API health | BLOCKED | `GET https://binafield-api.vercel.app/api/health` returns `503`, `database:false`, reason `XX000` |

## Evidence still required

- Authenticated API, Admin Studio, and Field PWA health/readiness probes from a network-enabled runner.
- One reconciled Admin → PWA → sync → review → final-report run with linked IDs.
- Current pilot execution log and release manifest updated from the 2026-10-29 freeze records.
- Final risk review and release classification: `READY`, `CONDITIONAL`, or `NOT READY`.

## Current release blocker

The API deployment is READY, but its configured Supabase URL is `https://plpaixewllldutjrjljg.supabase.co`, whose hostname currently does not resolve. The connected Supabase account does not list that project. The available `gumlaaqfxxkdlwuusfhv` project is a WorkLedger database without BinaField schemas and must not be used for this tenant. Restore the BinaField Supabase project or provide the correct BinaField `SUPABASE_URL`, `DATABASE_URL`, and server-only storage configuration, then redeploy and rerun the authenticated workflow.

## Environment note

The local `pilot:readiness` command currently reports `fetch failed` for the three production URLs. That result is not treated as a product failure until repeated from a network-enabled or authenticated runner; it is an evidence gap requiring follow-up.

Real-device Android/iPhone compatibility remains a documented deferred capability and must not be claimed as verified by this release.
