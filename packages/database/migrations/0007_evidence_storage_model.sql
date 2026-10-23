BEGIN;

CREATE TABLE evidence.attachments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  submission_session_id uuid NOT NULL,
  submission_attempt_id uuid,
  submission_id uuid,
  field_id text,
  evidence_type text NOT NULL
    CHECK (evidence_type IN ('PHOTO','SIGNATURE','FILE_ATTACHMENT','BARCODE_IMAGE')),
  evidence_role text NOT NULL DEFAULT 'ORIGINAL'
    CHECK (evidence_role IN ('ORIGINAL','DERIVATIVE')),
  parent_attachment_id uuid,
  capture_source text
    CHECK (capture_source IS NULL OR capture_source IN ('CAMERA_CAPTURE','FILE_IMPORT','SIGNATURE_SURFACE','SCANNER_CAPTURE','SYSTEM_DERIVATIVE')),
  hash_algorithm text NOT NULL DEFAULT 'SHA-256',
  content_hash text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  claimed_mime_type text,
  detected_mime_type text,
  storage_key text,
  transfer_state text NOT NULL DEFAULT 'QUEUED_FOR_UPLOAD'
    CHECK (transfer_state IN ('LOCAL_CAPTURED','QUEUED_FOR_UPLOAD','UPLOADING','UPLOADED','FAILED')),
  integrity_state text NOT NULL DEFAULT 'PENDING'
    CHECK (integrity_state IN ('PENDING','VERIFIED','FAILED','QUARANTINED')),
  binding_state text NOT NULL DEFAULT 'UNBOUND'
    CHECK (binding_state IN ('UNBOUND','BOUND')),
  processing_state text NOT NULL DEFAULT 'PENDING'
    CHECK (processing_state IN ('PENDING','PROCESSING','READY','FAILED','RETAINED','PURGED')),
  classification text NOT NULL DEFAULT 'internal',
  retention_policy_ref text,
  captured_at timestamptz,
  uploaded_at timestamptz,
  verified_at timestamptz,
  bound_at timestamptz,
  purged_at timestamptz,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, assignment_id)
    REFERENCES ops.assignments(organization_id, id),
  FOREIGN KEY (organization_id, submission_attempt_id)
    REFERENCES field.submission_attempts(organization_id, id),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES field.submissions(organization_id, id),
  FOREIGN KEY (organization_id, parent_attachment_id)
    REFERENCES evidence.attachments(organization_id, id),
  CHECK ((evidence_role = 'DERIVATIVE') = (parent_attachment_id IS NOT NULL)),
  CHECK (evidence_role <> 'ORIGINAL' OR parent_attachment_id IS NULL),
  CHECK (processing_state <> 'READY' OR (integrity_state = 'VERIFIED' AND storage_key IS NOT NULL))
);

CREATE TABLE evidence.upload_sessions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  expected_hash text NOT NULL,
  expected_byte_size bigint NOT NULL CHECK (expected_byte_size >= 0),
  expected_mime_type text,
  provider_upload_id text,
  state text NOT NULL DEFAULT 'INITIALISED'
    CHECK (state IN ('INITIALISED','UPLOADING','COMPLETED','EXPIRED','ABORTED','FAILED')),
  expires_at timestamptz NOT NULL,
  parts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, attachment_id)
    REFERENCES evidence.attachments(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE evidence.bindings (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  submission_attempt_id uuid NOT NULL,
  submission_id uuid,
  field_id text,
  binding_role text NOT NULL DEFAULT 'REQUIRED',
  bound_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, attachment_id, submission_attempt_id, field_id),
  FOREIGN KEY (organization_id, attachment_id)
    REFERENCES evidence.attachments(organization_id, id),
  FOREIGN KEY (organization_id, submission_attempt_id)
    REFERENCES field.submission_attempts(organization_id, id),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES field.submissions(organization_id, id)
);

CREATE TABLE evidence.holds (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  reason text NOT NULL,
  created_by_membership_id uuid NOT NULL,
  released_by_membership_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, attachment_id)
    REFERENCES evidence.attachments(organization_id, id),
  FOREIGN KEY (organization_id, created_by_membership_id)
    REFERENCES iam.memberships(organization_id, id),
  FOREIGN KEY (organization_id, released_by_membership_id)
    REFERENCES iam.memberships(organization_id, id),
  CHECK ((released_at IS NULL) = (released_by_membership_id IS NULL))
);

CREATE OR REPLACE FUNCTION evidence.guard_verified_storage_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.integrity_state IN ('VERIFIED','QUARANTINED')
     OR OLD.binding_state = 'BOUND'
     OR OLD.processing_state IN ('READY','RETAINED','PURGED') THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.evidence_role IS DISTINCT FROM OLD.evidence_role
       OR NEW.parent_attachment_id IS DISTINCT FROM OLD.parent_attachment_id
       OR NEW.hash_algorithm IS DISTINCT FROM OLD.hash_algorithm
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.byte_size IS DISTINCT FROM OLD.byte_size
       OR NEW.storage_key IS DISTINCT FROM OLD.storage_key THEN
      RAISE EXCEPTION 'verified evidence storage identity is immutable'
        USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_evidence_storage_identity ON evidence.attachments;
CREATE TRIGGER trg_guard_evidence_storage_identity
BEFORE UPDATE ON evidence.attachments
FOR EACH ROW EXECUTE FUNCTION evidence.guard_verified_storage_identity();

CREATE INDEX attachments_org_assignment_idx
  ON evidence.attachments(organization_id, assignment_id, created_at DESC);
CREATE INDEX attachments_org_submission_idx
  ON evidence.attachments(organization_id, submission_id)
  WHERE submission_id IS NOT NULL;
CREATE INDEX attachments_integrity_idx
  ON evidence.attachments(organization_id, integrity_state, processing_state);
CREATE INDEX upload_sessions_active_idx
  ON evidence.upload_sessions(organization_id, state, expires_at)
  WHERE state IN ('INITIALISED','UPLOADING');

COMMIT;
