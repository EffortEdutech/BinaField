# Goal 14 — Production-safe seed and data lifecycle operations

Status: IMPLEMENTED LOCALLY  
Date: 2026-10-30

## Seed command

From `apps/api`, set `DATABASE_URL` in the local shell and run a dry run first:

```powershell
npm run seed:operational -- --organization=a0000000-0000-4000-8000-000000000001 --environment=pilot
```

The command prints the deterministic plan and existing-record counts, then makes no changes. Supported environments are `pilot` and `test`; production is deliberately rejected.

To execute the plan, the operator must provide both `--write` and an exact confirmation:

```powershell
npm run seed:operational -- --organization=a0000000-0000-4000-8000-000000000001 --environment=pilot --write --confirm=a0000000-0000-4000-8000-000000000001:pilot
```

The command reuses deterministic project/template/version/deployment/assignment records. It does not create a new set on every run. A successful write records a `seed.operational_data` audit event and prints a verification record with the resulting IDs.

## Safety rules

- No `DATABASE_URL` is read from a committed file.
- Dry-run is the default.
- The command cannot target production.
- Writes require an explicit organisation, environment, `--write`, and exact confirmation.
- No cleanup or deletion is performed by the seed command.
- Before any future cleanup, export assignments, submissions, evidence metadata, and audit records and obtain operator approval. Preserve the export and affected-ID report in `gate-evidence/supabase/`.

## Verification

- `node --check scripts/seed-operational-data.mjs`
- `npm test`
- Run the dry-run command and retain its JSON output as the verification record.
