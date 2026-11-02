# Goals 17–20 — Admin Studio UI acceptance record

Date: 2026-11-02  
Status: LOCAL IMPLEMENTATION PASS / DEPLOYED BROWSER REVIEW PENDING

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

## Browser acceptance still required

The following requires the latest commit to be deployed and checked in an authenticated browser:

1. Load Admin Studio with the pilot organisation and a fresh bearer token.
2. Confirm the overview counts reconcile with the loaded assignment/submission records.
3. Search and filter the assignment workspace.
4. Open the review queue from the overview and verify permission-aware actions.
5. Trigger one JSON/CSV export and verify the downloaded content.
6. Use print preview to confirm the report layout.
7. Check the layout at desktop and narrow mobile widths.

Evidence must be captured from the deployed browser session; local build output alone is not customer acceptance.
