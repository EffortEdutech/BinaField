-- BF-P1-06 reference security-context helpers. Runtime values must be server-resolved.
CREATE OR REPLACE FUNCTION platform.current_organization_id() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.organization_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION platform.require_organization_id() RETURNS uuid LANGUAGE plpgsql STABLE AS $$ DECLARE v uuid; BEGIN v:=platform.current_organization_id(); IF v IS NULL THEN RAISE EXCEPTION 'BinaField organization context required' USING ERRCODE='42501'; END IF; RETURN v; END $$;
