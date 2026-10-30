# Admin Studio operations guide

Status: Goal 12 working guide  
Admin URL: `https://binafield-admin-studio.vercel.app/`  
API URL: `https://binafield-api.vercel.app/`

## Access

Enter the organisation UUID and an authorised bearer token in the browser. The token is held in the browser session and is not stored in the repository. A user must have the relevant permission; denied actions are shown as an error and must not be retried by changing tenant context.

## Organisation administration

After loading Admin Studio, the administration workspace shows:

- project count and project lifecycle controls;
- membership list with active/suspended state controls;
- role list and role assignment for a selected membership;
- registered devices with active/suspended controls;
- assignments with lifecycle actions and revision context.

Role assignment from the current UI uses organisation-wide scope. Project-restricted scopes remain available through the API and require a dedicated scope-management UI before being treated as routine operator functionality.

## Supervisor operations

The same workspace provides activity counts, submission filters, review queue actions, outcome history, recent audit events, and JSON/CSV exports. Review controls are displayed only when the loaded principal has `submission.review`.

## Safe operating rules

1. Confirm the organisation UUID before loading data or performing a mutation.
2. Treat suspended devices and memberships as an access-control action; record the reason through the normal support process.
3. Use assignment lifecycle actions deliberately. Cancelled or completed work must not be silently reissued without a new assignment decision.
4. Export only the scope needed for the task. Evidence exports contain metadata, not evidence bytes.
5. Preserve the visible error message and correlation identifier when an action fails.
6. Refresh after a mutation and confirm the resulting lifecycle state and audit event.

## Verification

Local build: `npm run build` in `apps/admin-web` — PASS on 2026-10-30.  
Authenticated smoke: `npm run smoke` — requires `BINAField_TOKEN` in the local shell; no token is printed or committed.
