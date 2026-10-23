BEGIN;

CREATE TABLE sync.change_log (
  sequence_id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_revision bigint,
  change_type text NOT NULL CHECK (change_type IN ('UPSERT','TOMBSTONE')),
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  UNIQUE (organization_id, sequence_id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE sync.device_cursors (
  organization_id uuid NOT NULL,
  device_id uuid NOT NULL,
  cursor_sequence bigint NOT NULL DEFAULT 0 CHECK (cursor_sequence >= 0),
  acknowledged_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, device_id),
  FOREIGN KEY (organization_id, device_id)
    REFERENCES iam.registered_devices(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE sync.sync_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  device_id uuid NOT NULL,
  membership_id uuid,
  operation_id uuid,
  event_type text NOT NULL,
  transport_state text NOT NULL
    CHECK (transport_state IN ('LOCAL_ONLY','QUEUED','SYNCING','SYNC_FAILED','RECONCILIATION_REQUIRED','SYNCED')),
  error_code text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, device_id)
    REFERENCES iam.registered_devices(organization_id, id),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES iam.memberships(organization_id, id)
);

CREATE INDEX change_log_org_sequence_idx
  ON sync.change_log(organization_id, sequence_id);
CREATE INDEX sync_events_org_device_idx
  ON sync.sync_events(organization_id, device_id, occurred_at DESC);

COMMIT;
