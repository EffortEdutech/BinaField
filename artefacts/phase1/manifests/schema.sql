--
-- PostgreSQL database dump
--

\restrict bIK0BpuazP1Y7k7FppVoESUd9I0XO4zqAOoMLWV3Za3zXKrGGaZXDY5hkfbdXju


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: blueprint; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA blueprint;


--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: evidence; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA evidence;


--
-- Name: field; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA field;


--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iam;


--
-- Name: intel; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA intel;


--
-- Name: ops; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ops;


--
-- Name: platform; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA platform;


--
-- Name: processing; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA processing;


--
-- Name: security; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA security;


--
-- Name: sync; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sync;


--
-- Name: tiger; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA tiger;


--
-- Name: tiger_data; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA tiger_data;


--
-- Name: topology; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA topology;


--
-- Name: SCHEMA topology; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA topology IS 'PostGIS Topology schema';


--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: fuzzystrmatch; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA public;


--
-- Name: EXTENSION fuzzystrmatch; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION fuzzystrmatch IS 'determine similarities and distance between strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: postgis_tiger_geocoder; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder WITH SCHEMA tiger;


--
-- Name: EXTENSION postgis_tiger_geocoder; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis_tiger_geocoder IS 'PostGIS tiger geocoder and reverse geocoder';


--
-- Name: postgis_topology; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA topology;


--
-- Name: EXTENSION postgis_topology; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis_topology IS 'PostGIS topology spatial types and functions';


--
-- Name: guard_published_version_immutability(); Type: FUNCTION; Schema: blueprint; Owner: -
--

CREATE FUNCTION blueprint.guard_published_version_immutability() RETURNS trigger
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


--
-- Name: guard_verified_storage_identity(); Type: FUNCTION; Schema: evidence; Owner: -
--

CREATE FUNCTION evidence.guard_verified_storage_identity() RETURNS trigger
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


--
-- Name: prevent_submission_attempt_mutation(); Type: FUNCTION; Schema: field; Owner: -
--

CREATE FUNCTION field.prevent_submission_attempt_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'submission attempt is immutable'
    USING ERRCODE = '55000';
END;
$$;


--
-- Name: prevent_semantic_mapping_mutation(); Type: FUNCTION; Schema: intel; Owner: -
--

CREATE FUNCTION intel.prevent_semantic_mapping_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN RAISE EXCEPTION 'published semantic mapping is immutable'; END $$;


--
-- Name: current_membership_id(); Type: FUNCTION; Schema: platform; Owner: -
--

CREATE FUNCTION platform.current_membership_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('app.membership_id', true), '')::uuid
$$;


--
-- Name: current_organization_id(); Type: FUNCTION; Schema: platform; Owner: -
--

CREATE FUNCTION platform.current_organization_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;


--
-- Name: FUNCTION current_organization_id(); Type: COMMENT; Schema: platform; Owner: -
--

COMMENT ON FUNCTION platform.current_organization_id() IS 'Trusted transaction-local tenant context. Runtime code must SET LOCAL app.organization_id inside every tenant transaction.';


--
-- Name: current_principal_id(); Type: FUNCTION; Schema: platform; Owner: -
--

CREATE FUNCTION platform.current_principal_id() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT NULLIF(current_setting('app.principal_id', true), '')
$$;


--
-- Name: sync_rls_registry_schema_names(); Type: FUNCTION; Schema: platform; Owner: -
--

CREATE FUNCTION platform.sync_rls_registry_schema_names() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.schema_name IS NULL THEN NEW.schema_name:=NEW.table_schema; END IF;
  IF NEW.table_schema IS NULL THEN NEW.table_schema:=NEW.schema_name; END IF;
  RETURN NEW;
END$$;


--
-- Name: current_organization_id(); Type: FUNCTION; Schema: security; Owner: -
--

CREATE FUNCTION security.current_organization_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT platform.current_organization_id();
$$;


--
-- Name: FUNCTION current_organization_id(); Type: COMMENT; Schema: security; Owner: -
--

COMMENT ON FUNCTION security.current_organization_id() IS 'Compatibility alias for sealed migration 0015. Canonical tenant context helper is platform.current_organization_id().';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_events; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_events (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    actor_type text NOT NULL,
    actor_id text,
    action_key text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    result text NOT NULL,
    reason_code text,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid
);

ALTER TABLE ONLY audit.audit_events FORCE ROW LEVEL SECURITY;


--
-- Name: template_fields; Type: TABLE; Schema: blueprint; Owner: -
--

