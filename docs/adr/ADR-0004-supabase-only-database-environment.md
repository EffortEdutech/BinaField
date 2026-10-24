# ADR-0004: Supabase (PostgreSQL 17) is the only database environment from v0.7

- Status: Accepted 2026-10-24 (approved by eff)
- Supersedes (operationally, not by edit): the Docker / PostgreSQL 16 + PostGIS 3.4 live-gate route in
  `docs/implementation/phase1-b06b-live-closure.md`, `docs/implementation/phase1-b06-external-closure-runbook.md`,
  `docker-compose.yml`, and the "psql not required" statements in the sealed reports.
- Does not change: ADR-0002 (PostgreSQL + PostGIS, forward-only SQL), the 18 released migrations, the six test files,
  or any sealed gate JSON.

## Context
The sealed v0.6.1 repository proves the database layer on PostgreSQL 16.4 + PostGIS 3.4 inside Docker (live run observed
PASS on 2026-10-22, evidence in `gate-evidence/postgres/live-20261022T122026/`). The project owner no longer wants to run
Docker. Cloud testing of the PWA (ADR "PWA-First Delivery for Phase 1") needs a hosted database anyway.

## Decision
1. Supabase is the only database environment: project `BinaField-test` (ref `kwofxlfysdcpwpggukax`) for repeatable
   gate and test runs; project `BinaField` (ref `plpaixewllldutjrjljg`) for the integrated PWA environment.
2. Supabase is used as plain PostgreSQL: no Supabase Auth, PostgREST or Realtime. Tenant context stays `SET LOCAL app.organization_id`.
3. The released scripts stay unchanged. `scripts/db/migrate.sh` and `scripts/db/verify.sh` need the `psql` / `pg_dump`
   client on the operator PC (PostgreSQL 17 command-line tools; no server install, no Docker).
   Runner: `docs/runbooks/run-supabase-gate.ps1` (works on a temp copy of the repo; sealed evidence is never overwritten).

## Consequences
- The 16.4 Docker proof stays valid history. Supabase runs are a **second proof on a different PostgreSQL major version (17)**
  and must be recorded as such; they do not replace or edit the first.
- Supabase roles are not superuser. Any test assuming superuser will fail visibly and be reported, not worked around silently.
- `docker-compose.yml` and the Android CI job remain in the tree, unused. Removal needs a separate decision (they are sealed files).
- The PostgreSQL 16 + PostGIS 3.4 CI service containers are unchanged; Supabase is not wired into CI.
- Connection strings are never committed or pasted into chat; the runbook reads them from a hidden prompt.
