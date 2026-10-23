BEGIN;

CREATE TABLE processing.workflow_runs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  submission_id uuid NOT NULL,
  route_key text NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'QUEUED'
    CHECK (lifecycle_state IN ('QUEUED','RUNNING','SUCCEEDED','FAILED_RETRYABLE','FAILED_FINAL','CANCELLED')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error_code text,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES field.submissions(organization_id, id)
);

CREATE TABLE processing.idempotency_records (
  organization_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  operation_type text NOT NULL,
  request_hash text NOT NULL,
  result_reference jsonb,
  state text NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (state IN ('IN_PROGRESS','COMPLETED','FAILED_FINAL')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  PRIMARY KEY (organization_id, idempotency_key, operation_type),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE processing.outbox_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  event_type text NOT NULL,
  event_version integer NOT NULL DEFAULT 1 CHECK (event_version > 0),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_revision bigint,
  payload_json jsonb NOT NULL,
  correlation_id uuid,
  causation_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  publish_attempts integer NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE processing.consumer_receipts (
  consumer_key text NOT NULL,
  event_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  result_code text,
  PRIMARY KEY (consumer_key, event_id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE audit.audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  actor_type text NOT NULL,
  actor_id text,
  action_key text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  result text NOT NULL,
  reason_code text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE INDEX workflow_runs_org_state_retry_idx
  ON processing.workflow_runs(organization_id, lifecycle_state, next_retry_at);
CREATE INDEX outbox_unpublished_idx
  ON processing.outbox_events(organization_id, occurred_at)
  WHERE published_at IS NULL;
CREATE INDEX audit_events_org_time_idx
  ON audit.audit_events(organization_id, occurred_at DESC);

COMMIT;
