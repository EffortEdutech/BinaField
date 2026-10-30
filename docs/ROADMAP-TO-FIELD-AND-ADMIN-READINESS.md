# BinaField roadmap to field and Admin Studio readiness

Status: CANONICAL ROADMAP  
Date: 2026-10-30  
Release baseline: `0.8.0-pilot.1`

## Purpose

This document is the source of truth for the remaining work required before BinaField is ready for reliable field use and routine administration through Admin Studio.

The roadmap distinguishes completed pilot capability from remaining product-hardening work. A goal is complete only when its implementation, verification, and evidence record are available.

## Readiness definition

BinaField is ready for controlled field and administrative use when:

- a field user can receive an assignment, work offline, capture evidence, submit, reconnect, and reconcile the final outcome;
- an administrator can manage organisation context, users, projects, templates, deployments, devices, and assignments;
- a supervisor can monitor work, review submissions, inspect outcomes, audit activity, and export authorised records;
- tenant isolation, permissions, idempotency, persistence, error handling, and auditability are verified;
- supported device/browser combinations are explicitly documented and tested;
- deployment, support, rollback, limitations, and acceptance evidence are complete.

## Completed foundation

### Goals 1–9 — complete

1. **Production API hardening** — authentication, tenant isolation, sync, submission, evidence, retries, and error handling.
2. **First complete operational workflow** — assignment through offline field execution, sync, review, and outcome.
3. **Minimum Admin Studio** — organisation context, template lifecycle, assignment creation, review, and result view.
4. **Pilot readiness** — seeded data, deployment instructions, support, monitoring, rollback, and acceptance checklist.
5. **Phase 2 foundation freeze** — frozen requirements for administration, review, dashboards, audit, exports, and PWA support.
6. **Release package and evidence** — manifest, evidence index, limitations, runbooks, and conditional release decision.
7. **Controlled pilot** — named participants, devices, workflow execution, support monitoring, reconciliation, and pilot findings.
8. **Organisation administration and Admin Studio expansion** — memberships, projects, roles/scopes, devices, lifecycle controls, and mutation audit events.
9. **Supervisor operations, dashboards, audit, and exports** — supervisor dashboard, filters, bulk review, outcome history, audit viewer, exports, activity summaries, and smoke evidence.

Evidence for completed goals is indexed in `docs/release/EVIDENCE-INDEX.md` and `gate-evidence/`.

## Remaining implementation goals

### Goal 10 — Field PWA UX polish

Make the field experience understandable and dependable during normal use.

Acceptance criteria:

- assignment list and detail views clearly show status, revision, due information, and actionable errors;
- field forms provide usable validation, required-field guidance, and clear save/submit states;
- photo capture provides preview, replacement, removal, and visible upload state;
- offline, queued, retrying, failed, and reconciled states are visible without technical jargon;
- users can identify the last successful sync and any item needing attention;
- layouts and touch interactions work on the supported phone sizes;
- accessibility basics are covered for labels, focus, contrast, and touch targets.

### Goal 11 — PWA reliability and real-device support gate — deferred

Deferred until the core BinaField platform and Admin Studio are complete. This is not a current implementation gate.

Deferred acceptance criteria for a later validation phase:

- Android Chrome browser mode is tested;
- iPhone Safari browser mode is tested;
- installed-PWA mode is tested where supported;
- assignments, form data, and photos survive offline operation and app/browser restart;
- reconnect sync retries safely and does not duplicate submissions or evidence;
- acknowledgements, upload finalisation, submission outcome, and reconciliation are evidenced;
- the supported device/browser matrix, minimum versions, storage guidance, and known limitations are published;
- every unsupported combination is explicitly marked unsupported rather than implied to work.

Current decision: device runs, installed-PWA testing, and the related durability spikes are intentionally deferred. They remain documented in `gate-evidence/pwa/REAL-DEVICE-EVIDENCE-PROTOCOL.md` and must not block platform or Admin Studio development. Until this goal is later resumed and passed, broad Android/iPhone compatibility remains unclaimed.

### Goal 12 — Admin Studio usability and operational hardening

Make the administrative interface usable by routine operators, not only through smoke scripts.

Acceptance criteria:

- user/membership, project, role/scope, device, template, deployment, and assignment screens are discoverable;
- lifecycle actions show confirmation, result, current state, and failure reason;
- permission-denied, empty, loading, validation, network-error, and stale-data states are handled;
- supervisor dashboard filters, bulk review, history, audit, and exports are understandable;
- destructive or irreversible actions require appropriate confirmation;
- admin help text and support procedures match the deployed interface;
- the authenticated Admin Studio smoke test remains green.

### Goal 13 — End-to-end field/admin acceptance

Verify the complete supported workflow as one reproducible acceptance scenario.

Acceptance criteria:

- an administrator publishes a template and creates a deployment and assignment;
- the field device receives the assignment and completes it offline;
- evidence is captured, uploaded, reconciled, and visible as metadata/status;
- the supervisor reviews and decides the submission;
- the field client receives the resulting outcome;
- dashboard counts, exports, and audit records reconcile to the same workflow;
- authorised and unauthorised paths are tested for the selected tenant and project;
- a dated acceptance record identifies participants, devices, deployment versions, results, and exceptions.

### Goal 14 — Final production-readiness and release decision

Convert the validated implementation into an operational release decision.

Acceptance criteria:

- deployment and environment instructions are current and reproducible;
- support, monitoring, incident response, and rollback runbooks are verified;
- known limitations and deferred features have named owners or explicit deferral decisions;
- security, tenant isolation, permissions, data retention, and audit controls have final review evidence;
- release manifest, version, commit, deployment URLs, test results, and evidence index are complete;
- pilot findings are closed, accepted, or formally deferred;
- the release is explicitly classified as `READY`, `CONDITIONAL`, or `NOT READY`.

## Execution order and dependencies

The remaining goals should be executed in order, with Goal 11 deferred:

`Goal 10 → Goal 12 → Goal 13 → Goal 14`

Goal 10 improves the field experience. Goal 12 can proceed without physical-device validation. Goal 13 depends on the platform and interfaces being stable. Goal 14 is the final release gate; it may record Goal 11 as a deliberate deferral for the current release.

## Current release posture

`0.8.0-pilot.1` is a controlled-pilot baseline, not yet a broad field-ready release. Real-device PWA validation is a documented deferral, not a current development blocker. The remaining active work is platform and Admin Studio readiness, followed by end-to-end acceptance and the final release decision.

## Related canonical documents

- Phase 2 requirements: `docs/phase2/PHASE2-REQUIREMENTS-FREEZE.md`
- Release package: `docs/release/README.md`
- Evidence index: `docs/release/EVIDENCE-INDEX.md`
- Pilot package: `docs/pilot/README.md`
- Known limitations: `docs/pilot/KNOWN-LIMITATIONS.md`
