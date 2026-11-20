# Goal 30 hardening baseline

Date: 2026-11-17  
Status: **COMPLETE — conditional release classification**

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
| Production API health | PASS | Connected production probe returned HTTP 200, `{\"status\":\"ok\",\"database\":true}` |
| Current API deployment | READY | `dpl_2BGeVr7q1ag3rquEfAzViqPqsxtU`, commit `352b1d9` |
| Current Admin Studio deployment | READY | `dpl_6uHq8kWcAGXzMw5NznHcfkm9CAaC`, commit `352b1d9` |
| Current Field PWA deployment | READY | `dpl_2fXbDNJoGjtvL1MLotwVuqVzkT6y`, commit `352b1d9` |
| Goals 17–20 checks | PASS | 12/12 checks |
| Goal 24 checks | PASS | 10/10 checks |
| Goal 27 source audit | PASS | 15/15 checks; no legacy technical UI |
| Admin Studio build | PASS | TypeScript and Vite production build |
| Field PWA contract checks | PASS | 10/10 checks |
| Field PWA build | PASS | TypeScript and Vite/PWA production build |
| API tests | PASS | 7 files, 53 tests |
| API typecheck | PASS | `npm run typecheck` |
| Admin authenticated smoke | PASS | Organisation, administration, exports, template/version, assignment, review, and outcome persistence |
| Field PWA authenticated smoke | PASS | Email/password, organisation, role, device, and session refresh |
| Kebuniti live verification | PASS | `ACCEPTED`; report ready; 2 evidence previews; calculations and provenance present |

## Evidence still required

- Authenticated API, Admin Studio, and Field PWA health/readiness probes from a network-enabled runner.
- One reconciled Admin → PWA → sync → review → final-report run with linked IDs.
- Current pilot execution log and release manifest updated from the 2026-10-29 freeze records.
- Final risk review and release classification: `READY`, `CONDITIONAL`, or `NOT READY`.

## Previous blocker resolution

The production API database outage recorded in commit `352b1d9` is resolved. The connected production probe returns HTTP 200 with `database:true`. Authenticated Admin and Field PWA smoke checks and the linked Kebuniti acceptance verification are green. The release remains CONDITIONAL only because the real-device Android/iPhone compatibility matrix is deferred.

## Environment note

The local `pilot:readiness` command currently reports `fetch failed` for the three production URLs. That result is not treated as a product failure until repeated from a network-enabled or authenticated runner; it is an evidence gap requiring follow-up.

Real-device Android/iPhone compatibility remains a documented deferred capability and must not be claimed as verified by this release.
