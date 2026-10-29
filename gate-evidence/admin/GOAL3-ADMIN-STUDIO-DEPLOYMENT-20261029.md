# Goal 3 — Admin Studio deployment evidence

Date: 2026-10-29

## Verified

- Repository commit `0bac439` contains the Admin Studio workflow controls.
- Admin Studio build passed locally with `npm run build`.
- Vercel project `binafield-admin-studio` was created and deployed successfully.
- Production deployment `dpl_CZs3KCbFxca5qYUXbVu7eZPCTBeg` reached `READY`.
- Admin Studio production page returned HTTP 200 and served the Goal 3 bundle.
- API commit `30ef6a2` adds the Vercel build script and deployed successfully.
- API deployment `dpl_FdEZLoy5KQUuiFAMUK9VvhbUCeTt` reached `READY` and restored the production alias.
- API unit suite remains 50/50 and typecheck passes.

## Pending live acceptance

## Live smoke acceptance

The authenticated local smoke runner passed all checks:

```json
{
  "pass": true,
  "checks": [
    "organisation context",
    "template creation",
    "version validate and publish",
    "assignment issued and persisted",
    "submission review queue readable",
    "supervisor decision and persisted outcome"
  ],
  "template_id": "8de0e6eb-f764-44c3-9bd5-78d2f4076939",
  "version_id": "48705464-ebc3-4005-bcd1-c43fa7a01dc8",
  "deployment_id": "6c53d871-f1d3-46f4-a300-6fd7c259b37a",
  "assignment_id": "e899c1c7-01d5-4ca8-9cca-f42b632d53fe"
}
```

The latest Admin Studio commit `150d987` also deployed successfully as `READY` deployment `dpl_7USSiKv3psGo9osAtLsdsYFQYaj5`.
