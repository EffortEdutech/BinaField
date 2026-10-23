#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
if [[ "${BINAFIELD_ALLOW_DB_RESET:-NO}" != "YES" ]]; then
  echo "Refusing reset. Set BINAFIELD_ALLOW_DB_RESET=YES for a disposable development database." >&2
  exit 3
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required." >&2
  exit 127
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS intel CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS processing CASCADE;
DROP SCHEMA IF EXISTS sync CASCADE;
DROP SCHEMA IF EXISTS evidence CASCADE;
DROP SCHEMA IF EXISTS field CASCADE;
DROP SCHEMA IF EXISTS ops CASCADE;
DROP SCHEMA IF EXISTS blueprint CASCADE;
DROP SCHEMA IF EXISTS core CASCADE;
DROP SCHEMA IF EXISTS iam CASCADE;
DROP SCHEMA IF EXISTS platform CASCADE;
SQL

bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/migrate.sh"
