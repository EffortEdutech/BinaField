# Goal 9 — Supervisor Operations, Dashboards, Audit, and Exports

Date: 2026-10-30
Status: IMPLEMENTED — LIVE AUTHENTICATED SMOKE PENDING

## Scope delivered

- Supervisor dashboard with assignment/submission status summaries.
- Review queue status and project filtering.
- Permission-aware individual and bulk review actions.
- Submission outcome-history view backed by audit events.
- Audit-event retrieval with action and target filters.
- JSON/CSV exports for assignments, submissions, evidence metadata, and audit events.
- Organisation/project-scoped queries and permission checks.

## Source and deployment evidence

- API implementation: commit `b30d352`.
- Dashboard implementation: commit `4f7973b`.
- Smoke export coverage: commit `0f78033`.
- API production deployment: `dpl_5AnnxKgvHgV5D9rs6rLDuDghTA5p` — READY.
- Admin Studio production deployment: `dpl_9NCHVt5XPBQgZVtMDBLgwuByExhh` — READY.

## Automated verification

- API test suite: 52/52 passed.
- API TypeScript typecheck: passed.
- Admin Studio production build: passed.

## Remaining gate

Run the authenticated `npm run smoke` script from `apps/admin-web` with `BINAField_TOKEN` set. The script verifies organisation administration reads, supervisor JSON exports, template/version workflow, assignment persistence, submission review queue, and supervisor outcome persistence.
