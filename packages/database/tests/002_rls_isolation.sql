\set ON_ERROR_STOP on

BEGIN;

INSERT INTO iam.organizations(id, slug, name) VALUES
  ('10000000-0000-7000-8000-000000000001','fixture-org-a','Fixture Org A'),
  ('20000000-0000-7000-8000-000000000001','fixture-org-b','Fixture Org B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.projects(id, organization_id, project_code, name, lifecycle_state) VALUES
  ('10000000-0000-7000-8000-000000000101','10000000-0000-7000-8000-000000000001','P-A','Project A','ACTIVE'),
  ('20000000-0000-7000-8000-000000000101','20000000-0000-7000-8000-000000000001','P-B','Project B','ACTIVE')
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE app_runtime;
SET LOCAL app.organization_id = '10000000-0000-7000-8000-000000000001';

DO $$
DECLARE
  visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM core.projects;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected one visible Project for ORG-A, got %', visible_count;
  END IF;
  IF EXISTS (SELECT 1 FROM core.projects WHERE id = '20000000-0000-7000-8000-000000000101') THEN
    RAISE EXCEPTION 'cross-tenant SELECT leak';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO core.projects(id, organization_id, project_code, name)
    VALUES ('20000000-0000-7000-8000-000000000102','20000000-0000-7000-8000-000000000001','P-B-X','Forbidden B');
    RAISE EXCEPTION 'cross-tenant INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;
ROLLBACK;

BEGIN;
SET LOCAL ROLE app_runtime;
DO $$
DECLARE
  visible_count integer;
BEGIN
  SELECT count(*) INTO visible_count FROM core.projects;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'missing tenant context must fail closed';
  END IF;
END
$$;
RESET ROLE;
ROLLBACK;
