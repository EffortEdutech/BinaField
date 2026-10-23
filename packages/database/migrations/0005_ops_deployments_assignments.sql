BEGIN;

CREATE TABLE ops.deployments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  name text NOT NULL,
  lifecycle_state text NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_state IN ('DRAFT','SCHEDULED','ACTIVE','PAUSED','CLOSED','ARCHIVED')),
  effective_from timestamptz,
  effective_until timestamptz,
  target_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id),
  FOREIGN KEY (organization_id, created_by_membership_id)
    REFERENCES iam.memberships(organization_id, id),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

CREATE TABLE ops.assignments (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  deployment_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  assignee_membership_id uuid,
  assignee_team_id uuid,
  operational_subject_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  lifecycle_state text NOT NULL DEFAULT 'PLANNED'
    CHECK (lifecycle_state IN ('PLANNED','ASSIGNED','IN_PROGRESS','SUBMITTED','COMPLETED','CANCELLED')),
  due_at timestamptz,
  issued_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, deployment_id)
    REFERENCES ops.deployments(organization_id, id),
  FOREIGN KEY (organization_id, template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id),
  FOREIGN KEY (organization_id, assignee_membership_id)
    REFERENCES iam.memberships(organization_id, id),
  FOREIGN KEY (organization_id, assignee_team_id)
    REFERENCES core.teams(organization_id, id),
  CHECK (assignee_membership_id IS NOT NULL OR assignee_team_id IS NOT NULL OR lifecycle_state = 'PLANNED')
);

CREATE INDEX deployments_org_project_state_idx
  ON ops.deployments(organization_id, project_id, lifecycle_state);
CREATE INDEX assignments_org_project_state_idx
  ON ops.assignments(organization_id, project_id, lifecycle_state);
CREATE INDEX assignments_org_assignee_idx
  ON ops.assignments(organization_id, assignee_membership_id, lifecycle_state)
  WHERE assignee_membership_id IS NOT NULL;
CREATE INDEX assignments_due_open_idx
  ON ops.assignments(organization_id, due_at)
  WHERE lifecycle_state NOT IN ('COMPLETED','CANCELLED') AND due_at IS NOT NULL;

COMMIT;
