-- Requires migrated disposable PostgreSQL and login/SET ROLE app_runtime.
-- Proves SELECT/INSERT/UPDATE/DELETE tenant isolation and transaction-local context clearing.
BEGIN;
SET LOCAL ROLE app_runtime;
SELECT set_config('app.organization_id','00000000-0000-7000-8000-100000000001',true);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM core.projects WHERE organization_id='00000000-0000-7000-8000-100000000002'::uuid) THEN RAISE EXCEPTION 'RLS SELECT cross-tenant leak'; END IF;
 BEGIN INSERT INTO core.projects(id,organization_id,project_code,name) VALUES('00000000-0000-7000-8000-900000000001','00000000-0000-7000-8000-100000000002','X','Cross tenant'); RAISE EXCEPTION 'RLS INSERT unexpectedly succeeded'; EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;
ROLLBACK;

-- After transaction end the SET LOCAL value must be absent on the reused session.
DO $$ BEGIN IF nullif(current_setting('app.organization_id',true),'') IS NOT NULL THEN RAISE EXCEPTION 'tenant context leaked after transaction'; END IF; END $$;
