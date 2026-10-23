# BF-P1-IMPL-B04 — Implementation Report & Gate Record v1.0

**BinaField Phase 1 Implementation — Offline Sync Local Store, Durable Inbox/Outbox, Cursor & Reconciliation Engine, Evidence Transfer, SHA-256 Integrity & Storage Runtime Pack**

**Status:** IMPLEMENTATION ARTEFACTS CREATED — LOCAL OFFLINE/EVIDENCE MACHINE CONFORMANCE PASS — LIVE ANDROID/POSTGRESQL/OBJECT-STORE INTEGRATION PROOFS PENDING  
**Date:** 22 October 2026

## 1. Purpose

Batch 4 converts the frozen BF-P1-07 and BF-P1-08 contracts into executable offline-sync and evidence runtime artefacts. It extends the cumulative Batch 3 repository rather than creating a parallel codebase.

The governing implementation paths are:

**AUTHORISED PACKAGE → DURABLE LOCAL EXECUTION → AUTOSAVE → COMPLETE → IMMUTABLE SUBMIT → DEPENDENCY-AWARE OUTBOX → IDEMPOTENT TRANSFER → DURABLE INBOX/SERVER OUTCOME → CURSOR ADVANCE → EXPLICIT RECONCILIATION → GOVERNED CLEANUP.**

**LOCAL ORIGINAL → STABLE ATTACHMENT ID → SHA-256 + MANIFEST → RESUMABLE PRIVATE UPLOAD → SERVER SIZE/HASH/TYPE VERIFICATION → AUTHORITATIVE BINDING → ORIGINAL PRESERVED → GOVERNED DERIVATIVES → SEPARATE AUTHORISED ACCESS → RETENTION/HOLD → VERIFIED PURGE.**

## 2. Offline Sync Machine Pack

Delivered under `packages/contracts/sync` and `apps/field-android`:

- Sync protocol v1 JSON Schemas for cursor, delta entry/page, Assignment tombstone, outbox operation, Submission Attempt, reconciliation, retry policy and reference datasets.
- Exact 23-code Sync error registry from P1-07.
- Reconciliation action registry and compatibility matrix.
- App-private SQLite-compatible local schema manifest and forward local migration.
- Complete P1-07 logical table set, including `diagnostic_event`.
- Kotlin/JVM contract runtime for outbox dependency ordering, retry/backoff, inbox/cursor apply, stale revision protection and reconciliation.
- Local SHA-256 evidence helper and immutable Submission Attempt model.

The physical local schema keeps Organisation identity on tenant-owned records and separates mutable Session state from immutable Submission Attempt state.

## 3. Durable Local Store

The local schema contains 22 logical tables:

`local_meta`, `organization_context`, `membership_snapshot`, `device_snapshot`, `project_cache`, `template_package`, `reference_dataset`, `reference_dataset_row`, `assignment_cache`, `assignment_tombstone`, `submission_session`, `submission_attempt`, `local_evidence`, `sync_inbox`, `sync_inbox_item`, `sync_outbox`, `sync_operation_dependency`, `sync_cursor`, `sync_event`, `reconciliation_case`, `reconciliation_action`, and `diagnostic_event`.

SQLite triggers enforce core invariants:

- immutable submitted Attempt identity/payload/manifest fields;
- SUBMITTED Session cannot reopen or mutate its core payload;
- uploaded/bound evidence identity, role, parent, size, hash and local identity cannot silently change.

The local schema remains an implementation contract core. Production Android still must wire this into Room or an equivalent typed Android persistence layer with encrypted app-private storage and migration instrumentation.

## 4. Durable Outbox, Retry & Reconciliation

The Kotlin outbox runtime implements explicit operation dependencies so required evidence can complete before a Submission Attempt becomes runnable.

Supported operation semantics include:

- `EVIDENCE_UPLOAD_INIT`
- `EVIDENCE_UPLOAD_PART`
- `EVIDENCE_UPLOAD_FINALIZE`
- `SUBMISSION_ATTEMPT_SEND`
- `SYNC_ACK`
- `RECONCILIATION_RESPONSE`
- optional diagnostic upload

