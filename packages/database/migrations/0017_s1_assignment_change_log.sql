-- Sprint 1: every assignment change writes one row to sync.change_log so devices can pull a delta.
-- Additive only. Runs with the definer's rights because change_log is written by the system, not by the caller.
BEGIN;

CREATE OR REPLACE FUNCTION sync.log_assignment_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $fn$
DECLARE
  v_hash text;
  v_payload jsonb;
BEGIN
  SELECT blueprint_hash INTO v_hash FROM blueprint.template_versions
   WHERE organization_id = NEW.organization_id AND id = NEW.template_version_id;
  v_payload := jsonb_build_object(
    'assignment_id', NEW.id, 'assignment_revision', NEW.revision,
    'template_version_id', NEW.template_version_id, 'blueprint_hash', v_hash,
    'assignee_membership_id', NEW.assignee_membership_id, 'project_id', NEW.project_id,
    'payload', jsonb_build_object('deployment_id', NEW.deployment_id, 'lifecycle_state', NEW.lifecycle_state,
      'priority', NEW.priority, 'due_at', NEW.due_at, 'operational_subject_ref', NEW.operational_subject_ref));

  IF TG_OP = 'UPDATE' AND OLD.assignee_membership_id IS NOT NULL
     AND OLD.assignee_membership_id IS DISTINCT FROM NEW.assignee_membership_id THEN
    INSERT INTO sync.change_log(organization_id, entity_type, entity_id, entity_revision, change_type, payload_json)
    VALUES (NEW.organization_id, 'assignment', NEW.id, NEW.revision, 'TOMBSTONE',
      jsonb_build_object('assignment_id', NEW.id, 'assignee_membership_id', OLD.assignee_membership_id,
        'project_id', NEW.project_id, 'tombstone_type', 'REASSIGNED'));
  END IF;

  IF NEW.assignee_membership_id IS NOT NULL THEN
    IF NEW.lifecycle_state = 'CANCELLED' THEN
      INSERT INTO sync.change_log(organization_id, entity_type, entity_id, entity_revision, change_type, payload_json)
      VALUES (NEW.organization_id, 'assignment', NEW.id, NEW.revision, 'TOMBSTONE',
        jsonb_build_object('assignment_id', NEW.id, 'assignee_membership_id', NEW.assignee_membership_id,
          'project_id', NEW.project_id, 'tombstone_type', 'CANCELLED'));
    ELSE
      INSERT INTO sync.change_log(organization_id, entity_type, entity_id, entity_revision, change_type, payload_json)
      VALUES (NEW.organization_id, 'assignment', NEW.id, NEW.revision, 'UPSERT', v_payload);
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER assignments_change_log
  AFTER INSERT OR UPDATE ON ops.assignments
  FOR EACH ROW EXECUTE FUNCTION sync.log_assignment_change();

-- Backfill: assignments that already exist get one UPSERT entry.
INSERT INTO sync.change_log(organization_id, entity_type, entity_id, entity_revision, change_type, payload_json)
SELECT a.organization_id, 'assignment', a.id, a.revision, 'UPSERT',
  jsonb_build_object('assignment_id', a.id, 'assignment_revision', a.revision, 'template_version_id', a.template_version_id,
    'blueprint_hash', tv.blueprint_hash, 'assignee_membership_id', a.assignee_membership_id, 'project_id', a.project_id,
    'payload', jsonb_build_object('deployment_id', a.deployment_id, 'lifecycle_state', a.lifecycle_state,
      'priority', a.priority, 'due_at', a.due_at, 'operational_subject_ref', a.operational_subject_ref))
FROM ops.assignments a
JOIN blueprint.template_versions tv ON tv.organization_id = a.organization_id AND tv.id = a.template_version_id
WHERE a.assignee_membership_id IS NOT NULL AND a.lifecycle_state <> 'CANCELLED';

COMMIT;
