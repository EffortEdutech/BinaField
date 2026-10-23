BEGIN;

CREATE TABLE blueprint.templates (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  template_key text NOT NULL,
  name text NOT NULL,
  description text,
  lifecycle_state text NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_state IN ('DRAFT','ACTIVE','SUSPENDED','ARCHIVED')),
  created_by_membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, template_key),
  FOREIGN KEY (organization_id) REFERENCES iam.organizations(id),
  FOREIGN KEY (organization_id, created_by_membership_id)
    REFERENCES iam.memberships(organization_id, id)
);

CREATE TABLE blueprint.template_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  template_id uuid NOT NULL,
  version_no integer NOT NULL CHECK (version_no > 0),
  lifecycle_state text NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_state IN ('DRAFT','VALIDATED','PUBLISHED','ACTIVE','SUPERSEDED','ARCHIVED')),
  schema_version text NOT NULL,
  component_registry_version text NOT NULL,
  blueprint_json jsonb NOT NULL,
  blueprint_hash text,
  compatibility_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_by_membership_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, template_id, version_no),
  FOREIGN KEY (organization_id, template_id)
    REFERENCES blueprint.templates(organization_id, id),
  FOREIGN KEY (organization_id, created_by_membership_id)
    REFERENCES iam.memberships(organization_id, id),
  CHECK (lifecycle_state NOT IN ('PUBLISHED','ACTIVE','SUPERSEDED','ARCHIVED') OR blueprint_hash IS NOT NULL)
);

CREATE TABLE blueprint.template_fields (
  organization_id uuid NOT NULL,
  template_version_id uuid NOT NULL,
  field_id text NOT NULL,
  component_key text NOT NULL,
  semantic_key text,
  analytics_role text,
  value_type text,
  unit text,
  classification text NOT NULL DEFAULT 'internal',
  publication_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (organization_id, template_version_id, field_id),
  FOREIGN KEY (organization_id, template_version_id)
    REFERENCES blueprint.template_versions(organization_id, id) ON DELETE CASCADE
);

CREATE INDEX template_versions_org_template_state_idx
  ON blueprint.template_versions(organization_id, template_id, lifecycle_state);
CREATE INDEX template_versions_blueprint_gin_idx
  ON blueprint.template_versions USING gin (blueprint_json jsonb_path_ops);
CREATE INDEX template_fields_semantic_idx
  ON blueprint.template_fields(organization_id, semantic_key)
  WHERE semantic_key IS NOT NULL;

CREATE OR REPLACE FUNCTION blueprint.guard_published_version_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lifecycle_state IN ('PUBLISHED','ACTIVE','SUPERSEDED','ARCHIVED') THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.template_id IS DISTINCT FROM OLD.template_id
       OR NEW.version_no IS DISTINCT FROM OLD.version_no
       OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
       OR NEW.component_registry_version IS DISTINCT FROM OLD.component_registry_version
       OR NEW.blueprint_json IS DISTINCT FROM OLD.blueprint_json
       OR NEW.blueprint_hash IS DISTINCT FROM OLD.blueprint_hash
       OR NEW.compatibility_json IS DISTINCT FROM OLD.compatibility_json THEN
      RAISE EXCEPTION 'published template version content is immutable'
        USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_published_template_version ON blueprint.template_versions;
CREATE TRIGGER trg_guard_published_template_version
BEFORE UPDATE ON blueprint.template_versions
FOR EACH ROW EXECUTE FUNCTION blueprint.guard_published_version_immutability();

COMMIT;