Outbox states remain separate from authoritative business state. Retry uses classified bounded backoff; deterministic cancellation/reassignment/integrity conditions move to reconciliation rather than endless retry.

Reconciliation preserves immutable Attempts and local evidence. It does not perform field-by-field cloud draft merge and cannot resurrect a server-cancelled Assignment.

## 5. Durable Inbox & Cursor Engine

The implementation preserves the P1-07 cursor invariant:

1. receive delta using current cursor;
2. durably stage/apply the batch;
3. only after durable apply, advance the cursor;
4. replay safely if the prior acknowledgement/cursor write was not completed.

The Kotlin runtime smoke specifically injects failure before cursor advancement and proves the previous cursor is retained. Replay converges and advances only after the durable gate succeeds.

The SQLite integration proof additionally executes rollback before cursor commit and verifies neither the business row nor cursor is partially committed.

## 6. Evidence Contract Pack

Delivered under `packages/contracts/evidence`:

- Evidence Attachment schema.
- immutable manifest-entry schema.
- upload initialisation/session/part/finalise schemas.
- attachment-status schema.
- derivative schema.
- retention-policy and hold schemas.
- exact 21-code Evidence error registry.

Stable attachment identity is independent from upload session and object key. Expired transport sessions are replaced without changing `attachment_id` or expected SHA-256.

## 7. Evidence Runtime

The TypeScript evidence runtime implements:

- stable attachment creation/idempotency;
- SINGLE_PUT and MULTIPART transport semantics;
- resumable/out-of-order multipart part reconstruction;
- SHA-256 over exact stored bytes;
- size verification;
- bounded media-signature verification;
- malware-scanner adapter boundary and quarantine result handling;
- authoritative manifest binding;
- required-evidence acceptance gate;
- original/derivative lineage;
- short-lived HMAC-scoped access grants for conformance;
- governance hold protection;
- purge state handling.

A deterministic filesystem object-storage adapter is included as the first provider implementation for local conformance. It is deliberately not claimed as production S3-compatible object-storage proof.

## 8. Original / Derivative Integrity

The conformance derivative transformer creates a deliberately distinct derivative for lineage testing. It verifies that:

- original bytes and SHA-256 remain unchanged;
- derivative receives a distinct attachment/hash identity;
- derivative retains `parent_attachment_id` lineage;
- a derivative never becomes or replaces the original.

The included transformer is a conformance marker, not the production image watermark renderer. Production watermark/thumbnail processing remains a later integration implementation.

## 9. Malware / Quarantine Boundary

`MalwareScannerPort` is now explicit. `AllowAllConformanceScanner` exists only for local deterministic tests and is labelled as non-production.

The runtime test also supplies a SUSPECTED scanner result and proves the attachment becomes quarantined/failed without changing its expected hash.

A production isolated malware scanner provider remains pending.

## 10. PostgreSQL Forward Migration

Batch 4 adds the forward-only migration:

`0015_p1_08_evidence_runtime_reconciliation.sql`

It reconciles the earlier database baseline with the final P1-08 machine contract without rewriting released migrations. It:

- normalises upload-session states to the frozen vocabulary;
- adds upload strategy/finalisation metadata;
- normalises `SIGNATURE_RENDER` capture source;
- adds evidence storage/quarantine metadata;
- creates `evidence.upload_parts`;
- enables and forces RLS on the new tenant-owned table;
- installs tenant policies/grants; and
- registers the table in `platform.rls_registry`.

The static RLS registry is updated accordingly.

## 11. Executed Verification

The reproducible `npm run ci:batch4` gate completed successfully.

- Contract/schema/local-semantic checks: **67 / 67 PASS**.
- Transactional SQLite checks: **10 / 10 PASS**.
- TypeScript compilation: **PASS**.
- TypeScript evidence-runtime smoke: **PASS**.
- Kotlin compilation/runtime smoke: **PASS**.
- JSON parse verification: **248 JSON files PASS**.
- OpenAPI YAML parse: **PASS**.
- Shell syntax checks: **PASS**.

TypeScript evidence runtime proves:

