#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required to execute database verification." >&2
  exit 127
fi

for file in "$ROOT_DIR"/packages/database/tests/*.sql; do
  echo "VERIFY $(basename "$file")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

if command -v pg_dump >/dev/null 2>&1; then
  mkdir -p "$ROOT_DIR/artefacts/phase1/manifests"
  pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges \
    | sed '/^-- Dumped/d;/^-- Started/d;/^-- Completed/d' \
    > "$ROOT_DIR/artefacts/phase1/manifests/schema.sql"
  sha256sum "$ROOT_DIR/artefacts/phase1/manifests/schema.sql" \
    > "$ROOT_DIR/artefacts/phase1/manifests/schema.sha256"
fi
