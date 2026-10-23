DO $$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM iam.permissions WHERE permission_key LIKE 'organisation.%';
 IF n<>0 THEN RAISE EXCEPTION 'legacy organisation.* permission keys remain'; END IF;
 SELECT count(*) INTO n FROM iam.permissions WHERE permission_key IN ('organization.read','organization.manage','assignment.execute','submission.create','evidence.capture','integration.read','data.personal.read');
 IF n<>7 THEN RAISE EXCEPTION 'canonical P1-06 permissions missing'; END IF;
 IF EXISTS (SELECT 1 FROM iam.membership_roles WHERE scope_mode NOT IN ('ORG_WIDE','PROJECT_RESTRICTED')) THEN RAISE EXCEPTION 'invalid scope_mode'; END IF;
END $$;
