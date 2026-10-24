# Runbooks (current)

| Runbook | Purpose | Needs |
|---|---|---|
| `run-supabase-gate.ps1` | Apply the 18 released migrations and run the six DB test files against a Supabase project | PostgreSQL 17 command-line tools (`psql`, `pg_dump`), Git for Windows, Supabase **session pooler** connection string. No Docker. |

Superseded for day-to-day use by ADR-0004 (sealed originals left unchanged):
- `docs/implementation/phase1-b06b-live-closure.md` (Docker, PostgreSQL 16 + PostGIS)
- `docs/implementation/phase1-b06-external-closure-runbook.md`
- the Docker route and the "psql not required" statements in the sealed reports

Evidence from Supabase runs goes to `gate-evidence/supabase/live-<timestamp>/` and is labelled PostgreSQL 17 / Supabase.
