# Goal 12 — Admin Studio usability and operational hardening

Status: PASS — LOCAL HARDENING AND AUTHENTICATED SMOKE COMPLETE  
Date: 2026-10-30 (Asia/Kuala_Lumpur)

## Implemented

- Administration workspace added to the primary Admin Studio dashboard.
- Project lifecycle controls.
- Membership suspension/activation controls.
- Organisation-wide role assignment controls.
- Device suspension/activation controls.
- Assignment cancellation/reassignment controls.
- Loading and disabled states during refresh.
- Empty states for projects, memberships, devices, assignments, submissions, and audit events.
- Error and permission-aware messaging.
- Existing supervisor review, outcome history, audit, and export workflow retained.
- Admin operations guide added at `docs/admin/ADMIN-STUDIO-OPERATIONS.md`.

## Verification

| Check | Result | Notes |
|---|---|---|
| Admin Studio TypeScript/build | PASS | `apps/admin-web`: `npm run build` |
| Diff whitespace check | PASS | `git diff --check` |
| Authenticated Admin Studio smoke | PASS | 8/8 checks passed on 2026-10-30: organisation context, administration reads, exports, template lifecycle, assignment issue, review queue, and persisted outcome |
| Deployed UI verification | PENDING | Local changes are not deployed in this evidence record |

## Scope note

Project-restricted role assignment and deployment lifecycle controls are now visible in the local Admin Studio workspace. Deployment of these UI changes remains a separate release action and was not performed as part of this goal verification.

## Live smoke identifiers

- Template: `6176dd27-8bc5-4ee5-998f-44d697be23a3`
- Version: `7decc613-85fa-4391-936f-b9236ea129ec`
- Deployment: `ed166a9b-cbfa-4a49-98f5-a96fff0c6f56`
- Assignment: `b36d3572-c35f-41b8-bf73-bc5d9cc434cf`