CREATE TABLE blueprint.template_fields (
    organization_id uuid NOT NULL,
    template_version_id uuid NOT NULL,
    field_id text NOT NULL,
    component_key text NOT NULL,
    semantic_key text,
    analytics_role text,
    value_type text,
    unit text,
    classification text DEFAULT 'internal'::text NOT NULL,
    publication_metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY blueprint.template_fields FORCE ROW LEVEL SECURITY;


--
-- Name: template_versions; Type: TABLE; Schema: blueprint; Owner: -
--

CREATE TABLE blueprint.template_versions (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    template_id uuid NOT NULL,
    version_no integer NOT NULL,
    lifecycle_state text DEFAULT 'DRAFT'::text NOT NULL,
    schema_version text NOT NULL,
    component_registry_version text NOT NULL,
    blueprint_json jsonb NOT NULL,
    blueprint_hash text,
    compatibility_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    published_at timestamp with time zone,
    created_by_membership_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT template_versions_check CHECK (((lifecycle_state <> ALL (ARRAY['PUBLISHED'::text, 'ACTIVE'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text])) OR (blueprint_hash IS NOT NULL))),
    CONSTRAINT template_versions_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['DRAFT'::text, 'VALIDATED'::text, 'PUBLISHED'::text, 'ACTIVE'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT template_versions_revision_check CHECK ((revision > 0)),
    CONSTRAINT template_versions_version_no_check CHECK ((version_no > 0))
);

ALTER TABLE ONLY blueprint.template_versions FORCE ROW LEVEL SECURITY;


--
-- Name: templates; Type: TABLE; Schema: blueprint; Owner: -
--

CREATE TABLE blueprint.templates (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    template_key text NOT NULL,
    name text NOT NULL,
    description text,
    lifecycle_state text DEFAULT 'DRAFT'::text NOT NULL,
    created_by_membership_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT templates_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT templates_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY blueprint.templates FORCE ROW LEVEL SECURITY;


--
-- Name: projects; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.projects (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_code text NOT NULL,
    name text NOT NULL,
    lifecycle_state text DEFAULT 'DRAFT'::text NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT projects_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['DRAFT'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'COMPLETED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT projects_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY core.projects FORCE ROW LEVEL SECURITY;


--
-- Name: team_members; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.team_members (
    organization_id uuid NOT NULL,
    team_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY core.team_members FORCE ROW LEVEL SECURITY;


--
-- Name: teams; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.teams (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY core.teams FORCE ROW LEVEL SECURITY;


--
-- Name: attachments; Type: TABLE; Schema: evidence; Owner: -
--

CREATE TABLE evidence.attachments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    submission_session_id uuid NOT NULL,
    submission_attempt_id uuid,
    submission_id uuid,
    field_id text,
    evidence_type text NOT NULL,
    evidence_role text DEFAULT 'ORIGINAL'::text NOT NULL,
    parent_attachment_id uuid,
    capture_source text,
    hash_algorithm text DEFAULT 'SHA-256'::text NOT NULL,
    content_hash text NOT NULL,
    byte_size bigint NOT NULL,
    claimed_mime_type text,
    detected_mime_type text,
    storage_key text,
    transfer_state text DEFAULT 'QUEUED_FOR_UPLOAD'::text NOT NULL,
    integrity_state text DEFAULT 'PENDING'::text NOT NULL,
    binding_state text DEFAULT 'UNBOUND'::text NOT NULL,
    processing_state text DEFAULT 'PENDING'::text NOT NULL,
    classification text DEFAULT 'internal'::text NOT NULL,
    retention_policy_ref text,
    captured_at timestamp with time zone,
    uploaded_at timestamp with time zone,
    verified_at timestamp with time zone,
    bound_at timestamp with time zone,
    purged_at timestamp with time zone,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_provider text,
    quarantine_reason text,
    CONSTRAINT attachments_binding_state_check CHECK ((binding_state = ANY (ARRAY['UNBOUND'::text, 'BOUND'::text]))),
    CONSTRAINT attachments_byte_size_check CHECK ((byte_size >= 0)),
    CONSTRAINT attachments_capture_source_check CHECK (((capture_source IS NULL) OR (capture_source = ANY (ARRAY['CAMERA_CAPTURE'::text, 'FILE_IMPORT'::text, 'SIGNATURE_RENDER'::text, 'SCANNER_CAPTURE'::text, 'SYSTEM_DERIVATIVE'::text])))),
    CONSTRAINT attachments_check CHECK (((evidence_role = 'DERIVATIVE'::text) = (parent_attachment_id IS NOT NULL))),
    CONSTRAINT attachments_check1 CHECK (((evidence_role <> 'ORIGINAL'::text) OR (parent_attachment_id IS NULL))),
    CONSTRAINT attachments_check2 CHECK (((processing_state <> 'READY'::text) OR ((integrity_state = 'VERIFIED'::text) AND (storage_key IS NOT NULL)))),
    CONSTRAINT attachments_evidence_role_check CHECK ((evidence_role = ANY (ARRAY['ORIGINAL'::text, 'DERIVATIVE'::text]))),
    CONSTRAINT attachments_evidence_type_check CHECK ((evidence_type = ANY (ARRAY['PHOTO'::text, 'SIGNATURE'::text, 'FILE_ATTACHMENT'::text, 'BARCODE_IMAGE'::text]))),
    CONSTRAINT attachments_integrity_state_check CHECK ((integrity_state = ANY (ARRAY['PENDING'::text, 'VERIFIED'::text, 'FAILED'::text, 'QUARANTINED'::text]))),
    CONSTRAINT attachments_processing_state_check CHECK ((processing_state = ANY (ARRAY['PENDING'::text, 'PROCESSING'::text, 'READY'::text, 'FAILED'::text, 'RETAINED'::text, 'PURGED'::text]))),
    CONSTRAINT attachments_transfer_state_check CHECK ((transfer_state = ANY (ARRAY['LOCAL_CAPTURED'::text, 'QUEUED_FOR_UPLOAD'::text, 'UPLOADING'::text, 'UPLOADED'::text, 'FAILED'::text])))
);

ALTER TABLE ONLY evidence.attachments FORCE ROW LEVEL SECURITY;


--
-- Name: bindings; Type: TABLE; Schema: evidence; Owner: -
--

CREATE TABLE evidence.bindings (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    submission_attempt_id uuid NOT NULL,
    submission_id uuid,
    field_id text,
    binding_role text DEFAULT 'REQUIRED'::text NOT NULL,
    bound_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY evidence.bindings FORCE ROW LEVEL SECURITY;


--
-- Name: holds; Type: TABLE; Schema: evidence; Owner: -
--

CREATE TABLE evidence.holds (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    reason text NOT NULL,
    created_by_membership_id uuid NOT NULL,
    released_by_membership_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    CONSTRAINT holds_check CHECK (((released_at IS NULL) = (released_by_membership_id IS NULL)))
);

ALTER TABLE ONLY evidence.holds FORCE ROW LEVEL SECURITY;


--
-- Name: upload_parts; Type: TABLE; Schema: evidence; Owner: -
--

CREATE TABLE evidence.upload_parts (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    upload_session_id uuid NOT NULL,
    part_number integer NOT NULL,
    byte_size bigint,
    provider_etag text,
    checksum text,
    state text DEFAULT 'PENDING'::text NOT NULL,
    uploaded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT upload_parts_part_number_check CHECK ((part_number > 0)),
    CONSTRAINT upload_parts_state_check CHECK ((state = ANY (ARRAY['PENDING'::text, 'UPLOADING'::text, 'UPLOADED'::text, 'FAILED'::text])))
);

ALTER TABLE ONLY evidence.upload_parts FORCE ROW LEVEL SECURITY;


--
-- Name: upload_sessions; Type: TABLE; Schema: evidence; Owner: -
--

CREATE TABLE evidence.upload_sessions (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    attachment_id uuid NOT NULL,
    expected_hash text NOT NULL,
    expected_byte_size bigint NOT NULL,
    expected_mime_type text,
    provider_upload_id text,
    state text DEFAULT 'INITIALISED'::text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    parts_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    upload_strategy text DEFAULT 'SINGLE_PUT'::text NOT NULL,
    finalized_at timestamp with time zone,
    CONSTRAINT upload_sessions_expected_byte_size_check CHECK ((expected_byte_size >= 0)),
    CONSTRAINT upload_sessions_state_check CHECK ((state = ANY (ARRAY['INITIALISED'::text, 'UPLOADING'::text, 'UPLOAD_COMPLETE'::text, 'VERIFYING'::text, 'VERIFIED'::text, 'FAILED'::text, 'EXPIRED'::text, 'ABORTED'::text]))),
    CONSTRAINT upload_sessions_strategy_check CHECK ((upload_strategy = ANY (ARRAY['SINGLE_PUT'::text, 'MULTIPART'::text])))
);

ALTER TABLE ONLY evidence.upload_sessions FORCE ROW LEVEL SECURITY;


--
-- Name: submission_attempts; Type: TABLE; Schema: field; Owner: -
--

CREATE TABLE field.submission_attempts (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    template_version_id uuid NOT NULL,
    submission_session_id uuid NOT NULL,
    attempt_no integer NOT NULL,
    membership_id uuid NOT NULL,
    device_id uuid NOT NULL,
    assignment_revision bigint NOT NULL,
    blueprint_hash text NOT NULL,
    payload_json jsonb NOT NULL,
    payload_hash text NOT NULL,
    evidence_manifest_json jsonb DEFAULT '[]'::jsonb NOT NULL,
    client_completed_at timestamp with time zone,
    client_submitted_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key text NOT NULL,
    correlation_id uuid,
    CONSTRAINT submission_attempts_assignment_revision_check CHECK ((assignment_revision > 0)),
    CONSTRAINT submission_attempts_attempt_no_check CHECK ((attempt_no > 0))
);

ALTER TABLE ONLY field.submission_attempts FORCE ROW LEVEL SECURITY;


--
-- Name: submissions; Type: TABLE; Schema: field; Owner: -
--

CREATE TABLE field.submissions (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    submission_attempt_id uuid NOT NULL,
    lifecycle_state text DEFAULT 'RECEIVED'::text NOT NULL,
    rejection_code text,
    rejection_detail jsonb,
    accepted_at timestamp with time zone,
    rejected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT submissions_check CHECK (((lifecycle_state = 'ACCEPTED'::text) = (accepted_at IS NOT NULL))),
    CONSTRAINT submissions_check1 CHECK (((lifecycle_state = 'REJECTED'::text) = (rejected_at IS NOT NULL))),
    CONSTRAINT submissions_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['RECEIVED'::text, 'VALIDATING'::text, 'ACCEPTED'::text, 'REJECTED'::text]))),
    CONSTRAINT submissions_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY field.submissions FORCE ROW LEVEL SECURITY;


--
-- Name: membership_project_scopes; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.membership_project_scopes (
    organization_id uuid NOT NULL,
    membership_role_id uuid NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY iam.membership_project_scopes FORCE ROW LEVEL SECURITY;


--
-- Name: membership_roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.membership_roles (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    role_id uuid NOT NULL,
    scope_mode text DEFAULT 'ORG_WIDE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_roles_scope_mode_check CHECK ((scope_mode = ANY (ARRAY['ORG_WIDE'::text, 'PROJECT_RESTRICTED'::text])))
);

ALTER TABLE ONLY iam.membership_roles FORCE ROW LEVEL SECURITY;


--
-- Name: memberships; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.memberships (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    lifecycle_state text DEFAULT 'INVITED'::text NOT NULL,
    invited_at timestamp with time zone,
    activated_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memberships_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['INVITED'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])))
);

ALTER TABLE ONLY iam.memberships FORCE ROW LEVEL SECURITY;


--
-- Name: organizations; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.organizations (
    id uuid NOT NULL,
    slug public.citext NOT NULL,
    name text NOT NULL,
    lifecycle_state text DEFAULT 'ACTIVE'::text NOT NULL,
    reporting_timezone text DEFAULT 'UTC'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'ARCHIVED'::text])))
);

ALTER TABLE ONLY iam.organizations FORCE ROW LEVEL SECURITY;


--
-- Name: permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.permissions (
    permission_key text NOT NULL,
    description text NOT NULL,
    introduced_version text DEFAULT '1.0'::text NOT NULL
);


--
-- Name: registered_devices; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.registered_devices (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    platform text NOT NULL,
    app_version text,
    runtime_version text,
    lifecycle_state text DEFAULT 'REGISTERED'::text NOT NULL,
    security_policy_version text,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT registered_devices_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['REGISTERED'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])))
);

ALTER TABLE ONLY iam.registered_devices FORCE ROW LEVEL SECURITY;


--
-- Name: role_permissions; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.role_permissions (
    role_id uuid NOT NULL,
    permission_key text NOT NULL
);

ALTER TABLE ONLY iam.role_permissions FORCE ROW LEVEL SECURITY;


--
-- Name: roles; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.roles (
    id uuid NOT NULL,
    organization_id uuid,
    role_key text NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roles_check CHECK (((is_system AND (organization_id IS NULL)) OR ((NOT is_system) AND (organization_id IS NOT NULL))))
);

ALTER TABLE ONLY iam.roles FORCE ROW LEVEL SECURITY;


--
-- Name: users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.users (
    id uuid NOT NULL,
    identity_subject text NOT NULL,
    email public.citext,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fact_boolean; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_boolean (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    boolean_value boolean NOT NULL
);

ALTER TABLE ONLY intel.fact_boolean FORCE ROW LEVEL SECURITY;


--
-- Name: fact_currency; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_currency (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency_code character(3) NOT NULL
);

ALTER TABLE ONLY intel.fact_currency FORCE ROW LEVEL SECURITY;


--
-- Name: fact_date; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_date (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    date_value date NOT NULL
);

ALTER TABLE ONLY intel.fact_date FORCE ROW LEVEL SECURITY;


--
-- Name: fact_datetime; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_datetime (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    datetime_value timestamp with time zone NOT NULL
);

ALTER TABLE ONLY intel.fact_datetime FORCE ROW LEVEL SECURITY;


--
-- Name: fact_geo; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_geo (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    point public.geography(Point,4326) NOT NULL,
    accuracy_m numeric,
    zone_ref text
);

ALTER TABLE ONLY intel.fact_geo FORCE ROW LEVEL SECURITY;


--
-- Name: fact_numeric; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_numeric (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    numeric_value numeric NOT NULL,
    unit text
);

ALTER TABLE ONLY intel.fact_numeric FORCE ROW LEVEL SECURITY;


--
-- Name: fact_text; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.fact_text (
    organization_id uuid NOT NULL,
    fact_id uuid NOT NULL,
    text_value text NOT NULL
);

ALTER TABLE ONLY intel.fact_text FORCE ROW LEVEL SECURITY;


--
-- Name: insights; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.insights (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    insight_type text NOT NULL,
    definition_key text NOT NULL,
    definition_version integer DEFAULT 1 NOT NULL,
    scope_json jsonb NOT NULL,
    period_json jsonb NOT NULL,
    current_value_json jsonb,
    baseline_value_json jsonb,
    explanation text NOT NULL,
    severity text,
    confidence_descriptor text,
    freshness_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    lifecycle_state text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT insights_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['ACTIVE'::text, 'ACKNOWLEDGED'::text, 'RESOLVED'::text, 'EXPIRED'::text, 'SUPERSEDED'::text])))
);

