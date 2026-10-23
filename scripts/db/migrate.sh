#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG_DIR="$ROOT_DIR/packages/database/migrations"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required to execute migrations." >&2
  exit 127
fi

for file in "$MIG_DIR"/*.sql; do
  name="$(basename "$file")"
  checksum="$(sha256sum "$file" | awk '{print $1}')"

  has_history="$(psql "$DATABASE_URL" -Atqc "SELECT to_regclass('platform.schema_migrations') IS NOT NULL" 2>/dev/null || true)"
  if [[ "$has_history" == "t" ]]; then
    applied_checksum="$(psql "$DATABASE_URL" -Atqc "SELECT sha256 FROM platform.schema_migrations WHERE migration_name = '$name'" || true)"
    if [[ -n "$applied_checksum" ]]; then
      if [[ "$applied_checksum" != "$checksum" ]]; then
        echo "ERROR: released migration checksum mismatch: $name" >&2
        exit 2
      fi
      echo "SKIP  $name"
      continue
    fi
  fi

  echo "APPLY $name"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO platform.schema_migrations(migration_name, sha256) VALUES ('$name', '$checksum') ON CONFLICT (migration_name) DO NOTHING;"
done
