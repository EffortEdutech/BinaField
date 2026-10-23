# BF-P1-IMPL-B03 — Implementation Report & Gate Record v1.0

**BinaField Phase 1 Implementation — OpenAPI, Command/Query/Event Schemas, Generated Clients, Permission & Role Registries, Authorisation Guards and Security/RLS Conformance Pack**

**Status:** IMPLEMENTATION ARTEFACTS CREATED — LOCAL API/SECURITY MACHINE CONFORMANCE PASS — POSTGRESQL RUNTIME RLS PROOF PENDING  
**Date:** 21 October 2026

## 1. Purpose

Batch 3 converts the frozen BF-P1-05 and BF-P1-06 contracts into executable API and security artefacts. It extends the cumulative Batch 2 repository rather than creating a parallel codebase.

The governing implementation path is:

**AUTHENTICATED REQUEST → SERVER-RESOLVED PRINCIPAL → ORGANISATION/PERMISSION/SCOPE GUARDS → VERSIONED API COMMAND/QUERY → DOMAIN/REVISION/IDEMPOTENCY GUARDS → TENANT-SAFE REPOSITORY/RLS BARRIER → AUDIT/OUTBOX → VERSIONED EVENT → IDEMPOTENT CONSUMER.**

## 2. API Machine Pack

Delivered under `packages/contracts/api`:

- OpenAPI 3.1 contract at `/api/v1`.
- Organisation route convention `/api/v1/organizations/{organization_id}/...`.
- 40 declared API operations across Admin, Field, Evidence and Intelligence surfaces.
- common identifier, timestamp, revision, pagination, problem, actor, command-result and query-result schemas.
- Admin Project, Template, Deployment, Assignment, Submission, Evidence and Intelligence schemas.
- Field bootstrap, Assignment-package, delta, immutable Submission Attempt and reconciliation schemas.
- Evidence upload-init, upload-finalize and attachment-status schemas.
- Intelligence metric-query/result, drilldown and Insight schemas.
- deterministic API/security manifest and contract signature.

Every public operation declares authentication plus machine security metadata including permission, scope mode, command/query kind, backing registry key, device requirement and idempotency class.

## 3. Command, Query & Event Registries

The executable registries contain:

- **31 commands** with owner, request/result schema, permission, scope, revision requirement, idempotency class, audit requirement and success events.
- **19 queries** with owner, permission, scope, result and pagination/security metadata.
- **28 canonical events**, kept in exact semantic parity with P1-03.
- versioned immutable event envelope and per-event payload schemas.

Events retain past-tense fact semantics, at-least-once delivery assumptions and idempotent consumer requirements. Batch 3 deliberately retains the canonical P1-03 `SubmissionReceived` event rather than introducing a competing alias.

## 4. Security Registries

Delivered under `packages/contracts/security`:

- **59 canonical permission keys**.
- **11 standard system role profiles**.
- role-permission matrix.
- classification registry.
- security-error registry.
- PrincipalContext schema.
- AuthorisationDecision schema.
- security-policy schema.
- operation-to-security mapping.

The canonical Organisation permission keys are `organization.*`. Scope modes are exactly `ORG_WIDE | PROJECT_RESTRICTED`.

## 5. Forward Migration Reconciliation

Batch 1 contained two early seed-model spellings that pre-dated the final P1-06 machine contract: `organisation.*` permission keys and scope value `ORGANISATION`.

Batch 3 **does not modify released migrations**. It adds:

`0014_p1_06_security_registry_reconciliation.sql`

The forward migration:

1. drops the legacy scope CHECK constraint before data conversion;
2. converts `ORGANISATION` to `ORG_WIDE`;
3. installs the frozen `ORG_WIDE | PROJECT_RESTRICTED` constraint/default;
4. seeds all 59 canonical permissions;
5. removes superseded British-spelled permission keys; and
6. rebuilds standard system-role permission bundles from the machine registry.

This preserves forward-only migration history while reconciling the database seed layer with P1-06.

## 6. Executable Authorisation Layer

The TypeScript security package now implements:

- deterministic authorisation decision order;
- ACTIVE Membership checks;
- Device-bound Field request checks;
- Organisation match;
- canonical permission lookup;
- ORG_WIDE / PROJECT_RESTRICTED scope decisions;
- relationship/resource eligibility hooks;
- entity-state restrictions;
- classification permissions;
- MFA/recent-auth step-up policy;
- safe denial reason codes;
- AuthorizedQueryScope generation;
- transaction-local tenant context helpers using parameterised `set_config(..., true)`; and
- tenant-keyed repository interfaces.

