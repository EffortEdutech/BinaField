\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[];
BEGIN
  SELECT array_agg(expected)
  INTO missing
  FROM unnest(ARRAY['platform','iam','core','blueprint','ops','field','evidence','sync','processing','audit','intel']) expected
  WHERE NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = expected);

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'missing schemas: %', missing;
  END IF;
END
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ('app_runtime','worker_runtime','bf_readonly') LOOP
    IF r.rolsuper OR r.rolbypassrls THEN
      RAISE EXCEPTION 'runtime role % must not be superuser or BYPASSRLS', r.rolname;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('app_runtime','worker_runtime','bf_readonly')) <> 3 THEN
    RAISE EXCEPTION 'required runtime roles missing';
  END IF;
END
$$;

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM platform.rls_registry r
  LEFT JOIN pg_class c ON c.relname = r.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = r.schema_name
  WHERE c.oid IS NULL OR NOT c.relrowsecurity OR NOT c.relforcerowsecurity;

  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'RLS registry mismatch: % table(s) not FORCE RLS', missing_count;
  END IF;
END
$$;
