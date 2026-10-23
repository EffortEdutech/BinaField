#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/artefacts/phase1/security-results"
mkdir -p "$OUT"
started_compose=0
if [[ -z "${DATABASE_URL:-}" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: set DATABASE_URL to PostgreSQL 16 + PostGIS, or install Docker to use docker-compose.yml" >&2
    exit 127
  fi
  docker compose -f "$ROOT/docker-compose.yml" up -d postgres
  started_compose=1
  DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${POSTGRES_PORT:-5432}/${POSTGRES_DB:-binafield}"
  export DATABASE_URL
  for i in $(seq 1 40); do
    if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U postgres -d "${POSTGRES_DB:-binafield}" >/dev/null 2>&1; then break; fi
    sleep 1
  done
fi
command -v psql >/dev/null 2>&1 || { echo "ERROR: psql required" >&2; exit 127; }
version="$(psql "$DATABASE_URL" -Atqc 'show server_version')"
major="${version%%.*}"
if [[ "$major" != "16" ]]; then echo "ERROR: PostgreSQL 16 required, found $version" >&2; exit 3; fi
postgis="$(psql "$DATABASE_URL" -Atqc "select extversion from pg_extension where extname='postgis'" 2>/dev/null || true)"
# A fresh target DB is expected for authoritative migrate-from-zero evidence.
if psql "$DATABASE_URL" -Atqc "select to_regclass('platform.schema_migrations')" | grep -q .; then
  count="$(psql "$DATABASE_URL" -Atqc 'select count(*) from platform.schema_migrations')"
  if [[ "$count" != "0" ]]; then echo "ERROR: Batch 6 authoritative gate requires a fresh database; migration history count=$count" >&2; exit 4; fi
fi
bash "$ROOT/scripts/db/migrate.sh" | tee "$OUT/batch06-postgres-migration.log"
bash "$ROOT/scripts/db/verify.sh" | tee "$OUT/batch06-postgres-rls-conformance.log"
postgis="$(psql "$DATABASE_URL" -Atqc "select extversion from pg_extension where extname='postgis'")"
rls_tables="$(psql "$DATABASE_URL" -Atqc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relrowsecurity and n.nspname not in ('pg_catalog','information_schema')")"
forced_tables="$(psql "$DATABASE_URL" -Atqc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relrowsecurity and c.relforcerowsecurity and n.nspname not in ('pg_catalog','information_schema')")"
migration_count="$(psql "$DATABASE_URL" -Atqc 'select count(*) from platform.schema_migrations')"
cat > "$OUT/batch06-postgres-live-summary.json" <<JSON
{
  "status": "PASS",
  "postgres_version": "$version",
  "postgis_version": "$postgis",
  "migration_count": $migration_count,
  "rls_enabled_tables": $rls_tables,
  "rls_forced_tables": $forced_tables,
  "migration_from_zero": true,
  "database_test_suite": "PASS",
  "schema_snapshot": "artefacts/phase1/manifests/schema.sql"
}
JSON
cat "$OUT/batch06-postgres-live-summary.json"
