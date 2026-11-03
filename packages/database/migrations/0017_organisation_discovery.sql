BEGIN;

-- Organisation discovery is the one pre-tenant operation: the caller does not
-- know which tenant context to set yet. Keep it behind a narrowly scoped
-- SECURITY DEFINER function instead of weakening tenant RLS on the base tables.
CREATE OR REPLACE FUNCTION iam.organizations_for_identity(p_identity_subject text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  lifecycle_state text,
  membership_id uuid,
  membership_state text,
  roles json
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, iam
AS $$
  SELECT o.id, o.slug, o.name, o.lifecycle_state,
         m.id AS membership_id, m.lifecycle_state AS membership_state,
         COALESCE((
           SELECT json_agg(DISTINCT r.role_key)
           FROM iam.membership_roles mr
           JOIN iam.roles r ON r.id = mr.role_id
           WHERE mr.organization_id = m.organization_id
             AND mr.membership_id = m.id
         ), '[]'::json) AS roles
  FROM iam.memberships m
  JOIN iam.users u ON u.id = m.user_id
  JOIN iam.organizations o ON o.id = m.organization_id
  WHERE u.identity_subject = p_identity_subject
    AND m.lifecycle_state = 'ACTIVE'
    AND o.lifecycle_state = 'ACTIVE'
  ORDER BY o.name;
$$;

REVOKE ALL ON FUNCTION iam.organizations_for_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iam.organizations_for_identity(text) TO app_runtime;

COMMIT;
