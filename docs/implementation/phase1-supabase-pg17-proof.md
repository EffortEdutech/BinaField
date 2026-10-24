# Phase 1 database proof on Supabase (PostgreSQL 17) - second environment

Status: **PASS observed 2026-10-24** on project `BinaField-test` (ref `kwofxlfysdcpwpggukax`, ap-northeast-1).
This is a **second proof on a different PostgreSQL major version**. It does not replace, edit or re-score the sealed
PostgreSQL 16.4 + PostGIS 3.4 Docker proof (`gate-evidence/postgres/live-20261022T122026/`). No gate JSON was recomputed.
Decision record: `docs/adr/ADR-0004-supabase-only-database-environment.md`.

## Result
| Check | Result |
|---|---|
| Server | PostgreSQL 17.11 (Supabase); client psql/pg_dump 18.4 |
| Released migrations applied from empty by `scripts/db/migrate.sh` | 18 of 18, exit 0 |
| Tables in BinaField schemas / RLS enabled and forced | 50 / 44 (same 44 as the PG16 proof) |
| Runtime roles | superuser=false, bypassrls=false, login=false (all five) |
| `scripts/db/verify.sh` test files 001-006 | all exit 0 |
| Schema vs sealed PG16 dump (BinaField schemas, normalised) | 423 vs 423 statements, 0 differences |
| PostGIS | 3.3.7 on Supabase (PG16 proof: 3.4) |

Evidence: `gate-evidence/supabase/live-20261024T100631/` (console.log, schema.sql, schema.sha256, client-version.txt,
supabase-verification.json). The verification JSON was produced by an independent connector query, not by the script.

## What it took (honest history)
1. First script run printed `EXIT: 0` but applied nothing (inline bash argument handling on Windows PowerShell).
   Caught by querying the database. Script fixed to run a script file with LF endings and to report PASS only if the log shows it.
2. Second run applied all 18 migrations and test 001, then **failed at 002**: `permission denied to set role "app_runtime"`.
   Cause: on Supabase `postgres` is not superuser and holds the repo roles with ADMIN but not SET option. Log kept in
   `gate-evidence/supabase/attempt1-failed-20261024T091719/console.log`.
3. Fix is an environment prerequisite, not a repo change: `GRANT app_runtime, worker_runtime TO postgres WITH SET TRUE, INHERIT FALSE`.
   The runbook now runs it before verify and logs it. No released migration or test file was edited.
4. Third run: migrations skipped (already recorded), tests 001-006 passed.

## Known differences from the PG16 proof
- Migration step in the passing run was a SKIP (applied in run 2). Both runs are retained.
- The grant above is required on Supabase; the PG16 proof ran as a true superuser.
- PostGIS 3.3.7 vs 3.4; PostgreSQL 17.11 vs 16.4.
- Project `BinaField` (ref `plpaixewllldutjrjljg`) still holds only migrations 0001-0003, applied through the connector from retyped text.
  It must be brought in line (fresh apply with the script) before it is used.
