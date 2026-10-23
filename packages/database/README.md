# BinaField Phase 1 database baseline

This package implements Batch 1 of the Phase 1 executable substrate.

## Migration rules

- SQL migrations are forward-only and numbered.
- Once a migration is released, its SHA-256 must not change.
- `scripts/db/migrate.sh` records applied checksums in `platform.schema_migrations`.
- Breaking changes use new expand/contract migrations; never edit history to accommodate a newer offline client.

## Runtime tenant context

Every tenant transaction must use a trusted server-resolved Organisation and set it locally:

```sql
BEGIN;
SET LOCAL app.organization_id = '...';
SET LOCAL app.membership_id = '...';
SET LOCAL app.principal_id = '...';
-- tenant queries
COMMIT;
```

`SET LOCAL` is mandatory so pooled connections do not retain tenant context after COMMIT/ROLLBACK.

## Runtime roles

`app_runtime`, `worker_runtime` and `bf_readonly` are NOLOGIN group roles, `NOSUPERUSER`, `NOCREATEROLE`, and `NOBYPASSRLS`. Production login identities should inherit/set one of these roles without owning tenant tables.

## Execute locally

Use PostgreSQL 16 + PostGIS. The supplied Docker Compose file is the reference developer environment.

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/binafield
bash scripts/db/migrate.sh
bash scripts/db/verify.sh
```
