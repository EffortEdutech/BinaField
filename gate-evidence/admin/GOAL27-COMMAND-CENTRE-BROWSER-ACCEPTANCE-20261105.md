# Goal 27 — Admin Studio command-centre browser acceptance

Date: 2026-11-05  
Deployment: `https://binafield-admin-studio.vercel.app/`  
Authenticated principal: `tester@binafield.test`  
Organisation: `BinaField Demo`

## Acceptance result

PASS for the deployed administrator command centre. The session loaded its active organisation automatically and live organisation data was visible without bearer tokens, API URLs, or UUID controls.

## Route evidence

### Overview

- Live workspace loaded with 24 records.
- 13 assignments are visible.
- 9 submissions are awaiting review.
- 2 submissions are accepted.
- Projects, recent activity, assignment search/filter controls, and submission timeline are visible.

### Administration

- Organisation control centre loaded.
- 2 projects, 1 active membership, and 2 active devices were visible.
- Report templates and active deployments were visible.
- Named project/field-worker assignment controls were visible.
- Existing assignments and lifecycle actions were visible.

### Review queue

- Review decision page loaded independently from the other routes.
- 11 queue items were visible: 9 awaiting review and 2 accepted.
- Accept/reject actions, history, Kebuniti report access, and JSON/CSV exports were visible.

### Reports & exports

- Analysis page loaded independently.
- Reconciled total, accepted rate, live freshness, status filter, project filter, and print report action were visible.
- Report-ready count was visible for accepted submissions.

### Audit & support

- Audit page loaded independently.
- 59 organisation audit events were visible.
- Outcome history and recent event context were visible.

## Repository gates

- Production build: PASS
- Goal 17–20 checks: PASS
- Goal 24 checks: PASS
- Goal 27 source audit: PASS
- Vercel deployment: READY

## Remaining evidence

Narrow-mobile visual evidence and the full end-to-end pilot-user run remain separate acceptance artifacts. The named pilot remains paused until those artifacts are captured and reviewed.