- known bytes → expected SHA-256;
- exact server hash verification;
- required evidence binding gate;
- cross-tenant binding denial;
- original/derivative separation;
- signed-grant expiry;
- hold blocks purge;
- hash mismatch quarantine;
- out-of-order multipart reconstruction;
- expired session replacement with stable attachment identity; and
- scanner quarantine preserving expected hash.

Kotlin runtime proves:

- evidence-before-Submission dependency ordering;
- retry/backoff classification;
- crash before cursor advancement leaves old cursor;
- safe replay advances after durable apply;
- cancellation tombstone state;
- explicit reconciliation creation;
- SHA-256 parity; and
- frozen Assignment revision in the immutable Attempt.

The shared known evidence SHA-256 is:

`cfac2a5dee8d6405a8fe960299b1b990381f496e3435e4a10022c21a733aec58`

Multipart reconstructed evidence SHA-256 is:

`d2d423cb9cfba5f6d5a5a897ad5560bb8891b65e2fed3e497cb6c9136115c0e3`

Batch 4 Sync/Evidence contract signature is:

`11018555f29e31c391c15295d74080b7de3c2b0b3e18491e5cfbf66686230455`

## 12. Environment & Explicit Limitations

Executed locally with:

- Node.js 22.16.0
- TypeScript 5.8.3
- Java 21.0.12.1
- Kotlin 1.9.0
- SQLite 3.46.1 through Python runtime

This preparation environment still has no PostgreSQL `psql`/server and no Docker.

Therefore Batch 4 does **not** claim successful execution of:

- PostgreSQL 16 + PostGIS migrate-from-zero including migration 0015;
- live `app_runtime` / `worker_runtime` RLS tests and pooled tenant-context tests;
- Android Room instrumentation/device migration tests;
- WorkManager/background scheduling under Android OS constraints;
- production S3-compatible presigned/multipart transport;
- production malware scanning;
- object-storage backup/restore and live purge.

These remain explicit integration/conformance gates, not assumed PASSes.

## 13. Gate Decision

**Batch 4 artefact creation: PASS.**  
**Offline/Sync contract verification: PASS — 67/67 combined contract checks.**  
**Transactional local-store conformance: PASS — 10/10.**  
**Kotlin offline/sync runtime smoke: PASS.**  
**TypeScript evidence integrity/storage runtime smoke: PASS.**  
**Live Android/Room/WorkManager integration: PENDING.**  
**Production S3-compatible/object-storage integration: PENDING.**  
**Production malware-scanner integration: PENDING.**  
**Live PostgreSQL/RLS execution: PENDING.**

**Overall Phase 1 P1-B: PENDING.**  
**Overall Phase 1 P1-C: PENDING.**

P1-B remains pending because the P1-09 analytical projection/semantic/metric runtime and the remaining live infrastructure proofs are not yet complete. P1-C remains pending until the integrated server/Android failure suites and mandatory VS-01 vertical slice execute end to end.

## 14. Release Blockers Preserved

Batch 4 does not relax any frozen blocker. Release remains blocked by loss of committed unsynced work; cursor advancement before durable apply; duplicate accepted Submission caused by retry; silent last-write-wins over cancellation/reassignment; deletion of sole unsynced original evidence; mutable SUBMITTED Attempts; unsupported runtime semantics; offline authority self-extension; cross-Organisation local leakage; silent hash mismatch; original overwrite by derivative; required-evidence acceptance bypass; quarantine treated as READY; cross-tenant evidence binding/access; purge through active hold; or contract drift.

## 15. Batch 4 Closure

BF-P1-Implementation-Batch-04 is ready for integration in Android and PostgreSQL/S3-compatible development environments while retaining explicit environment-dependent proof gates.

The next implementation stage should build the remaining P1-09 executable layer: typed analytical projections, semantic compatibility registry, metric/exception calculation runtime, rebuild/idempotency handling, security-before-aggregation, freshness and authorised drill-down. After that, a dedicated integration/gate batch should execute the live PostgreSQL proof and mandatory VS-01 vertical slice to determine P1-B/P1-C closure.