ALTER TABLE ONLY intel.insights FORCE ROW LEVEL SECURITY;


--
-- Name: metric_definitions; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.metric_definitions (
    id uuid NOT NULL,
    organization_id uuid,
    metric_key text NOT NULL,
    metric_version integer NOT NULL,
    name text NOT NULL,
    description text,
    source_grain text NOT NULL,
    definition_json jsonb NOT NULL,
    classification text DEFAULT 'INTERNAL'::text NOT NULL,
    lifecycle_state text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT metric_definitions_classification_check CHECK ((classification = ANY (ARRAY['PUBLIC_OPERATIONAL'::text, 'INTERNAL'::text, 'CONFIDENTIAL'::text, 'PERSONAL_DATA'::text, 'SENSITIVE_OPERATIONAL'::text]))),
    CONSTRAINT metric_definitions_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['ACTIVE'::text, 'SUPERSEDED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT metric_definitions_metric_version_check CHECK ((metric_version > 0))
);

ALTER TABLE ONLY intel.metric_definitions FORCE ROW LEVEL SECURITY;


--
-- Name: projection_facts; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.projection_facts (
    id uuid NOT NULL,
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
    semantic_key text,
    projection_grain text NOT NULL,
    projection_version text NOT NULL,
    source_accepted_at timestamp with time zone,
    projected_at timestamp with time zone DEFAULT now() NOT NULL,
    classification text DEFAULT 'INTERNAL'::text NOT NULL,
    source_identity text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    value_presence text DEFAULT 'PRESENT'::text NOT NULL,
    team_id uuid,
    field_officer_membership_id uuid,
    source_completed_at timestamp with time zone,
    CONSTRAINT projection_facts_classification_check CHECK ((classification = ANY (ARRAY['PUBLIC_OPERATIONAL'::text, 'INTERNAL'::text, 'CONFIDENTIAL'::text, 'PERSONAL_DATA'::text, 'SENSITIVE_OPERATIONAL'::text]))),
    CONSTRAINT projection_facts_grain_check CHECK ((projection_grain = ANY (ARRAY['SUBMISSION'::text, 'FIELD_VALUE'::text, 'REPEAT_ITEM'::text, 'MULTI_SELECT_VALUE'::text, 'EVIDENCE_FACT'::text, 'ASSIGNMENT_FACT'::text, 'SYNC_FACT'::text, 'WORKFLOW_FACT'::text, 'GEO_POINT'::text]))),
    CONSTRAINT projection_facts_value_presence_check CHECK ((value_presence = ANY (ARRAY['PRESENT'::text, 'NULL'::text])))
);

ALTER TABLE ONLY intel.projection_facts FORCE ROW LEVEL SECURITY;


--
-- Name: projection_freshness; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.projection_freshness (
    organization_id uuid NOT NULL,
    projection_version text NOT NULL,
    lifecycle_state text NOT NULL,
    latest_eligible_source_timestamp timestamp with time zone,
    latest_projected_source_timestamp timestamp with time zone,
    projected_at timestamp with time zone,
    lag_seconds numeric DEFAULT 0 NOT NULL,
    failure_status text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projection_freshness_lag_seconds_check CHECK ((lag_seconds >= (0)::numeric)),
    CONSTRAINT projection_freshness_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['PENDING'::text, 'BUILDING'::text, 'CURRENT'::text, 'STALE'::text, 'FAILED'::text, 'REBUILDING'::text])))
);

ALTER TABLE ONLY intel.projection_freshness FORCE ROW LEVEL SECURITY;


--
-- Name: projection_runs; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.projection_runs (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    projection_version text NOT NULL,
    source_type text NOT NULL,
    source_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
    lifecycle_state text DEFAULT 'PENDING'::text NOT NULL,
    rows_inserted bigint DEFAULT 0 NOT NULL,
    rows_updated bigint DEFAULT 0 NOT NULL,
    rows_invalidated bigint DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_summary text,
    correlation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projection_runs_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['PENDING'::text, 'BUILDING'::text, 'CURRENT'::text, 'FAILED'::text, 'REBUILDING'::text])))
);

ALTER TABLE ONLY intel.projection_runs FORCE ROW LEVEL SECURITY;


--
-- Name: semantic_compatibility; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.semantic_compatibility (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    semantic_key text NOT NULL,
    source_template_version_id uuid NOT NULL,
    target_template_version_id uuid NOT NULL,
    compatibility_state text NOT NULL,
    conversion_key text,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT semantic_compatibility_compatibility_state_check CHECK ((compatibility_state = ANY (ARRAY['COMPATIBLE'::text, 'CONVERTIBLE'::text, 'INCOMPATIBLE'::text, 'UNKNOWN'::text])))
);

ALTER TABLE ONLY intel.semantic_compatibility FORCE ROW LEVEL SECURITY;


--
-- Name: semantic_mappings; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.semantic_mappings (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    template_version_id uuid NOT NULL,
    field_id text NOT NULL,
    semantic_key text NOT NULL,
    value_type text NOT NULL,
    unit text,
    analytics_role text NOT NULL,
    classification text NOT NULL,
    compatibility_state text NOT NULL,
    conversion_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT semantic_mappings_compatibility_state_check CHECK ((compatibility_state = ANY (ARRAY['COMPATIBLE'::text, 'CONVERTIBLE'::text, 'INCOMPATIBLE'::text, 'UNKNOWN'::text])))
);

ALTER TABLE ONLY intel.semantic_mappings FORCE ROW LEVEL SECURITY;


--
-- Name: semantic_registry; Type: TABLE; Schema: intel; Owner: -
--

CREATE TABLE intel.semantic_registry (
    semantic_key text NOT NULL,
    canonical_name text NOT NULL,
    description text,
    value_type text NOT NULL,
    canonical_unit text,
    default_analytical_role text,
    classification_default text DEFAULT 'INTERNAL'::text NOT NULL,
    introduced_version text DEFAULT '1.0'::text NOT NULL,
    deprecated_version text,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT semantic_registry_classification_default_check CHECK ((classification_default = ANY (ARRAY['PUBLIC_OPERATIONAL'::text, 'INTERNAL'::text, 'CONFIDENTIAL'::text, 'PERSONAL_DATA'::text, 'SENSITIVE_OPERATIONAL'::text])))
);


--
-- Name: assignments; Type: TABLE; Schema: ops; Owner: -
--

CREATE TABLE ops.assignments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    deployment_id uuid NOT NULL,
    template_version_id uuid NOT NULL,
    assignee_membership_id uuid,
    assignee_team_id uuid,
    operational_subject_ref jsonb DEFAULT '{}'::jsonb NOT NULL,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    lifecycle_state text DEFAULT 'PLANNED'::text NOT NULL,
    due_at timestamp with time zone,
    issued_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT assignments_check CHECK (((assignee_membership_id IS NOT NULL) OR (assignee_team_id IS NOT NULL) OR (lifecycle_state = 'PLANNED'::text))),
    CONSTRAINT assignments_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['PLANNED'::text, 'ASSIGNED'::text, 'IN_PROGRESS'::text, 'SUBMITTED'::text, 'COMPLETED'::text, 'CANCELLED'::text]))),
    CONSTRAINT assignments_priority_check CHECK ((priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]))),
    CONSTRAINT assignments_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY ops.assignments FORCE ROW LEVEL SECURITY;


--
-- Name: deployments; Type: TABLE; Schema: ops; Owner: -
--

