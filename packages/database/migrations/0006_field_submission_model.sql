BEGIN;

CREATE TABLE field.submission_attempts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  submission_session_id uuid NOT NULL,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  membership_id uuid NOT NULL,
  device_id uuid NOT NULL,
  assignment_revision bigint NOT NULL CHECK (assignment_revision > 0),
  blueprint_hash text NOT NULL,
  payload_json jsonb NOT NULL,
  payload_hash text NOT NULL,
  evidence_manifest_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_completed_at timestamptz,
  client_submitted_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  correlation_id uuid,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, assignment_id, idempotency_key),
  UNIQUE (organization_id, submission_session_id, attempt_no),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, assignment_id)
    REFERENCES ops.assignments(organization_id, id),
  FOREIGN KEY (organization_id, template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES iam.memberships(organization_id, id),
  FOREIGN KEY (organization_id, device_id)
    REFERENCES iam.registered_devices(organization_id, id)
);

CREATE TABLE field.submissions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  submission_attempt_id uuid NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'RECEIVED'
    CHECK (lifecycle_state IN ('RECEIVED','VALIDATING','ACCEPTED','REJECTED')),
  rejection_code text,
  rejection_detail jsonb,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, submission_attempt_id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, assignment_id)
    REFERENCES ops.assignments(organization_id, id),
  FOREIGN KEY (organization_id, submission_attempt_id)
    REFERENCES field.submission_attempts(organization_id, id),
  CHECK ((lifecycle_state = 'ACCEPTED') = (accepted_at IS NOT NULL)),
  CHECK ((lifecycle_state = 'REJECTED') = (rejected_at IS NOT NULL))
);

CREATE OR REPLACE FUNCTION field.prevent_submission_attempt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'submission attempt is immutable'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_submission_attempt_immutable_update ON field.submission_attempts;
CREATE TRIGGER trg_submission_attempt_immutable_update
BEFORE UPDATE OR DELETE ON field.submission_attempts
FOR EACH ROW EXECUTE FUNCTION field.prevent_submission_attempt_mutation();

CREATE INDEX submission_attempts_org_assignment_idx
  ON field.submission_attempts(organization_id, assignment_id, received_at DESC);
CREATE INDEX submission_attempts_payload_gin_idx
  ON field.submission_attempts USING gin (payload_json jsonb_path_ops);
CREATE INDEX submissions_org_state_idx
  ON field.submissions(organization_id, lifecycle_state, created_at DESC);

COMMIT;
