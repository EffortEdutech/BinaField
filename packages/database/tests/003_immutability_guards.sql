\set ON_ERROR_STOP on

BEGIN;

INSERT INTO iam.organizations(id, slug, name)
VALUES ('30000000-0000-7000-8000-000000000001','fixture-org-c','Fixture Org C')
ON CONFLICT (id) DO NOTHING;
INSERT INTO iam.users(id, identity_subject, email)
VALUES ('30000000-0000-7000-8000-000000000002','fixture-user-c','fixture-c@example.invalid')
ON CONFLICT (id) DO NOTHING;
INSERT INTO iam.memberships(id, organization_id, user_id, lifecycle_state)
VALUES ('30000000-0000-7000-8000-000000000003','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000002','ACTIVE')
ON CONFLICT (id) DO NOTHING;
INSERT INTO core.projects(id, organization_id, project_code, name, lifecycle_state)
VALUES ('30000000-0000-7000-8000-000000000004','30000000-0000-7000-8000-000000000001','P-C','Project C','ACTIVE')
ON CONFLICT (id) DO NOTHING;
INSERT INTO blueprint.templates(id, organization_id, template_key, name, lifecycle_state, created_by_membership_id)
VALUES ('30000000-0000-7000-8000-000000000005','30000000-0000-7000-8000-000000000001','T-C','Template C','ACTIVE','30000000-0000-7000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;
INSERT INTO blueprint.template_versions(id, organization_id, template_id, version_no, lifecycle_state, schema_version, component_registry_version, blueprint_json, blueprint_hash, created_by_membership_id)
VALUES ('30000000-0000-7000-8000-000000000006','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000005',1,'PUBLISHED','1.0','1.0','{"schema":"bf-blueprint/1.0"}'::jsonb,'fixture-hash','30000000-0000-7000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  BEGIN
    UPDATE blueprint.template_versions
    SET blueprint_json = '{"schema":"mutated"}'::jsonb
    WHERE id = '30000000-0000-7000-8000-000000000006';
    RAISE EXCEPTION 'published Version mutation unexpectedly succeeded';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    NULL;
  END;
END
$$;

INSERT INTO ops.deployments(id, organization_id, project_id, template_version_id, name, lifecycle_state, created_by_membership_id)
VALUES ('30000000-0000-7000-8000-000000000007','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000004','30000000-0000-7000-8000-000000000006','Deployment C','ACTIVE','30000000-0000-7000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;
INSERT INTO ops.assignments(id, organization_id, project_id, deployment_id, template_version_id, assignee_membership_id, lifecycle_state)
VALUES ('30000000-0000-7000-8000-000000000008','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000004','30000000-0000-7000-8000-000000000007','30000000-0000-7000-8000-000000000006','30000000-0000-7000-8000-000000000003','ASSIGNED')
ON CONFLICT (id) DO NOTHING;
INSERT INTO iam.registered_devices(id, organization_id, membership_id, platform, lifecycle_state)
VALUES ('30000000-0000-7000-8000-000000000009','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000003','ANDROID','ACTIVE')
ON CONFLICT (id) DO NOTHING;
INSERT INTO field.submission_attempts(id, organization_id, project_id, assignment_id, template_version_id, submission_session_id, attempt_no, membership_id, device_id, assignment_revision, blueprint_hash, payload_json, payload_hash, client_submitted_at, idempotency_key)
VALUES ('30000000-0000-7000-8000-000000000010','30000000-0000-7000-8000-000000000001','30000000-0000-7000-8000-000000000004','30000000-0000-7000-8000-000000000008','30000000-0000-7000-8000-000000000006','30000000-0000-7000-8000-000000000011',1,'30000000-0000-7000-8000-000000000003','30000000-0000-7000-8000-000000000009',1,'fixture-hash','{"ok":true}'::jsonb,'payload-hash',now(),'fixture-idempotency')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  BEGIN
    UPDATE field.submission_attempts
    SET payload_json = '{"ok":false}'::jsonb
    WHERE id = '30000000-0000-7000-8000-000000000010';
    RAISE EXCEPTION 'Submission Attempt mutation unexpectedly succeeded';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    NULL;
  END;
END
$$;

ROLLBACK;
