# Goal 1 — Production API hardening

Date: 2026-10-28  
Status: **IN PROGRESS**

## Reproducible baseline

Environment: Windows PowerShell, Node/npm, `apps/api`.

Commands run:

```text
npm install --no-package-lock --ignore-scripts
npm test
npm run typecheck
```

Observed result:

- Dependency installation completed: 78 packages added, 7 npm audit findings reported (4 moderate, 1 high, 2 critical).
- API tests: **PASS** — 6 test files, 45 tests.
- TypeScript typecheck: **PASS**.
- `npm audit fix --force` was not run because forced upgrades could introduce unreviewed breaking changes.

## Live deployment check

Deployment: `https://binafield-api.vercel.app`  
Checked: 2026-10-28

```text
GET /api/health
HTTP 200
{"status":"ok","database":true}
```

The connected Vercel access path reached the deployment and returned a correlation ID. A request to `/api/organizations/{organization_id}/me` without a bearer token was blocked upstream by Vercel Authentication (`deployment_authentication_required`) before reaching the API. Therefore this is not yet evidence of the API's `AUTHENTICATION_REQUIRED` response, and bearer-token negative-path coverage remains open.

The temporary shareable URL was then exercised locally against the same route. It reached the API and returned HTTP `401` (no bearer token), confirming the unauthenticated boundary is live. The response body was not emitted by PowerShell's exception formatter; authenticated checks remain outstanding.

Authenticated `GET /api/organizations/a0000000-0000-4000-8000-000000000001/me` was then executed from the user's local PowerShell session with the bearer token kept local. It returned HTTP `200`. The response confirmed the requested organization, an `ACTIVE` membership, a populated membership ID, and the expected production permission set. It also confirmed `device_state: NOT_REGISTERED` and `device_id: null`; identity and tenant resolution are therefore validated, while device-bound field operations remain pending device registration.

## Scope covered by the local suite

The tests cover authentication and principal resolution, tenant context, device state, delta and acknowledgement cursor rules, submission validation and idempotency, evidence upload/finalization behavior, and contract-shaped responses.

## Remaining production evidence

The local suite uses a fake database and verifier. It does not prove behavior against the deployed API. The live API evidence still needs authenticated negative-path requests for:

- cross-tenant concealment;
- revoked membership;
- suspended or unregistered device;
- submission idempotency replay/conflict;
- evidence upload authorization and hash/size failure;
- delta pull and acknowledgement persistence.

The previously recorded deployment URL was not DNS-resolvable from the agent environment, so this live portion remains open until a reachable deployment URL or network path is available.
