# Goals 17–20 — Admin Studio UI acceptance record

Date: 2026-11-02  
Status: ACCEPTED — implementation, authenticated smoke, and deployed browser review complete

## Implemented

- Assignment workspace with search, lifecycle filtering, sorted rows, and pagination-ready presentation.
- Submission timeline with truthful empty state when no submission has arrived.
- Assignment and submission click-through anchors into the existing operational sections.
- Review queue remains permission-aware and preserves Accept/Reject actions.
- Report preview with reconciliation total, data freshness, export actions, and print action.
- Existing assignment, submission, evidence metadata, and audit exports remain available.
- Organisation administration remains grouped into projects, memberships/roles, devices, deployments, assignments, and audit events.
- Responsive layout, keyboard focus styling, semantic labels, live status messages, empty states, and error states.

## Verification

- `apps/admin-web` — `npm run build`: PASS.
- TypeScript compilation: PASS.
- Vite production bundle: PASS.
- `git diff --check`: PASS.

## Authenticated smoke verification

`apps/admin-web/npm run smoke` passed all 8 checks with a fresh local Supabase access token:

- Organisation context
- Organisation administration reads
- Supervisor exports readable
- Template creation
- Version validate and publish
- Assignment issued and persisted
- Submission review queue readable
- Supervisor decision and persisted outcome

Live smoke identifiers were captured locally and are intentionally not repeated here because they are test data rather than acceptance credentials.

## Browser acceptance completed

The following was checked in the deployed authenticated browser session:

1. Admin Studio loaded with the pilot organisation and a fresh bearer token.
2. Overview counts reconciled with the loaded assignment/submission records.
3. Assignment workspace search and lifecycle filtering verified.
4. Review queue navigation and permission-aware actions verified.
5. JSON/CSV export actions and downloaded content verified.
6. Print preview and report layout verified.
7. Responsive layout verified at desktop and narrow mobile widths.

The operator confirmed the deployed browser review on 2026-11-02. Local build output and authenticated smoke results are retained above as supporting evidence.
