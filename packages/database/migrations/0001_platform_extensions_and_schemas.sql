BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS blueprint;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS field;
CREATE SCHEMA IF NOT EXISTS evidence;
CREATE SCHEMA IF NOT EXISTS sync;
CREATE SCHEMA IF NOT EXISTS processing;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS intel;

CREATE OR REPLACE FUNCTION platform.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION platform.current_membership_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.membership_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION platform.current_principal_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.principal_id', true), '')
$$;

COMMENT ON FUNCTION platform.current_organization_id() IS
  'Trusted transaction-local tenant context. Runtime code must SET LOCAL app.organization_id inside every tenant transaction.';


CREATE TABLE IF NOT EXISTS platform.schema_migrations (
  migration_name text PRIMARY KEY,
  sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.schema_metadata (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  phase text NOT NULL DEFAULT 'P1',
  baseline_version text NOT NULL DEFAULT 'P1-B01',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform.schema_metadata(singleton, phase, baseline_version)
VALUES (true, 'P1', 'P1-B01')
ON CONFLICT (singleton) DO UPDATE
SET phase = EXCLUDED.phase,
    baseline_version = EXCLUDED.baseline_version,
    updated_at = now();

COMMIT;
