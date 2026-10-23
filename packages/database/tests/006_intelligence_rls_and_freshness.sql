\set ON_ERROR_STOP on
-- Batch 6 live PostgreSQL gate: P1-09 tenant isolation on new Intelligence runtime tables.
BEGIN;
INSERT INTO iam.organizations(id,slug,name) VALUES
 ('30000000-0000-7000-8000-000000000001','b6-intel-a','B6 Intelligence A'),
 ('40000000-0000-7000-8000-000000000001','b6-intel-b','B6 Intelligence B')
ON CONFLICT(id) DO NOTHING;
INSERT INTO intel.projection_freshness(organization_id,projection_version,lifecycle_state,lag_seconds) VALUES
 ('30000000-0000-7000-8000-000000000001','p1.0','CURRENT',0),
 ('40000000-0000-7000-8000-000000000001','p1.0','CURRENT',0)
ON CONFLICT(organization_id,projection_version) DO UPDATE SET lifecycle_state='CURRENT',lag_seconds=0;
SET LOCAL ROLE app_runtime;
SET LOCAL app.organization_id='30000000-0000-7000-8000-000000000001';
DO $$ BEGIN
 IF (SELECT count(*) FROM intel.projection_freshness) <> 1 THEN RAISE EXCEPTION 'intelligence RLS scope failed'; END IF;
 IF EXISTS(SELECT 1 FROM intel.projection_freshness WHERE organization_id='40000000-0000-7000-8000-000000000001'::uuid) THEN RAISE EXCEPTION 'intelligence cross-tenant leak'; END IF;
END $$;
RESET ROLE;
ROLLBACK;

BEGIN;
SET LOCAL ROLE worker_runtime;
SET LOCAL app.organization_id='30000000-0000-7000-8000-000000000001';
DO $$ BEGIN
 BEGIN
  INSERT INTO intel.projection_freshness(organization_id,projection_version,lifecycle_state,lag_seconds)
  VALUES('40000000-0000-7000-8000-000000000001','forbidden','CURRENT',0);
  RAISE EXCEPTION 'worker_runtime foreign-tenant INSERT unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL;
 END;
END $$;
RESET ROLE;
ROLLBACK;

BEGIN;
SET LOCAL ROLE app_runtime;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM intel.projection_freshness) THEN RAISE EXCEPTION 'missing tenant context must fail closed for Intelligence'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
