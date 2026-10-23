BEGIN;

CREATE TABLE core.projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_code text NOT NULL,
  name text NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_state IN ('DRAFT','ACTIVE','SUSPENDED','COMPLETED','ARCHIVED')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, project_code),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE core.teams (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id)
);

CREATE TABLE core.team_members (
  organization_id uuid NOT NULL,
  team_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, team_id, membership_id),
  FOREIGN KEY (organization_id, team_id)
    REFERENCES core.teams(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES iam.memberships(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE iam.membership_project_scopes (
  organization_id uuid NOT NULL,
  membership_role_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, membership_role_id, project_id),
  FOREIGN KEY (organization_id, membership_role_id)
    REFERENCES iam.membership_roles(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX projects_org_state_idx ON core.projects(organization_id, lifecycle_state);
CREATE INDEX teams_org_project_idx ON core.teams(organization_id, project_id);

COMMIT;
