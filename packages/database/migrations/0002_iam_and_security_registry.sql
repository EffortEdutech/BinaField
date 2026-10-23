BEGIN;

CREATE TABLE iam.organizations (
  id uuid PRIMARY KEY,
  slug citext NOT NULL UNIQUE,
  name text NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (lifecycle_state IN ('ACTIVE','SUSPENDED','ARCHIVED')),
  reporting_timezone text NOT NULL DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.users (
  id uuid PRIMARY KEY,
  identity_subject text NOT NULL UNIQUE,
  email citext,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE iam.memberships (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES iam.users(id),
  lifecycle_state text NOT NULL DEFAULT 'INVITED'
    CHECK (lifecycle_state IN ('INVITED','ACTIVE','SUSPENDED','REVOKED')),
  invited_at timestamptz,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, user_id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE iam.permissions (
  permission_key text PRIMARY KEY,
  description text NOT NULL,
  introduced_version text NOT NULL DEFAULT '1.0'
);

CREATE TABLE iam.roles (
  id uuid PRIMARY KEY,
  organization_id uuid,
  role_key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((is_system AND organization_id IS NULL) OR (NOT is_system AND organization_id IS NOT NULL)),
  UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX roles_system_key_uq
  ON iam.roles(role_key)
  WHERE is_system;

CREATE UNIQUE INDEX roles_org_key_uq
  ON iam.roles(organization_id, role_key)
  WHERE NOT is_system;

CREATE TABLE iam.role_permissions (
  role_id uuid NOT NULL REFERENCES iam.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES iam.permissions(permission_key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE iam.membership_roles (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL REFERENCES iam.roles(id),
  scope_mode text NOT NULL DEFAULT 'ORGANISATION'
    CHECK (scope_mode IN ('ORGANISATION','PROJECT_RESTRICTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES iam.memberships(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE iam.registered_devices (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  platform text NOT NULL,
  app_version text,
  runtime_version text,
  lifecycle_state text NOT NULL DEFAULT 'REGISTERED'
    CHECK (lifecycle_state IN ('REGISTERED','ACTIVE','SUSPENDED','REVOKED')),
  security_policy_version text,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES iam.memberships(organization_id, id)
);

CREATE INDEX memberships_org_state_idx ON iam.memberships(organization_id, lifecycle_state);
CREATE INDEX registered_devices_org_membership_idx ON iam.registered_devices(organization_id, membership_id);

COMMIT;