Classification masking helpers preserve VISIBLE / MASKED / OMITTED semantics rather than replacing restricted values with misleading empty values.

## 7. Generated Clients & Bindings

Generated artefacts include:

- TypeScript Admin client.
- TypeScript internal/server client.
- TypeScript permission constants.
- Kotlin Field HTTP client/models.
- Kotlin permission constants.

Generated clients are transport/type helpers only; they do not create authority or perform authoritative lifecycle transitions locally.

## 8. API/Event Runtime Harnesses

Batch 3 includes executable in-memory contract harnesses for:

- tenant-scoped idempotency key spaces;
- same-key/same-request replay;
- same-key/different-request conflict;
- ETag/expected-revision conflict;
- duplicate event delivery; and
- stale/out-of-order aggregate revision rejection.

These harnesses test the semantic contract independently of a specific web framework.

## 9. Security & RLS Conformance Pack

Security fixtures cover:

- foreign Organisation substitution;
- Project outside scope;
- revoked Device;
- Analyst/raw-data separation;
- evidence-read versus evidence-download separation;
- classification restrictions;
- analytics scope-before-aggregation;
- idempotency conflicts;
- revision conflicts;
- duplicate/out-of-order events.

The database pack adds expanded SQL tests for RLS CRUD isolation, UPDATE tenant movement prevention, fail-closed missing tenant context, COMMIT/ROLLBACK connection-context safety and permission-registry drift.

The RLS registry remains a tenant-isolation defence layer. It does not replace permission, Project scope, classification, evidence, export or analytics enforcement.

## 10. Executed Verification

Local machine-contract execution completed successfully:

- Contract/schema/security checks: **189 / 189 PASS**.
- Failures: **0**.
- OpenAPI/operation-registry/security-map parity: **PASS**.
- Permission/role/reference integrity: **PASS**.
- TypeScript compilation: **PASS**.
- TypeScript security guard smoke: **PASS**.
- TypeScript idempotency/revision/event smoke: **PASS**.
- Kotlin compilation on Java 21: **PASS**.
- Generated API/security signature parity: **PASS**.
- Shell syntax: **PASS**.
- JSON/YAML parse verification: **PASS**.
- Migration ordering/reconciliation static proof: **PASS**.

**API/Security contract signature:**  
`9c30bafff38c0eb45b07df84ace1b39e80b54ad980d5b1a9dacef15776179594`

## 11. PostgreSQL Execution Limitation

The preparation container still has no PostgreSQL `psql`/server or Docker. Therefore this batch cannot honestly claim execution of:

- migration-from-zero against PostgreSQL 16 + PostGIS;
- live `app_runtime`/`worker_runtime` RLS negative tests;
- `pg_catalog` RLS-registry reconciliation; or
- real pooled-connection tenant-context leakage tests.

The SQL suites and CI workflow are included so these proofs can execute in the target development/CI environment. This limitation remains an explicit gate item rather than being converted into a false PASS.

## 12. Gate Decision

**Batch 3 artefact creation:** PASS.  
**API/schema/registry machine verification:** PASS — 189/189.  
**TypeScript compile + security/API runtime smoke:** PASS.  
**Kotlin compile + generated signature parity:** PASS.  
**PostgreSQL live RLS proof:** PENDING ENVIRONMENT EXECUTION.  
**Overall Phase 1 P1-B:** PENDING.  
**Overall Phase 1 P1-C:** PENDING.

P1-B remains pending because the executable P1-07/P1-08/P1-09 packs and live PostgreSQL proof are still outstanding. P1-C remains pending until integrated server/Android conformance and mandatory VS-01 execute end to end.

## 13. Release Blockers Preserved

Batch 3 does not relax any frozen blocker. Release remains blocked by cross-tenant disclosure/mutation, runtime BYPASSRLS, pooled tenant-context leakage, role escalation, revoked principal/device access, evidence/download bypass, export masking/scope bypass, analytics-before-scope aggregation, secret exposure, duplicate accepted Submission or silent contract drift.

## 14. Batch 3 Closure

BF-P1-Implementation-Batch-03 is ready for integration in a PostgreSQL 16 + PostGIS capable development/CI environment.

The next implementation stage should produce the executable P1-07/P1-08 runtime layer: Android/local-store structures, durable inbox/outbox and cursor state, retry/reconciliation machinery, resumable evidence transfer, SHA-256 verification/binding and failure-injection fixtures.