CREATE TABLE ops.deployments (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    project_id uuid NOT NULL,
    template_version_id uuid NOT NULL,
    name text NOT NULL,
    lifecycle_state text DEFAULT 'DRAFT'::text NOT NULL,
    effective_from timestamp with time zone,
    effective_until timestamp with time zone,
    target_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by_membership_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT deployments_check CHECK (((effective_until IS NULL) OR (effective_from IS NULL) OR (effective_until > effective_from))),
    CONSTRAINT deployments_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['DRAFT'::text, 'SCHEDULED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'CLOSED'::text, 'ARCHIVED'::text]))),
    CONSTRAINT deployments_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY ops.deployments FORCE ROW LEVEL SECURITY;


--
-- Name: rls_registry; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.rls_registry (
    schema_name text NOT NULL,
    table_name text NOT NULL,
    policy_mode text DEFAULT 'ORGANIZATION_ID'::text NOT NULL,
    table_schema text NOT NULL,
    tenant_owned boolean DEFAULT true NOT NULL,
    organization_column text DEFAULT 'organization_id'::text,
    rls_enabled boolean DEFAULT true NOT NULL,
    rls_forced boolean DEFAULT true NOT NULL,
    owning_module text,
    runtime_roles text[] DEFAULT ARRAY['app_runtime'::text, 'worker_runtime'::text] NOT NULL,
    notes text,
    CONSTRAINT rls_registry_policy_mode_check CHECK ((policy_mode = ANY (ARRAY['ORGANIZATION_ID'::text, 'ORGANIZATION_ROOT'::text, 'ROLE_VISIBILITY'::text, 'ROLE_PERMISSION_VISIBILITY'::text, 'SYSTEM_OR_ORG'::text])))
);


--
-- Name: schema_metadata; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.schema_metadata (
    singleton boolean DEFAULT true NOT NULL,
    phase text DEFAULT 'P1'::text NOT NULL,
    baseline_version text DEFAULT 'P1-B01'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schema_metadata_singleton_check CHECK (singleton)
);


--
-- Name: schema_migrations; Type: TABLE; Schema: platform; Owner: -
--

CREATE TABLE platform.schema_migrations (
    migration_name text NOT NULL,
    sha256 text NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consumer_receipts; Type: TABLE; Schema: processing; Owner: -
--

CREATE TABLE processing.consumer_receipts (
    consumer_key text NOT NULL,
    event_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    result_code text
);

ALTER TABLE ONLY processing.consumer_receipts FORCE ROW LEVEL SECURITY;


--
-- Name: idempotency_records; Type: TABLE; Schema: processing; Owner: -
--

CREATE TABLE processing.idempotency_records (
    organization_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    operation_type text NOT NULL,
    request_hash text NOT NULL,
    result_reference jsonb,
    state text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT idempotency_records_state_check CHECK ((state = ANY (ARRAY['IN_PROGRESS'::text, 'COMPLETED'::text, 'FAILED_FINAL'::text])))
);

ALTER TABLE ONLY processing.idempotency_records FORCE ROW LEVEL SECURITY;


--
-- Name: outbox_events; Type: TABLE; Schema: processing; Owner: -
--

CREATE TABLE processing.outbox_events (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event_type text NOT NULL,
    event_version integer DEFAULT 1 NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    aggregate_revision bigint,
    payload_json jsonb NOT NULL,
    correlation_id uuid,
    causation_id uuid,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    publish_attempts integer DEFAULT 0 NOT NULL,
    CONSTRAINT outbox_events_event_version_check CHECK ((event_version > 0)),
    CONSTRAINT outbox_events_publish_attempts_check CHECK ((publish_attempts >= 0))
);

ALTER TABLE ONLY processing.outbox_events FORCE ROW LEVEL SECURITY;


--
-- Name: workflow_runs; Type: TABLE; Schema: processing; Owner: -
--

CREATE TABLE processing.workflow_runs (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    route_key text NOT NULL,
    lifecycle_state text DEFAULT 'QUEUED'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    context_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_error_code text,
    next_retry_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revision bigint DEFAULT 1 NOT NULL,
    CONSTRAINT workflow_runs_attempt_count_check CHECK ((attempt_count >= 0)),
    CONSTRAINT workflow_runs_lifecycle_state_check CHECK ((lifecycle_state = ANY (ARRAY['QUEUED'::text, 'RUNNING'::text, 'SUCCEEDED'::text, 'FAILED_RETRYABLE'::text, 'FAILED_FINAL'::text, 'CANCELLED'::text]))),
    CONSTRAINT workflow_runs_revision_check CHECK ((revision > 0))
);

ALTER TABLE ONLY processing.workflow_runs FORCE ROW LEVEL SECURITY;


--
-- Name: change_log; Type: TABLE; Schema: sync; Owner: -
--

CREATE TABLE sync.change_log (
    sequence_id bigint NOT NULL,
    organization_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_revision bigint,
    change_type text NOT NULL,
    payload_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    CONSTRAINT change_log_change_type_check CHECK ((change_type = ANY (ARRAY['UPSERT'::text, 'TOMBSTONE'::text])))
);

ALTER TABLE ONLY sync.change_log FORCE ROW LEVEL SECURITY;


--
-- Name: change_log_sequence_id_seq; Type: SEQUENCE; Schema: sync; Owner: -
--

CREATE SEQUENCE sync.change_log_sequence_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_log_sequence_id_seq; Type: SEQUENCE OWNED BY; Schema: sync; Owner: -
--

ALTER SEQUENCE sync.change_log_sequence_id_seq OWNED BY sync.change_log.sequence_id;


--
-- Name: device_cursors; Type: TABLE; Schema: sync; Owner: -
--

CREATE TABLE sync.device_cursors (
    organization_id uuid NOT NULL,
    device_id uuid NOT NULL,
    cursor_sequence bigint DEFAULT 0 NOT NULL,
    acknowledged_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT device_cursors_cursor_sequence_check CHECK ((cursor_sequence >= 0))
);

ALTER TABLE ONLY sync.device_cursors FORCE ROW LEVEL SECURITY;


--
-- Name: sync_events; Type: TABLE; Schema: sync; Owner: -
--

CREATE TABLE sync.sync_events (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    device_id uuid NOT NULL,
    membership_id uuid,
    operation_id uuid,
    event_type text NOT NULL,
    transport_state text NOT NULL,
    error_code text,
    metadata_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    correlation_id uuid,
    CONSTRAINT sync_events_transport_state_check CHECK ((transport_state = ANY (ARRAY['LOCAL_ONLY'::text, 'QUEUED'::text, 'SYNCING'::text, 'SYNC_FAILED'::text, 'RECONCILIATION_REQUIRED'::text, 'SYNCED'::text])))
);

ALTER TABLE ONLY sync.sync_events FORCE ROW LEVEL SECURITY;


--
-- Name: change_log sequence_id; Type: DEFAULT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.change_log ALTER COLUMN sequence_id SET DEFAULT nextval('sync.change_log_sequence_id_seq'::regclass);


--
-- Name: audit_events audit_events_organization_id_id_key; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_events
    ADD CONSTRAINT audit_events_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: template_fields template_fields_pkey; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_fields
    ADD CONSTRAINT template_fields_pkey PRIMARY KEY (organization_id, template_version_id, field_id);


--
-- Name: template_versions template_versions_organization_id_id_key; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_versions
    ADD CONSTRAINT template_versions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: template_versions template_versions_organization_id_template_id_version_no_key; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_versions
    ADD CONSTRAINT template_versions_organization_id_template_id_version_no_key UNIQUE (organization_id, template_id, version_no);


--
-- Name: template_versions template_versions_pkey; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_versions
    ADD CONSTRAINT template_versions_pkey PRIMARY KEY (id);


--
-- Name: templates templates_organization_id_id_key; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.templates
    ADD CONSTRAINT templates_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: templates templates_organization_id_template_key_key; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.templates
    ADD CONSTRAINT templates_organization_id_template_key_key UNIQUE (organization_id, template_key);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: projects projects_organization_id_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: projects projects_organization_id_project_code_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_organization_id_project_code_key UNIQUE (organization_id, project_code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (organization_id, team_id, membership_id);


--
-- Name: teams teams_organization_id_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.teams
    ADD CONSTRAINT teams_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_organization_id_id_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: bindings bindings_organization_id_attachment_id_submission_attempt_i_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_organization_id_attachment_id_submission_attempt_i_key UNIQUE (organization_id, attachment_id, submission_attempt_id, field_id);


--
-- Name: bindings bindings_organization_id_id_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: bindings bindings_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_pkey PRIMARY KEY (id);


--
-- Name: holds holds_organization_id_id_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.holds
    ADD CONSTRAINT holds_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: holds holds_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.holds
    ADD CONSTRAINT holds_pkey PRIMARY KEY (id);


--
-- Name: upload_parts upload_parts_organization_id_upload_session_id_part_number_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_parts
    ADD CONSTRAINT upload_parts_organization_id_upload_session_id_part_number_key UNIQUE (organization_id, upload_session_id, part_number);


--
-- Name: upload_parts upload_parts_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_parts
    ADD CONSTRAINT upload_parts_pkey PRIMARY KEY (id);


--
-- Name: upload_sessions upload_sessions_organization_id_id_key; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_sessions
    ADD CONSTRAINT upload_sessions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: upload_sessions upload_sessions_pkey; Type: CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_sessions
    ADD CONSTRAINT upload_sessions_pkey PRIMARY KEY (id);


--
-- Name: submission_attempts submission_attempts_organization_id_assignment_id_idempoten_key; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_assignment_id_idempoten_key UNIQUE (organization_id, assignment_id, idempotency_key);


--
-- Name: submission_attempts submission_attempts_organization_id_id_key; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: submission_attempts submission_attempts_organization_id_submission_session_id_a_key; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_submission_session_id_a_key UNIQUE (organization_id, submission_session_id, attempt_no);


--
-- Name: submission_attempts submission_attempts_pkey; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_organization_id_id_key; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: submissions submissions_organization_id_submission_attempt_id_key; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_organization_id_submission_attempt_id_key UNIQUE (organization_id, submission_attempt_id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: membership_project_scopes membership_project_scopes_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_project_scopes
    ADD CONSTRAINT membership_project_scopes_pkey PRIMARY KEY (organization_id, membership_role_id, project_id);


--
-- Name: membership_roles membership_roles_organization_id_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_roles
    ADD CONSTRAINT membership_roles_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: membership_roles membership_roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_roles
    ADD CONSTRAINT membership_roles_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_organization_id_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.memberships
    ADD CONSTRAINT memberships_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: memberships memberships_organization_id_user_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.memberships
    ADD CONSTRAINT memberships_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_key);


--
-- Name: registered_devices registered_devices_organization_id_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.registered_devices
    ADD CONSTRAINT registered_devices_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: registered_devices registered_devices_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.registered_devices
    ADD CONSTRAINT registered_devices_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_key);


--
-- Name: roles roles_organization_id_id_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: users users_identity_subject_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_identity_subject_key UNIQUE (identity_subject);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: fact_boolean fact_boolean_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_boolean
    ADD CONSTRAINT fact_boolean_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_currency fact_currency_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_currency
    ADD CONSTRAINT fact_currency_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_date fact_date_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_date
    ADD CONSTRAINT fact_date_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_datetime fact_datetime_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_datetime
    ADD CONSTRAINT fact_datetime_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_geo fact_geo_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_geo
    ADD CONSTRAINT fact_geo_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_numeric fact_numeric_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_numeric
    ADD CONSTRAINT fact_numeric_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: fact_text fact_text_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_text
    ADD CONSTRAINT fact_text_pkey PRIMARY KEY (organization_id, fact_id);


--
-- Name: insights insights_organization_id_id_key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.insights
    ADD CONSTRAINT insights_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: metric_definitions metric_definitions_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.metric_definitions
    ADD CONSTRAINT metric_definitions_pkey PRIMARY KEY (id);


--
-- Name: projection_facts projection_facts_organization_id_id_key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_projection_version_source__key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_projection_version_source__key UNIQUE (organization_id, projection_version, source_identity);


--
-- Name: projection_facts projection_facts_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_pkey PRIMARY KEY (id);


--
-- Name: projection_freshness projection_freshness_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_freshness
    ADD CONSTRAINT projection_freshness_pkey PRIMARY KEY (organization_id, projection_version);


--
-- Name: projection_runs projection_runs_organization_id_id_key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_runs
    ADD CONSTRAINT projection_runs_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: projection_runs projection_runs_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_runs
    ADD CONSTRAINT projection_runs_pkey PRIMARY KEY (id);


--
-- Name: semantic_compatibility semantic_compatibility_organization_id_id_key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: semantic_compatibility semantic_compatibility_organization_id_semantic_key_source__key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_organization_id_semantic_key_source__key UNIQUE (organization_id, semantic_key, source_template_version_id, target_template_version_id);


--
-- Name: semantic_compatibility semantic_compatibility_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_pkey PRIMARY KEY (id);


--
-- Name: semantic_mappings semantic_mappings_organization_id_template_version_id_field_key; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_mappings
    ADD CONSTRAINT semantic_mappings_organization_id_template_version_id_field_key UNIQUE (organization_id, template_version_id, field_id);


--
-- Name: semantic_mappings semantic_mappings_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_mappings
    ADD CONSTRAINT semantic_mappings_pkey PRIMARY KEY (id);


--
-- Name: semantic_registry semantic_registry_pkey; Type: CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_registry
    ADD CONSTRAINT semantic_registry_pkey PRIMARY KEY (semantic_key);


--
-- Name: assignments assignments_organization_id_id_key; Type: CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: deployments deployments_organization_id_id_key; Type: CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.deployments
    ADD CONSTRAINT deployments_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: deployments deployments_pkey; Type: CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.deployments
    ADD CONSTRAINT deployments_pkey PRIMARY KEY (id);


--
-- Name: rls_registry rls_registry_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.rls_registry
    ADD CONSTRAINT rls_registry_pkey PRIMARY KEY (schema_name, table_name);


--
-- Name: schema_metadata schema_metadata_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.schema_metadata
    ADD CONSTRAINT schema_metadata_pkey PRIMARY KEY (singleton);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: platform; Owner: -
--

ALTER TABLE ONLY platform.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (migration_name);


--
-- Name: consumer_receipts consumer_receipts_pkey; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.consumer_receipts
    ADD CONSTRAINT consumer_receipts_pkey PRIMARY KEY (consumer_key, event_id);


--
-- Name: idempotency_records idempotency_records_pkey; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.idempotency_records
    ADD CONSTRAINT idempotency_records_pkey PRIMARY KEY (organization_id, idempotency_key, operation_type);


--
-- Name: outbox_events outbox_events_organization_id_id_key; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.outbox_events
    ADD CONSTRAINT outbox_events_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: workflow_runs workflow_runs_organization_id_id_key; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.workflow_runs
    ADD CONSTRAINT workflow_runs_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: workflow_runs workflow_runs_pkey; Type: CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.workflow_runs
    ADD CONSTRAINT workflow_runs_pkey PRIMARY KEY (id);


--
-- Name: change_log change_log_organization_id_sequence_id_key; Type: CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.change_log
    ADD CONSTRAINT change_log_organization_id_sequence_id_key UNIQUE (organization_id, sequence_id);


--
-- Name: change_log change_log_pkey; Type: CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.change_log
    ADD CONSTRAINT change_log_pkey PRIMARY KEY (sequence_id);


--
-- Name: device_cursors device_cursors_pkey; Type: CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.device_cursors
    ADD CONSTRAINT device_cursors_pkey PRIMARY KEY (organization_id, device_id);


--
-- Name: sync_events sync_events_organization_id_id_key; Type: CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.sync_events
    ADD CONSTRAINT sync_events_organization_id_id_key UNIQUE (organization_id, id);


--
-- Name: sync_events sync_events_pkey; Type: CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.sync_events
    ADD CONSTRAINT sync_events_pkey PRIMARY KEY (id);


--
-- Name: audit_events_org_time_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX audit_events_org_time_idx ON audit.audit_events USING btree (organization_id, occurred_at DESC);


--
-- Name: template_fields_semantic_idx; Type: INDEX; Schema: blueprint; Owner: -
--

CREATE INDEX template_fields_semantic_idx ON blueprint.template_fields USING btree (organization_id, semantic_key) WHERE (semantic_key IS NOT NULL);


--
-- Name: template_versions_blueprint_gin_idx; Type: INDEX; Schema: blueprint; Owner: -
--

CREATE INDEX template_versions_blueprint_gin_idx ON blueprint.template_versions USING gin (blueprint_json jsonb_path_ops);


--
-- Name: template_versions_org_template_state_idx; Type: INDEX; Schema: blueprint; Owner: -
--

CREATE INDEX template_versions_org_template_state_idx ON blueprint.template_versions USING btree (organization_id, template_id, lifecycle_state);


--
-- Name: projects_org_state_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX projects_org_state_idx ON core.projects USING btree (organization_id, lifecycle_state);


--
-- Name: teams_org_project_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX teams_org_project_idx ON core.teams USING btree (organization_id, project_id);


--
-- Name: attachments_integrity_idx; Type: INDEX; Schema: evidence; Owner: -
--

CREATE INDEX attachments_integrity_idx ON evidence.attachments USING btree (organization_id, integrity_state, processing_state);


--
-- Name: attachments_org_assignment_idx; Type: INDEX; Schema: evidence; Owner: -
--

CREATE INDEX attachments_org_assignment_idx ON evidence.attachments USING btree (organization_id, assignment_id, created_at DESC);


--
-- Name: attachments_org_submission_idx; Type: INDEX; Schema: evidence; Owner: -
--

CREATE INDEX attachments_org_submission_idx ON evidence.attachments USING btree (organization_id, submission_id) WHERE (submission_id IS NOT NULL);


--
-- Name: upload_sessions_active_idx; Type: INDEX; Schema: evidence; Owner: -
--

CREATE INDEX upload_sessions_active_idx ON evidence.upload_sessions USING btree (organization_id, state, expires_at) WHERE (state = ANY (ARRAY['INITIALISED'::text, 'UPLOADING'::text]));


--
-- Name: submission_attempts_org_assignment_idx; Type: INDEX; Schema: field; Owner: -
--

CREATE INDEX submission_attempts_org_assignment_idx ON field.submission_attempts USING btree (organization_id, assignment_id, received_at DESC);


--
-- Name: submission_attempts_payload_gin_idx; Type: INDEX; Schema: field; Owner: -
--

CREATE INDEX submission_attempts_payload_gin_idx ON field.submission_attempts USING gin (payload_json jsonb_path_ops);


--
-- Name: submissions_org_state_idx; Type: INDEX; Schema: field; Owner: -
--

CREATE INDEX submissions_org_state_idx ON field.submissions USING btree (organization_id, lifecycle_state, created_at DESC);


--
-- Name: memberships_org_state_idx; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX memberships_org_state_idx ON iam.memberships USING btree (organization_id, lifecycle_state);


--
-- Name: registered_devices_org_membership_idx; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX registered_devices_org_membership_idx ON iam.registered_devices USING btree (organization_id, membership_id);


--
-- Name: roles_org_key_uq; Type: INDEX; Schema: iam; Owner: -
--

CREATE UNIQUE INDEX roles_org_key_uq ON iam.roles USING btree (organization_id, role_key) WHERE (NOT is_system);


--
-- Name: roles_system_key_uq; Type: INDEX; Schema: iam; Owner: -
--

CREATE UNIQUE INDEX roles_system_key_uq ON iam.roles USING btree (role_key) WHERE is_system;


--
-- Name: fact_geo_gist_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX fact_geo_gist_idx ON intel.fact_geo USING gist (point);


--
-- Name: insights_org_state_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX insights_org_state_idx ON intel.insights USING btree (organization_id, lifecycle_state, created_at DESC);


--
-- Name: metric_definitions_org_uq; Type: INDEX; Schema: intel; Owner: -
--

CREATE UNIQUE INDEX metric_definitions_org_uq ON intel.metric_definitions USING btree (organization_id, metric_key, metric_version) WHERE (organization_id IS NOT NULL);


--
-- Name: metric_definitions_system_uq; Type: INDEX; Schema: intel; Owner: -
--

CREATE UNIQUE INDEX metric_definitions_system_uq ON intel.metric_definitions USING btree (metric_key, metric_version) WHERE (organization_id IS NULL);


--
-- Name: projection_facts_org_assignment_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX projection_facts_org_assignment_idx ON intel.projection_facts USING btree (organization_id, assignment_id) WHERE ((assignment_id IS NOT NULL) AND active);


--
-- Name: projection_facts_org_grain_time_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX projection_facts_org_grain_time_idx ON intel.projection_facts USING btree (organization_id, projection_grain, source_accepted_at DESC) WHERE active;


--
-- Name: projection_facts_org_project_grain_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX projection_facts_org_project_grain_idx ON intel.projection_facts USING btree (organization_id, project_id, projection_grain) WHERE active;


--
-- Name: projection_facts_org_semantic_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX projection_facts_org_semantic_idx ON intel.projection_facts USING btree (organization_id, semantic_key, projected_at DESC) WHERE ((semantic_key IS NOT NULL) AND active);


--
-- Name: projection_facts_org_submission_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX projection_facts_org_submission_idx ON intel.projection_facts USING btree (organization_id, submission_id) WHERE ((submission_id IS NOT NULL) AND active);


--
-- Name: semantic_mappings_org_semantic_idx; Type: INDEX; Schema: intel; Owner: -
--

CREATE INDEX semantic_mappings_org_semantic_idx ON intel.semantic_mappings USING btree (organization_id, semantic_key, template_version_id);


--
-- Name: assignments_due_open_idx; Type: INDEX; Schema: ops; Owner: -
--

CREATE INDEX assignments_due_open_idx ON ops.assignments USING btree (organization_id, due_at) WHERE ((lifecycle_state <> ALL (ARRAY['COMPLETED'::text, 'CANCELLED'::text])) AND (due_at IS NOT NULL));


--
-- Name: assignments_org_assignee_idx; Type: INDEX; Schema: ops; Owner: -
--

CREATE INDEX assignments_org_assignee_idx ON ops.assignments USING btree (organization_id, assignee_membership_id, lifecycle_state) WHERE (assignee_membership_id IS NOT NULL);


--
-- Name: assignments_org_project_state_idx; Type: INDEX; Schema: ops; Owner: -
--

CREATE INDEX assignments_org_project_state_idx ON ops.assignments USING btree (organization_id, project_id, lifecycle_state);


--
-- Name: deployments_org_project_state_idx; Type: INDEX; Schema: ops; Owner: -
--

CREATE INDEX deployments_org_project_state_idx ON ops.deployments USING btree (organization_id, project_id, lifecycle_state);


--
-- Name: rls_registry_table_schema_table_name_uq; Type: INDEX; Schema: platform; Owner: -
--

CREATE UNIQUE INDEX rls_registry_table_schema_table_name_uq ON platform.rls_registry USING btree (table_schema, table_name);


--
-- Name: outbox_unpublished_idx; Type: INDEX; Schema: processing; Owner: -
--

CREATE INDEX outbox_unpublished_idx ON processing.outbox_events USING btree (organization_id, occurred_at) WHERE (published_at IS NULL);


--
-- Name: workflow_runs_org_state_retry_idx; Type: INDEX; Schema: processing; Owner: -
--

CREATE INDEX workflow_runs_org_state_retry_idx ON processing.workflow_runs USING btree (organization_id, lifecycle_state, next_retry_at);


--
-- Name: change_log_org_sequence_idx; Type: INDEX; Schema: sync; Owner: -
--

CREATE INDEX change_log_org_sequence_idx ON sync.change_log USING btree (organization_id, sequence_id);


--
-- Name: sync_events_org_device_idx; Type: INDEX; Schema: sync; Owner: -
--

CREATE INDEX sync_events_org_device_idx ON sync.sync_events USING btree (organization_id, device_id, occurred_at DESC);


--
-- Name: template_versions trg_guard_published_template_version; Type: TRIGGER; Schema: blueprint; Owner: -
--

CREATE TRIGGER trg_guard_published_template_version BEFORE UPDATE ON blueprint.template_versions FOR EACH ROW EXECUTE FUNCTION blueprint.guard_published_version_immutability();


--
-- Name: attachments trg_guard_evidence_storage_identity; Type: TRIGGER; Schema: evidence; Owner: -
--

CREATE TRIGGER trg_guard_evidence_storage_identity BEFORE UPDATE ON evidence.attachments FOR EACH ROW EXECUTE FUNCTION evidence.guard_verified_storage_identity();


--
-- Name: submission_attempts trg_submission_attempt_immutable_update; Type: TRIGGER; Schema: field; Owner: -
--

CREATE TRIGGER trg_submission_attempt_immutable_update BEFORE DELETE OR UPDATE ON field.submission_attempts FOR EACH ROW EXECUTE FUNCTION field.prevent_submission_attempt_mutation();


--
-- Name: semantic_mappings trg_semantic_mapping_immutable; Type: TRIGGER; Schema: intel; Owner: -
--

CREATE TRIGGER trg_semantic_mapping_immutable BEFORE DELETE OR UPDATE ON intel.semantic_mappings FOR EACH ROW EXECUTE FUNCTION intel.prevent_semantic_mapping_mutation();


--
-- Name: rls_registry trg_sync_rls_registry_schema_names; Type: TRIGGER; Schema: platform; Owner: -
--

CREATE TRIGGER trg_sync_rls_registry_schema_names BEFORE INSERT OR UPDATE ON platform.rls_registry FOR EACH ROW EXECUTE FUNCTION platform.sync_rls_registry_schema_names();


--
-- Name: audit_events audit_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_events
    ADD CONSTRAINT audit_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: template_fields template_fields_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_fields
    ADD CONSTRAINT template_fields_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id) ON DELETE CASCADE;


--
-- Name: template_versions template_versions_organization_id_created_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_versions
    ADD CONSTRAINT template_versions_organization_id_created_by_membership_id_fkey FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: template_versions template_versions_organization_id_template_id_fkey; Type: FK CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.template_versions
    ADD CONSTRAINT template_versions_organization_id_template_id_fkey FOREIGN KEY (organization_id, template_id) REFERENCES blueprint.templates(organization_id, id);


--
-- Name: templates templates_organization_id_created_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.templates
    ADD CONSTRAINT templates_organization_id_created_by_membership_id_fkey FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: templates templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: blueprint; Owner: -
--

ALTER TABLE ONLY blueprint.templates
    ADD CONSTRAINT templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: projects projects_organization_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.projects
    ADD CONSTRAINT projects_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: team_members team_members_organization_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.team_members
    ADD CONSTRAINT team_members_organization_id_membership_id_fkey FOREIGN KEY (organization_id, membership_id) REFERENCES iam.memberships(organization_id, id) ON DELETE CASCADE;


--
-- Name: team_members team_members_organization_id_team_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.team_members
    ADD CONSTRAINT team_members_organization_id_team_id_fkey FOREIGN KEY (organization_id, team_id) REFERENCES core.teams(organization_id, id) ON DELETE CASCADE;


--
-- Name: teams teams_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.teams
    ADD CONSTRAINT teams_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: attachments attachments_organization_id_assignment_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_assignment_id_fkey FOREIGN KEY (organization_id, assignment_id) REFERENCES ops.assignments(organization_id, id);


--
-- Name: attachments attachments_organization_id_parent_attachment_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_parent_attachment_id_fkey FOREIGN KEY (organization_id, parent_attachment_id) REFERENCES evidence.attachments(organization_id, id);


--
-- Name: attachments attachments_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: attachments attachments_organization_id_submission_attempt_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_submission_attempt_id_fkey FOREIGN KEY (organization_id, submission_attempt_id) REFERENCES field.submission_attempts(organization_id, id);


--
-- Name: attachments attachments_organization_id_submission_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.attachments
    ADD CONSTRAINT attachments_organization_id_submission_id_fkey FOREIGN KEY (organization_id, submission_id) REFERENCES field.submissions(organization_id, id);


--
-- Name: bindings bindings_organization_id_attachment_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_organization_id_attachment_id_fkey FOREIGN KEY (organization_id, attachment_id) REFERENCES evidence.attachments(organization_id, id);


--
-- Name: bindings bindings_organization_id_submission_attempt_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_organization_id_submission_attempt_id_fkey FOREIGN KEY (organization_id, submission_attempt_id) REFERENCES field.submission_attempts(organization_id, id);


--
-- Name: bindings bindings_organization_id_submission_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.bindings
    ADD CONSTRAINT bindings_organization_id_submission_id_fkey FOREIGN KEY (organization_id, submission_id) REFERENCES field.submissions(organization_id, id);


--
-- Name: holds holds_organization_id_attachment_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.holds
    ADD CONSTRAINT holds_organization_id_attachment_id_fkey FOREIGN KEY (organization_id, attachment_id) REFERENCES evidence.attachments(organization_id, id);


--
-- Name: holds holds_organization_id_created_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.holds
    ADD CONSTRAINT holds_organization_id_created_by_membership_id_fkey FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: holds holds_organization_id_released_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.holds
    ADD CONSTRAINT holds_organization_id_released_by_membership_id_fkey FOREIGN KEY (organization_id, released_by_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: upload_parts upload_parts_organization_id_upload_session_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_parts
    ADD CONSTRAINT upload_parts_organization_id_upload_session_id_fkey FOREIGN KEY (organization_id, upload_session_id) REFERENCES evidence.upload_sessions(organization_id, id) ON DELETE CASCADE;


--
-- Name: upload_sessions upload_sessions_organization_id_attachment_id_fkey; Type: FK CONSTRAINT; Schema: evidence; Owner: -
--

ALTER TABLE ONLY evidence.upload_sessions
    ADD CONSTRAINT upload_sessions_organization_id_attachment_id_fkey FOREIGN KEY (organization_id, attachment_id) REFERENCES evidence.attachments(organization_id, id) ON DELETE CASCADE;


--
-- Name: submission_attempts submission_attempts_organization_id_assignment_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_assignment_id_fkey FOREIGN KEY (organization_id, assignment_id) REFERENCES ops.assignments(organization_id, id);


--
-- Name: submission_attempts submission_attempts_organization_id_device_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_device_id_fkey FOREIGN KEY (organization_id, device_id) REFERENCES iam.registered_devices(organization_id, id);


--
-- Name: submission_attempts submission_attempts_organization_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_membership_id_fkey FOREIGN KEY (organization_id, membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: submission_attempts submission_attempts_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: submission_attempts submission_attempts_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submission_attempts
    ADD CONSTRAINT submission_attempts_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: submissions submissions_organization_id_assignment_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_organization_id_assignment_id_fkey FOREIGN KEY (organization_id, assignment_id) REFERENCES ops.assignments(organization_id, id);


--
-- Name: submissions submissions_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: submissions submissions_organization_id_submission_attempt_id_fkey; Type: FK CONSTRAINT; Schema: field; Owner: -
--

ALTER TABLE ONLY field.submissions
    ADD CONSTRAINT submissions_organization_id_submission_attempt_id_fkey FOREIGN KEY (organization_id, submission_attempt_id) REFERENCES field.submission_attempts(organization_id, id);


--
-- Name: membership_project_scopes membership_project_scopes_organization_id_membership_role__fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_project_scopes
    ADD CONSTRAINT membership_project_scopes_organization_id_membership_role__fkey FOREIGN KEY (organization_id, membership_role_id) REFERENCES iam.membership_roles(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_project_scopes membership_project_scopes_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_project_scopes
    ADD CONSTRAINT membership_project_scopes_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_roles membership_roles_organization_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_roles
    ADD CONSTRAINT membership_roles_organization_id_membership_id_fkey FOREIGN KEY (organization_id, membership_id) REFERENCES iam.memberships(organization_id, id) ON DELETE CASCADE;


--
-- Name: membership_roles membership_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.membership_roles
    ADD CONSTRAINT membership_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id);


--
-- Name: memberships memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.memberships
    ADD CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id);


--
-- Name: registered_devices registered_devices_organization_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.registered_devices
    ADD CONSTRAINT registered_devices_organization_id_membership_id_fkey FOREIGN KEY (organization_id, membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: role_permissions role_permissions_permission_key_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES iam.permissions(permission_key) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.roles(id) ON DELETE CASCADE;


--
-- Name: fact_boolean fact_boolean_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_boolean
    ADD CONSTRAINT fact_boolean_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_currency fact_currency_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_currency
    ADD CONSTRAINT fact_currency_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_date fact_date_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_date
    ADD CONSTRAINT fact_date_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_datetime fact_datetime_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_datetime
    ADD CONSTRAINT fact_datetime_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_geo fact_geo_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_geo
    ADD CONSTRAINT fact_geo_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_numeric fact_numeric_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_numeric
    ADD CONSTRAINT fact_numeric_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: fact_text fact_text_organization_id_fact_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.fact_text
    ADD CONSTRAINT fact_text_organization_id_fact_id_fkey FOREIGN KEY (organization_id, fact_id) REFERENCES intel.projection_facts(organization_id, id) ON DELETE CASCADE;


--
-- Name: insights insights_organization_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.insights
    ADD CONSTRAINT insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: metric_definitions metric_definitions_organization_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.metric_definitions
    ADD CONSTRAINT metric_definitions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: projection_facts projection_facts_officer_fk; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_officer_fk FOREIGN KEY (organization_id, field_officer_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_assignment_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_assignment_id_fkey FOREIGN KEY (organization_id, assignment_id) REFERENCES ops.assignments(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_deployment_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_deployment_id_fkey FOREIGN KEY (organization_id, deployment_id) REFERENCES ops.deployments(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: projection_facts projection_facts_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_submission_attempt_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_submission_attempt_id_fkey FOREIGN KEY (organization_id, submission_attempt_id) REFERENCES field.submission_attempts(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_submission_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_submission_id_fkey FOREIGN KEY (organization_id, submission_id) REFERENCES field.submissions(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_template_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_template_id_fkey FOREIGN KEY (organization_id, template_id) REFERENCES blueprint.templates(organization_id, id);


--
-- Name: projection_facts projection_facts_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: projection_facts projection_facts_semantic_key_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_semantic_key_fkey FOREIGN KEY (semantic_key) REFERENCES intel.semantic_registry(semantic_key);


--
-- Name: projection_facts projection_facts_team_fk; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_facts
    ADD CONSTRAINT projection_facts_team_fk FOREIGN KEY (organization_id, team_id) REFERENCES core.teams(organization_id, id);


--
-- Name: projection_freshness projection_freshness_organization_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_freshness
    ADD CONSTRAINT projection_freshness_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: projection_runs projection_runs_organization_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.projection_runs
    ADD CONSTRAINT projection_runs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: semantic_compatibility semantic_compatibility_organization_id_source_template_ver_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_organization_id_source_template_ver_fkey FOREIGN KEY (organization_id, source_template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: semantic_compatibility semantic_compatibility_organization_id_target_template_ver_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_organization_id_target_template_ver_fkey FOREIGN KEY (organization_id, target_template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: semantic_compatibility semantic_compatibility_semantic_key_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_compatibility
    ADD CONSTRAINT semantic_compatibility_semantic_key_fkey FOREIGN KEY (semantic_key) REFERENCES intel.semantic_registry(semantic_key);


--
-- Name: semantic_mappings semantic_mappings_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_mappings
    ADD CONSTRAINT semantic_mappings_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: semantic_mappings semantic_mappings_semantic_key_fkey; Type: FK CONSTRAINT; Schema: intel; Owner: -
--

ALTER TABLE ONLY intel.semantic_mappings
    ADD CONSTRAINT semantic_mappings_semantic_key_fkey FOREIGN KEY (semantic_key) REFERENCES intel.semantic_registry(semantic_key);


--
-- Name: assignments assignments_organization_id_assignee_membership_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_assignee_membership_id_fkey FOREIGN KEY (organization_id, assignee_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: assignments assignments_organization_id_assignee_team_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_assignee_team_id_fkey FOREIGN KEY (organization_id, assignee_team_id) REFERENCES core.teams(organization_id, id);


--
-- Name: assignments assignments_organization_id_deployment_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_deployment_id_fkey FOREIGN KEY (organization_id, deployment_id) REFERENCES ops.deployments(organization_id, id);


--
-- Name: assignments assignments_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: assignments assignments_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.assignments
    ADD CONSTRAINT assignments_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: deployments deployments_organization_id_created_by_membership_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.deployments
    ADD CONSTRAINT deployments_organization_id_created_by_membership_id_fkey FOREIGN KEY (organization_id, created_by_membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: deployments deployments_organization_id_project_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.deployments
    ADD CONSTRAINT deployments_organization_id_project_id_fkey FOREIGN KEY (organization_id, project_id) REFERENCES core.projects(organization_id, id);


--
-- Name: deployments deployments_organization_id_template_version_id_fkey; Type: FK CONSTRAINT; Schema: ops; Owner: -
--

ALTER TABLE ONLY ops.deployments
    ADD CONSTRAINT deployments_organization_id_template_version_id_fkey FOREIGN KEY (organization_id, template_version_id) REFERENCES blueprint.template_versions(organization_id, id);


--
-- Name: consumer_receipts consumer_receipts_organization_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.consumer_receipts
    ADD CONSTRAINT consumer_receipts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: idempotency_records idempotency_records_organization_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.idempotency_records
    ADD CONSTRAINT idempotency_records_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: outbox_events outbox_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.outbox_events
    ADD CONSTRAINT outbox_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: workflow_runs workflow_runs_organization_id_submission_id_fkey; Type: FK CONSTRAINT; Schema: processing; Owner: -
--

ALTER TABLE ONLY processing.workflow_runs
    ADD CONSTRAINT workflow_runs_organization_id_submission_id_fkey FOREIGN KEY (organization_id, submission_id) REFERENCES field.submissions(organization_id, id);


--
-- Name: change_log change_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.change_log
    ADD CONSTRAINT change_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES iam.organizations(id);


--
-- Name: device_cursors device_cursors_organization_id_device_id_fkey; Type: FK CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.device_cursors
    ADD CONSTRAINT device_cursors_organization_id_device_id_fkey FOREIGN KEY (organization_id, device_id) REFERENCES iam.registered_devices(organization_id, id) ON DELETE CASCADE;


--
-- Name: sync_events sync_events_organization_id_device_id_fkey; Type: FK CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.sync_events
    ADD CONSTRAINT sync_events_organization_id_device_id_fkey FOREIGN KEY (organization_id, device_id) REFERENCES iam.registered_devices(organization_id, id);


--
-- Name: sync_events sync_events_organization_id_membership_id_fkey; Type: FK CONSTRAINT; Schema: sync; Owner: -
--

ALTER TABLE ONLY sync.sync_events
    ADD CONSTRAINT sync_events_organization_id_membership_id_fkey FOREIGN KEY (organization_id, membership_id) REFERENCES iam.memberships(organization_id, id);


--
-- Name: audit_events; Type: ROW SECURITY; Schema: audit; Owner: -
--

ALTER TABLE audit.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events tenant_isolation; Type: POLICY; Schema: audit; Owner: -
--

CREATE POLICY tenant_isolation ON audit.audit_events USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: template_fields; Type: ROW SECURITY; Schema: blueprint; Owner: -
--

ALTER TABLE blueprint.template_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: template_versions; Type: ROW SECURITY; Schema: blueprint; Owner: -
--

ALTER TABLE blueprint.template_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: blueprint; Owner: -
--

ALTER TABLE blueprint.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: template_fields tenant_isolation; Type: POLICY; Schema: blueprint; Owner: -
--

CREATE POLICY tenant_isolation ON blueprint.template_fields USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: template_versions tenant_isolation; Type: POLICY; Schema: blueprint; Owner: -
--

CREATE POLICY tenant_isolation ON blueprint.template_versions USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: templates tenant_isolation; Type: POLICY; Schema: blueprint; Owner: -
--

CREATE POLICY tenant_isolation ON blueprint.templates USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: projects; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: projects tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.projects USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: team_members tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.team_members USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: teams tenant_isolation; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY tenant_isolation ON core.teams USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: attachments; Type: ROW SECURITY; Schema: evidence; Owner: -
--

ALTER TABLE evidence.attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: bindings; Type: ROW SECURITY; Schema: evidence; Owner: -
--

ALTER TABLE evidence.bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: holds; Type: ROW SECURITY; Schema: evidence; Owner: -
--

ALTER TABLE evidence.holds ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments tenant_isolation; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY tenant_isolation ON evidence.attachments USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: bindings tenant_isolation; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY tenant_isolation ON evidence.bindings USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: holds tenant_isolation; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY tenant_isolation ON evidence.holds USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: upload_sessions tenant_isolation; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY tenant_isolation ON evidence.upload_sessions USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: upload_parts; Type: ROW SECURITY; Schema: evidence; Owner: -
--

ALTER TABLE evidence.upload_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: upload_parts upload_parts_tenant_delete; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY upload_parts_tenant_delete ON evidence.upload_parts FOR DELETE USING ((organization_id = security.current_organization_id()));


--
-- Name: upload_parts upload_parts_tenant_insert; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY upload_parts_tenant_insert ON evidence.upload_parts FOR INSERT WITH CHECK ((organization_id = security.current_organization_id()));


--
-- Name: upload_parts upload_parts_tenant_select; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY upload_parts_tenant_select ON evidence.upload_parts FOR SELECT USING ((organization_id = security.current_organization_id()));


--
-- Name: upload_parts upload_parts_tenant_update; Type: POLICY; Schema: evidence; Owner: -
--

CREATE POLICY upload_parts_tenant_update ON evidence.upload_parts FOR UPDATE USING ((organization_id = security.current_organization_id())) WITH CHECK ((organization_id = security.current_organization_id()));


--
-- Name: upload_sessions; Type: ROW SECURITY; Schema: evidence; Owner: -
--

ALTER TABLE evidence.upload_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_attempts; Type: ROW SECURITY; Schema: field; Owner: -
--

ALTER TABLE field.submission_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: submissions; Type: ROW SECURITY; Schema: field; Owner: -
--

ALTER TABLE field.submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: submission_attempts tenant_isolation; Type: POLICY; Schema: field; Owner: -
--

CREATE POLICY tenant_isolation ON field.submission_attempts USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: submissions tenant_isolation; Type: POLICY; Schema: field; Owner: -
--

CREATE POLICY tenant_isolation ON field.submissions USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: membership_project_scopes; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.membership_project_scopes ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_roles; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.membership_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: registered_devices; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.registered_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permission_visibility; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY role_permission_visibility ON iam.role_permissions USING ((EXISTS ( SELECT 1
   FROM iam.roles r
  WHERE ((r.id = role_permissions.role_id) AND (r.is_system OR (r.organization_id = platform.current_organization_id()))))));


--
-- Name: role_permissions; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: roles role_visibility; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY role_visibility ON iam.roles USING ((is_system OR (organization_id = platform.current_organization_id()))) WITH CHECK (((NOT is_system) AND (organization_id = platform.current_organization_id())));


--
-- Name: roles; Type: ROW SECURITY; Schema: iam; Owner: -
--

ALTER TABLE iam.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_project_scopes tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation ON iam.membership_project_scopes USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: membership_roles tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation ON iam.membership_roles USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: memberships tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation ON iam.memberships USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: organizations tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation ON iam.organizations USING ((id = platform.current_organization_id())) WITH CHECK ((id = platform.current_organization_id()));


--
-- Name: registered_devices tenant_isolation; Type: POLICY; Schema: iam; Owner: -
--

CREATE POLICY tenant_isolation ON iam.registered_devices USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_boolean; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_boolean ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_currency; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_currency ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_date; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_date ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_datetime; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_datetime ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_geo; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_geo ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_numeric; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_numeric ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_text; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.fact_text ENABLE ROW LEVEL SECURITY;

--
-- Name: insights; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.insights ENABLE ROW LEVEL SECURITY;

--
-- Name: metric_definitions metric_definition_visibility; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY metric_definition_visibility ON intel.metric_definitions USING (((organization_id IS NULL) OR (organization_id = platform.current_organization_id()))) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: metric_definitions; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.metric_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: projection_facts; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.projection_facts ENABLE ROW LEVEL SECURITY;

--
-- Name: projection_freshness; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.projection_freshness ENABLE ROW LEVEL SECURITY;

--
-- Name: projection_runs; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.projection_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: semantic_compatibility; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.semantic_compatibility ENABLE ROW LEVEL SECURITY;

--
-- Name: semantic_mappings; Type: ROW SECURITY; Schema: intel; Owner: -
--

ALTER TABLE intel.semantic_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: fact_boolean tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_boolean USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_currency tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_currency USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_date tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_date USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_datetime tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_datetime USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_geo tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_geo USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_numeric tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_numeric USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: fact_text tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.fact_text USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: insights tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.insights USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: projection_facts tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.projection_facts USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: projection_freshness tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.projection_freshness USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: projection_runs tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.projection_runs USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: semantic_compatibility tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.semantic_compatibility USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: semantic_mappings tenant_isolation; Type: POLICY; Schema: intel; Owner: -
--

CREATE POLICY tenant_isolation ON intel.semantic_mappings USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: assignments; Type: ROW SECURITY; Schema: ops; Owner: -
--

ALTER TABLE ops.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: deployments; Type: ROW SECURITY; Schema: ops; Owner: -
--

ALTER TABLE ops.deployments ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments tenant_isolation; Type: POLICY; Schema: ops; Owner: -
--

CREATE POLICY tenant_isolation ON ops.assignments USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: deployments tenant_isolation; Type: POLICY; Schema: ops; Owner: -
--

CREATE POLICY tenant_isolation ON ops.deployments USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: consumer_receipts; Type: ROW SECURITY; Schema: processing; Owner: -
--

ALTER TABLE processing.consumer_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: idempotency_records; Type: ROW SECURITY; Schema: processing; Owner: -
--

ALTER TABLE processing.idempotency_records ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox_events; Type: ROW SECURITY; Schema: processing; Owner: -
--

ALTER TABLE processing.outbox_events ENABLE ROW LEVEL SECURITY;

--
-- Name: consumer_receipts tenant_isolation; Type: POLICY; Schema: processing; Owner: -
--

CREATE POLICY tenant_isolation ON processing.consumer_receipts USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: idempotency_records tenant_isolation; Type: POLICY; Schema: processing; Owner: -
--

CREATE POLICY tenant_isolation ON processing.idempotency_records USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: outbox_events tenant_isolation; Type: POLICY; Schema: processing; Owner: -
--

CREATE POLICY tenant_isolation ON processing.outbox_events USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: workflow_runs tenant_isolation; Type: POLICY; Schema: processing; Owner: -
--

CREATE POLICY tenant_isolation ON processing.workflow_runs USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: workflow_runs; Type: ROW SECURITY; Schema: processing; Owner: -
--

ALTER TABLE processing.workflow_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: change_log; Type: ROW SECURITY; Schema: sync; Owner: -
--

ALTER TABLE sync.change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: device_cursors; Type: ROW SECURITY; Schema: sync; Owner: -
--

ALTER TABLE sync.device_cursors ENABLE ROW LEVEL SECURITY;

--
-- Name: sync_events; Type: ROW SECURITY; Schema: sync; Owner: -
--

ALTER TABLE sync.sync_events ENABLE ROW LEVEL SECURITY;

--
-- Name: change_log tenant_isolation; Type: POLICY; Schema: sync; Owner: -
--

CREATE POLICY tenant_isolation ON sync.change_log USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: device_cursors tenant_isolation; Type: POLICY; Schema: sync; Owner: -
--

CREATE POLICY tenant_isolation ON sync.device_cursors USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- Name: sync_events tenant_isolation; Type: POLICY; Schema: sync; Owner: -
--

CREATE POLICY tenant_isolation ON sync.sync_events USING ((organization_id = platform.current_organization_id())) WITH CHECK ((organization_id = platform.current_organization_id()));


--
-- PostgreSQL database dump complete
--

\unrestrict bIK0BpuazP1Y7k7FppVoESUd9I0XO4zqAOoMLWV3Za3zXKrGGaZXDY5hkfbdXju

