#!/usr/bin/env bash
# Runs inside a postgres:17 container. Works on a COPY of the repo so sealed evidence files
# (artefacts/phase1/manifests/schema.sql etc.) are never overwritten by verify.sh.
set -uo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
cp -r /src /work && cd /work
rc=0
echo "== server =="; psql "$DATABASE_URL" -Atc "select version()"
echo "== migrate =="; bash scripts/db/migrate.sh || rc=$?
echo "migrate exit: $rc"
if [ "$rc" -eq 0 ]; then
  echo "== summary =="
  psql "$DATABASE_URL" -Atc "select count(*) as migrations from platform.schema_migrations"
  psql "$DATABASE_URL" -Atc "select count(*) filter (where c.relrowsecurity) as rls_enabled, count(*) filter (where c.relforcerowsecurity) as rls_forced, count(*) as tables from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('platform','iam','core','blueprint','ops','field','evidence','sync','processing','audit','intel')"
  echo "== verify =="; bash scripts/db/verify.sh; vrc=$?
  echo "verify exit: $vrc"; rc=$vrc
  cp -f artefacts/phase1/manifests/schema.sql artefacts/phase1/manifests/schema.sha256 /out/ 2>/dev/null || true
fi
echo "INNER EXIT: $rc"
exit $rc
