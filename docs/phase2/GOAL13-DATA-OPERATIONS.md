# Goal 13 — Cleanup and operational data management

Status: IMPLEMENTED LOCALLY  
Date: 2026-10-30

## Scope

Goal 13 keeps operational data safe and usable as smoke tests and pilot activity accumulate. It does not delete records automatically and it does not run cleanup against production as part of an application request.

## Implemented API controls

The organisation list endpoints now accept bounded pagination:

- `limit` — defaults to 25 and is capped at 100;
- `offset` — defaults to 0;
- `next_cursor` — contains the next offset when another page is available.

The following filters are available:

- devices: `lifecycle_state`;
- deployments: `lifecycle_state`;
- assignments: `lifecycle_state`, `project_id`;
- submissions: `status`, `project_id`.

All filters remain tenant-scoped and authorization is evaluated before the query. Invalid filter values are ignored rather than widening access. The default page size prevents the Admin Studio from loading the entire organisation history on every refresh.

## Production-safe data policy

1. Smoke tests are write operations and must run only with a dedicated test token and an explicitly identified pilot/test organisation.
2. Smoke-generated records are identified by their names/subjects and smoke evidence IDs; they must never be removed by a web request or an automatic deployment hook.
3. Cleanup is an operator-approved, reviewed SQL operation with a bounded target set and a backup/export taken first.
4. Pilot records and real submissions are retained. If a record is malformed, quarantine or supersede it; do not delete the original evidence.
5. Seed data must be deterministic and idempotent. Re-running a seed operation must update or reuse the same known keys, not create another deployment/assignment set.

## Cleanup runbook

- Export assignments, submissions, evidence metadata, and audit records for the target organisation.
- Confirm the target IDs and that they are smoke/test records, not pilot records.
- Review the proposed SQL with the project owner before execution.
- Execute in a transaction, record affected IDs, and verify counts afterward.
- Keep the export and SQL result in `gate-evidence/supabase/`.
- Refresh Admin Studio and confirm pagination, filters, and audit history remain coherent.

## Acceptance evidence

- API tests: `apps/api` — 52 tests passed.
- The Admin Studio remains compatible with the existing `items` response shape.
- Existing records remain readable; no destructive cleanup was run by this change.

## Deferred

The next increment should add a dedicated, operator-only seed command using deterministic keys and a preview mode. It should be run manually, never from the browser and never automatically during deployment.
