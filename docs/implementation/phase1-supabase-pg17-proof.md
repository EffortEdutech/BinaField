# Phase 1 database proof on Supabase (PostgreSQL 17) - second environment

Status: **PASS observed 2026-10-24, clean run on both Supabase projects** (this replaces the earlier version of this note).
This is a **second proof on a different PostgreSQL major version**. It does not replace, edit or re-score the sealed
PostgreSQL 16.4 + PostGIS 3.4 Docker proof (`gate-evidence/postgres/live-20261022T122026/`). No gate JSON was recomputed.
Decision record: `docs/adr/ADR-0004-supabase-only-database-environment.md`.

## Result (identical on both projects)
| Check | `BinaField-test` (kwofxlfysdcpwpggukax) | `BinaField` (plpaixewllldutjrjljg) |
|---|---|---|
| Server / client | PostgreSQL 17.11 / psql, pg_dump 18.4 | same |
| Sealed-manifest integrity before touching the DB | 27 database files, 0 mismatched | 27 files, 0 mismatched |
| Schemas wiped, then 18 released migrations applied from empty (`migrate.sh`) | 18 of 18, exit 0 | 18 of 18, exit 0 |
| Recorded checksums vs sealed manifest | 18 of 18 identical | 18 of 18 identical |
| Tables in BinaField schemas / RLS enabled and forced | 50 / 44 | 50 / 44 |
| Runtime roles | superuser=false, bypassrls=false, login=false (all five) | same |
| `verify.sh` test files 001-006 | all exit 0 | all exit 0 |
| Schema vs sealed PG16 dump (BinaField schemas incl. `security`, normalised) | 424 vs 424 statements, 0 differences | 424 vs 424, 0 differences |
| Fixture rows left behind | 0 | 0 |

PostGIS is 3.3.7 on Supabase (PG16 proof: 3.4). The 44 RLS tables are the same 44 as the PG16 proof.

Evidence: `gate-evidence/supabase/clean-run-test-20261024T125609/` and `.../clean-run-main-20261024T135906/`
(console.log, reset.log, integrity-check.txt, schema.sql, schema.sha256, client-version.txt, supabase-verification.json).
The verification JSON was produced by an independent connector query, not by the script. No connection string or password is in any log.

## Environment prerequisite (not a repo change)
Supabase `postgres` is not superuser and holds the repo roles with ADMIN but not SET option, so tests that `SET ROLE app_runtime / worker_runtime`
fail until `GRANT app_runtime, worker_runtime TO postgres WITH SET TRUE, INHERIT FALSE` is run. The runbook does this and logs it.
No released migration or test file was edited.

## History (kept, superseded by the clean runs above)
- `gate-evidence/supabase/attempt1-failed-20261024T091719/` - first real run: migrations applied, then **FAIL at test 002** (`permission denied to set role "app_runtime"`).
- `gate-evidence/supabase/live-20261024T100631/` - first PASS (BinaField-test). **Superseded:** the PC's Git converted the migrations to CRLF, so the
  recorded checksums were not the sealed ones (e.g. 0001 recorded `18e306bb...`, sealed `c1249829...`). Functionally identical SQL, but not proof of the sealed bytes.
- Fixes made along the way (all runbook/repo hygiene, no sealed file touched): the script once printed `EXIT: 0` while running nothing (caught by querying the DB);
  `.gitattributes` now forces LF; the runbook normalises `.sql`/`.sh` to LF and refuses to run unless the 27 database files match the sealed manifest;
  `-Reset` wipes the 12 BinaField schemas (incl. `security`, created by 0014y) after a typed YES; partial passwords are scrubbed from logs.
- Earlier, project `BinaField` briefly held migrations 0001-0003 applied through the connector from retyped text. That was wiped and replaced by the clean run above.

## Known differences from the PG16 proof
- PostgreSQL 17.11 vs 16.4; PostGIS 3.3.7 vs 3.4; managed non-superuser role (grant above).
- Connection route: BinaField-test over the direct host as `postgres`; BinaField over the Session pooler as `postgres.<ref>`.
- Formal Phase 1 closure is unchanged: it stays open until the revised PWA gate (ADR PWA-First) passes on real phones.
