BEGIN;

CREATE TABLE intel.semantic_registry (
  semantic_key text PRIMARY KEY,
  canonical_name text NOT NULL,
  description text,
  value_type text NOT NULL,
  canonical_unit text,
  default_analytical_role text,
  classification_default text NOT NULL DEFAULT 'internal',
  introduced_version text NOT NULL DEFAULT '1.0',
  deprecated_version text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE intel.semantic_compatibility (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  semantic_key text NOT NULL REFERENCES intel.semantic_registry(semantic_key),
  source_template_version_id uuid NOT NULL,
  target_template_version_id uuid NOT NULL,
  compatibility_state text NOT NULL
    CHECK (compatibility_state IN ('COMPATIBLE','CONVERTIBLE','INCOMPATIBLE','UNKNOWN')),
  conversion_key text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, semantic_key, source_template_version_id, target_template_version_id),
  FOREIGN KEY (organization_id, source_template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id),
  FOREIGN KEY (organization_id, target_template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id)
);

CREATE TABLE intel.projection_runs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  projection_version text NOT NULL,
  source_type text NOT NULL,
  source_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_state text NOT NULL DEFAULT 'PENDING'
    CHECK (lifecycle_state IN ('PENDING','BUILDING','CURRENT','FAILED','REBUILDING')),
  rows_inserted bigint NOT NULL DEFAULT 0,
  rows_updated bigint NOT NULL DEFAULT 0,
  rows_invalidated bigint NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE TABLE intel.projection_facts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid,
  deployment_id uuid,
  assignment_id uuid,
  submission_id uuid,
  submission_attempt_id uuid,
  template_id uuid,
  template_version_id uuid,
  blueprint_hash text,
  field_id text,
  semantic_key text REFERENCES intel.semantic_registry(semantic_key),
  projection_grain text NOT NULL,
  projection_version text NOT NULL,
  source_accepted_at timestamptz,
  projected_at timestamptz NOT NULL DEFAULT now(),
  classification text NOT NULL DEFAULT 'internal',
  source_identity text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, projection_version, source_identity),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES core.projects(organization_id, id),
  FOREIGN KEY (organization_id, deployment_id)
    REFERENCES ops.deployments(organization_id, id),
  FOREIGN KEY (organization_id, assignment_id)
    REFERENCES ops.assignments(organization_id, id),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES field.submissions(organization_id, id),
  FOREIGN KEY (organization_id, submission_attempt_id)
    REFERENCES field.submission_attempts(organization_id, id),
  FOREIGN KEY (organization_id, template_id)
    REFERENCES blueprint.templates(organization_id, id),
  FOREIGN KEY (organization_id, template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id)
);

CREATE TABLE intel.fact_numeric (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  numeric_value numeric NOT NULL,
  unit text,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_boolean (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  boolean_value boolean NOT NULL,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_text (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  text_value text NOT NULL,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_date (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  date_value date NOT NULL,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_datetime (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  datetime_value timestamptz NOT NULL,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_currency (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency_code char(3) NOT NULL,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.fact_geo (
  organization_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  point geography(Point,4326) NOT NULL,
  accuracy_m numeric,
  zone_ref text,
  PRIMARY KEY (organization_id, fact_id),
  FOREIGN KEY (organization_id, fact_id)
    REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE
);

CREATE TABLE intel.metric_definitions (
  id uuid PRIMARY KEY,
  organization_id uuid,
  metric_key text NOT NULL,
  metric_version integer NOT NULL CHECK (metric_version > 0),
  name text NOT NULL,
  description text,
  source_grain text NOT NULL,
  definition_json jsonb NOT NULL,
  classification text NOT NULL DEFAULT 'internal',
  lifecycle_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (lifecycle_state IN ('ACTIVE','SUPERSEDED','ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE UNIQUE INDEX metric_definitions_system_uq
  ON intel.metric_definitions(metric_key, metric_version)
  WHERE organization_id IS NULL;
CREATE UNIQUE INDEX metric_definitions_org_uq
  ON intel.metric_definitions(organization_id, metric_key, metric_version)
  WHERE organization_id IS NOT NULL;

CREATE TABLE intel.insights (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  insight_type text NOT NULL,
  definition_key text NOT NULL,
  definition_version integer NOT NULL DEFAULT 1,
  scope_json jsonb NOT NULL,
  period_json jsonb NOT NULL,
  current_value_json jsonb,
  baseline_value_json jsonb,
  explanation text NOT NULL,
  severity text,
  confidence_descriptor text,
  freshness_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (lifecycle_state IN ('ACTIVE','ACKNOWLEDGED','RESOLVED','EXPIRED','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id)
);

CREATE INDEX projection_facts_org_semantic_idx
  ON intel.projection_facts(organization_id, semantic_key, projected_at DESC)
  WHERE semantic_key IS NOT NULL AND active;
CREATE INDEX projection_facts_org_assignment_idx
  ON intel.projection_facts(organization_id, assignment_id)
  WHERE assignment_id IS NOT NULL AND active;
CREATE INDEX projection_facts_org_submission_idx
  ON intel.projection_facts(organization_id, submission_id)
  WHERE submission_id IS NOT NULL AND active;
CREATE INDEX fact_geo_gist_idx ON intel.fact_geo USING gist(point);
CREATE INDEX insights_org_state_idx ON intel.insights(organization_id, lifecycle_state, created_at DESC);

COMMIT;
