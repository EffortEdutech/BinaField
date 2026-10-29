# BinaField Phase 2 requirements freeze

Status: FROZEN BASELINE  
Date: 2026-10-29  
Basis: Goals 1–4 evidence, controlled-pilot package, and known-limitations register.

## Freeze rules

1. A requirement below is the source of truth for Phase 2 implementation and acceptance.
2. Changes require a new revision, an explicit rationale, and impact review against data integrity, tenant isolation, offline recovery, and auditability.
3. Published blueprint content remains immutable; corrections create a new version.
4. Every Phase 2 feature must preserve idempotent commands, tenant-scoped authorization, correlation IDs, and durable outcome state.

## P2-ADM — Admin Studio expansion

**P2-ADM-01** Organisation and project context must be explicit in every Admin Studio operation. The UI must show the active tenant, project, membership, permissions, and deployment context.

**P2-ADM-02** Administrators must create, validate, publish, supersede, and archive template versions through governed lifecycle actions. Published versions are read-only.

**P2-ADM-03** Administrators must create deployments and issue, reassign, cancel, and close assignments with visible lifecycle and revision history.

**Acceptance:** an authorised administrator can complete the full design → publish → deploy → assign flow; an unauthorised or cross-tenant request is rejected and leaves no partial record.

## P2-SUP — Supervisor review workflows

**P2-SUP-01** Supervisors must see a filtered queue of received submissions by organisation, project, deployment, assignment, status, and age.

**P2-SUP-02** A supervisor decision must be Accept or Reject with reason/detail where required, actor, timestamp, correlation ID, and immutable submission-attempt reference.

**P2-SUP-03** Review decisions must be idempotent and must not mutate the original field submission attempt.

**Acceptance:** a received submission can be reviewed once or safely retried; the outcome API and audit record agree after refresh.

## P2-DASH — Dashboards and reporting

**P2-DASH-01** Provide tenant- and project-scoped counts for assigned, in-progress, submitted, accepted, rejected, overdue, and exception states.

**P2-DASH-02** Provide drill-down from each count to the underlying assignments/submissions and their latest outcome.

**P2-DASH-03** Display data freshness time, filter scope, and incomplete/quarantined data warnings.

**Acceptance:** every displayed metric can be reconciled to authorized source records for the selected scope and time window.

## P2-AUD — Audit trail

**P2-AUD-01** Record security-sensitive and operational mutations: authentication/authorization decisions, template lifecycle changes, deployment/assignment changes, evidence state changes, submission receipt, supervisor decisions, exports, and rollback actions.

**P2-AUD-02** Audit records must include tenant, actor, action, target type/ID, before/after or decision detail, timestamp, correlation ID, and request idempotency key where applicable.

**P2-AUD-03** Audit records are append-only to application actors and queryable by authorised users.

**Acceptance:** a pilot workflow can be reconstructed from audit events without relying on application logs alone.

## P2-EXP — Exports

**P2-EXP-01** Authorised users can export filtered assignments, submissions, outcomes, evidence metadata, and audit records in CSV and JSON.

**P2-EXP-02** Exports include tenant/project/filter scope, generated-at timestamp, schema/version, row counts, and an integrity hash.

**P2-EXP-03** Sensitive evidence bytes are never included by default; exports contain metadata and governed signed-download references only.

**Acceptance:** an export can be regenerated for the same scope, reconciled to dashboard counts, and denied for an unauthorised tenant/project.

## P2-ORG — Organisation and project administration

**P2-ORG-01** Organisation administrators can manage projects, memberships, roles, project scopes, device registration, suspension, revocation, and reactivation.

**P2-ORG-02** Role and scope changes take effect on the next authorized request and are visible in the Admin Studio context.

**P2-ORG-03** Suspended/revoked users and devices cannot create or sync field submissions; existing local work remains recoverable and supportable.

**Acceptance:** a test matrix proves allow/deny behavior for organisation-wide, project-scoped, suspended, revoked, and unregistered principals.

## P2-PWA — Broader Android/iPhone support

**P2-PWA-01** Validate the supported matrix for Android Chrome and iPhone Safari in browser and installed-PWA modes.

**P2-PWA-02** Prove local persistence, photo durability, offline capture, reconnect sync, retry/idempotency, restart recovery, and reconciliation on each supported device/browser class.

**P2-PWA-03** Publish minimum browser versions, storage requirements, camera/permission guidance, known background-upload behavior, and a support escalation path.

**Acceptance:** each device/browser cell has reproducible evidence; unsupported cells are explicitly blocked by product messaging and do not count as pilot support.

## Frozen non-goals

- Native Android/iOS applications are not required for this Phase 2 freeze.
- Full BI/analytics, arbitrary custom reports, and cross-tenant aggregation are not included.
- Published blueprint mutation is not allowed.
- Evidence bytes are not placed in ordinary reports or dashboard responses.
- PWA support is not claimed for untested browser/device combinations.

## Traceability

- Goal 1 API hardening: `gate-evidence/api/GOAL1-PRODUCTION-API-HARDENING-20261028.md`
- Goal 2 operational workflow: `gate-evidence/goal2-first-operational-workflow-20261029.md`
- Goal 3 Admin Studio: `gate-evidence/admin/GOAL3-ADMIN-STUDIO-DEPLOYMENT-20261029.md`
- Goal 4 pilot readiness: `gate-evidence/GOAL4-PILOT-READINESS-20261029.md`
- Known limitations: `docs/pilot/KNOWN-LIMITATIONS.md`
