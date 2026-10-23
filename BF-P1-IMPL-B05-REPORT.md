# BF-P1-IMPL-B05 — Implementation Report & Gate Record v1.0

**BinaField Phase 1 Implementation — Analytical Projection, Semantic Registry, Metric & Exception Runtime, Projection Rebuild, Freshness and Security-Aware Drilldown Pack**

**Status:** IMPLEMENTATION ARTEFACTS CREATED — LOCAL INTELLIGENCE MACHINE CONFORMANCE PASS — LIVE POSTGRESQL/API BENCHMARK & VS-01 PENDING  
**Date:** 22 October 2026

## 1. Purpose

Batch 5 converts the frozen BF-P1-09 Analytical Projection, Semantic Registry & Metric Machine Contract into executable machine artefacts and extends the cumulative Phase 1 repository from v0.4.0 to v0.5.0.

The governing execution chain remains:

ACCEPTED SOURCE FACT → IDEMPOTENT VERSIONED PROJECTION → TYPED SEMANTIC FACT → COMPATIBILITY CHECK → REGISTERED METRIC → AUTHORISED SCOPE FILTER → AGGREGATE → EXPLAINABLE RESULT / INSIGHT → REAUTHORISED DRILL-DOWN.

## 2. Intelligence Contract Pack

Batch 5 creates `packages/contracts/intelligence/` with versioned machine registries and schemas for semantic meaning, compatibility, deterministic conversion, projection grains, dimensions, measures, metrics, exceptions, approved anomaly functions, query plans, drilldown, freshness, insights, reports and security suppression.

The system metric registry contains the 18 frozen P1-09 baseline metrics. The anomaly registry contains the nine approved deterministic/statistical functions. The analytical error registry contains the 18 frozen machine error codes.

No MetricDefinition or semantic conversion accepts arbitrary SQL, JavaScript or user-supplied executable code.

## 3. Typed Projection Runtime

The TypeScript Intelligence runtime projects only eligible accepted source facts and preserves source lineage including Organisation, Project, Assignment, Submission, Template Version, Blueprint, field and semantic identities.

Implemented projection grains include Submission, Field Value, Repeat Item, Multi-Select Value, Evidence Fact, Assignment Fact, Sync Fact, Workflow Fact and Geo Point.

The runtime preserves canonical value semantics: zero and false remain values, explicit null remains distinguishable, and an absent field is not silently projected as a value.

Projection identity is deterministic so replay of the same source identity and projection version converges on one logical analytical effect.

## 4. Semantic Registry & Compatibility

`semantic_key` is implemented as stable business meaning while `field_id` remains exact Blueprint lineage.

Compatibility states are enforced as COMPATIBLE, CONVERTIBLE, INCOMPATIBLE and UNKNOWN. UNKNOWN and INCOMPATIBLE fail closed for cross-Version aggregation. CONVERTIBLE values require a registered deterministic conversion. Batch 5 includes deterministic kg↔tonne and seconds→minutes conversion examples for conformance.

The runtime test proves compatible aggregation, deterministic conversion and exclusion of unknown/incompatible semantic Versions.

## 5. Metric Runtime

The metric engine resolves only registered metric definitions and applies the declared source grain, measure, filters, dimensions, time basis, ratio/zero-denominator policy and security classification.

Supported registered operations follow the frozen contract boundary: COUNT, COUNT_DISTINCT, SUM, AVG, MIN, MAX, PERCENTILE, RATIO, RATE, DURATION_AVG and DURATION_P95.

Golden runtime checks prove Project-scoped Assignment Completion Rate, Organisation-scoped Completion Rate, Evidence Completion Rate, P95 Sync Delay and cross-Version converted semantic aggregation.

## 6. Security Before Aggregation

Batch 5 implements the critical P1-09 execution order:

1. resolve trusted PrincipalContext;
2. resolve analytics permission;
3. construct authorised security scope;
4. filter Organisation, Project and classification scope;
5. apply registered metric filters;
6. aggregate;
7. apply suppression/masking policy;
8. return result with safe freshness and scope metadata.

The SQL-plan compiler materialises this boundary as an `authorized_facts` stage before aggregate operations. It is parameterised and does not compile natural-language or registry content into arbitrary SQL.

Tests prove that foreign-tenant facts do not enter an Organisation metric and Project-denied facts do not enter either numerator or denominator.

## 7. Small-Group & Classification Controls

Security suppression supports minimum group size, value suppression, drilldown disabling and classification-aware policy. Classification filtering occurs before aggregate and before suppression.

Batch 5 also reconciles Intelligence database classifications to the canonical five-value security vocabulary including SENSITIVE_OPERATIONAL.

## 8. Security-Aware Drilldown

Drilldown follows:

METRIC / INSIGHT → AUTHORISED RECORD LIST → ASSIGNMENT / SUBMISSION → SOURCE PAYLOAD → EVIDENCE.

A signed drilldown reference is a query reference, not authority. Current permission and resource scope are reevaluated when it is used.

The runtime tests prove:

- analytics.read does not grant raw Submission drilldown;
- a token created under broader authority cannot be replayed to gain authority under a narrower principal;
- submission.read does not grant evidence.download;
- evidence access remains separately authorised.

## 9. Exceptions, Anomalies & Insights

The runtime implements deterministic exception evaluation plus the approved anomaly function registry: threshold, percentage change, rolling mean deviation, rolling median deviation, z-score, robust z-score, missingness spike, category rate shift and location concentration.

Insights are generated as explainable observations with source metric/rule, scope, period, current/baseline value, freshness and authorised drilldown reference. The runtime does not allow an Insight to mutate source operational truth.

## 10. Freshness Model

Projection freshness states are implemented as PENDING, BUILDING, CURRENT, STALE, FAILED and REBUILDING.

The query runtime fails closed on stale projection when the query policy requires current data. When stale results are explicitly allowed, the result carries a STALE warning and freshness metadata.

The P0-15 target of analytical freshness p95 ≤ 60 seconds remains a production benchmark target and is not claimed passed by the local in-memory test.

## 11. Projection Rebuild / Backfill

The rebuild manager stages a new projection version and activates it only after the rebuild completes and invariants pass.

Tests prove:

- deterministic rebuild convergence;
- duplicate rebuild requests do not double-count facts;
- injected rebuild failure leaves the previously active projection untouched;
- accepted source payloads are never mutated by projection or rebuild.

## 12. Database Forward Migrations

Batch 5 adds two forward-only migration files without rewriting released migrations.

`0014z_p1_08_rls_registry_metadata_compatibility.sql` is a compatibility bridge discovered during Batch 5 integration review. Batch 4 migration 0015 writes the richer RLS registry metadata fields required by the final security model, while the earlier 0012 table shape exposed only the legacy columns. Because live PostgreSQL execution was still pending, this mismatch had not surfaced in the local Batch 4 suite.

The bridge runs before 0015, expands the RLS registry safely, synchronises legacy and canonical schema-name fields, and preserves the released 0015 checksum.

`0016_p1_09_intelligence_runtime_reconciliation.sql` then adds the P1-09 execution layer: canonical analytical classifications/grains, immutable published field-to-semantic mappings, projection freshness records, tenant RLS/policies/grants, indexes and seed registries for the baseline semantics and 18 system metrics.

This is a controlled forward correction, not silent history rewriting.

## 13. Executed Batch 5 Verification

The reproducible `npm run ci:batch5` gate completes successfully.

- Intelligence contract/schema checks: 58 / 58 PASS.
- Database static/migration-order checks: 15 / 15 PASS.
- TypeScript compilation: PASS.
- Intelligence runtime smoke: PASS.
- Stable Intelligence manifest generation: PASS.

The runtime smoke reports 21 projected fixture facts and proves:

- zero/false preservation;
- null/absent distinction;
- idempotent projection;
- rejected source exclusion;
- semantic compatible/convertible/unknown handling;
- security scope before aggregation;
- cross-tenant exclusion;
- classification before aggregation;
- analytics-only raw drilldown denial;
- drilldown token is not authority;
- separate evidence permission;
- small-group suppression;
- stale fail-closed/warning behavior;
- deterministic and failure-atomic rebuild;
- source payload immutability.

Golden values observed:

- Project P1 completion rate: 50%.
- Organisation completion rate: 75%.
- Evidence completion rate: 50%.
- P95 sync delay fixture: 19.5 seconds.
- Cross-Version converted semantic sum: 1750 kg.

## 14. Cumulative Regression

Batch 5 was challenged against the earlier cumulative implementation packs.

- Batch 2: 228 / 228 PASS plus TypeScript/Kotlin parity PASS.
- Batch 3: 218 / 218 PASS plus Security and API contract runtime smokes PASS.
- Batch 4: 67 / 67 contract checks PASS, 10 / 10 SQLite transactional checks PASS, TypeScript Evidence Runtime smoke PASS and Kotlin Offline/Evidence smoke PASS.

The Batch 4 all-in-one regression command exceeded the execution window after its successful TypeScript smoke; the remaining Kotlin stage was executed independently and passed. This is recorded as a tooling-window split, not a product failure.

## 15. Local Benchmark Hook

Batch 5 includes a deterministic 10,000-fact in-memory metric benchmark over 30 iterations. The latest sealed run recorded approximately 15–30 ms class local execution, with exact p50/p95 retained in `artefacts/batch05-local-benchmark.json`.

The benchmark is explicitly labelled `LOCAL_IN_MEMORY_NON_RELEASE_BENCHMARK`. It is not PostgreSQL, HTTP/API, production concurrency or infrastructure SLO proof and therefore does not close the P0-15 p95 ≤ 2 second metric-query target.

## 16. Stable Intelligence Contract Signature

The manifest generator was hardened during sealing so generated `manifest.json` is excluded from its own hash inputs. This removes self-referential signature drift.

Sealed Intelligence contract signature:

`430176ee5efe3ee29dce6727781cb863394b4d8b76f4caeb7e7a16f7635d08f2`

Repeated manifest generation produces the same signature.

## 17. Environment & Explicit Limitations

This environment still does not provide a live PostgreSQL/PostGIS server, Docker-based integration topology, Android Room/WorkManager instrumentation environment, production S3-compatible object storage or production malware scanner.

Accordingly Batch 5 does not claim successful execution of:

- migrate-from-zero against PostgreSQL including the 0014z/0015/0016 sequence;
- PostgreSQL RLS catalogue/runtime-role/pool-isolation suite;
- production SQL/API metric query benchmark;
- real projection event lag/freshness benchmark;
- Android Room migration and device process-death suite;
- production S3-compatible Evidence integration;
- the complete P1-10 VS-01 end-to-end vertical slice.

These remain explicit P1-B/P1-C proof requirements rather than assumed passes.

## 18. Gate Decision

Batch 5 artefact creation: PASS.

P1-09 local machine conformance: PASS.

Intelligence contract verification: PASS — 58/58.

Database static/migration-order verification: PASS — 15/15.

Cumulative Batch 2/3/4 regression: PASS within available local runtimes.

Stable Intelligence manifest: PASS.

Live PostgreSQL migration/RLS proof: PENDING.

Production API/metric benchmark proof: PENDING.

Android Room/WorkManager live proof: PENDING.

VS-01 integrated vertical-slice proof: PENDING.

GATE P1-A — Contract Baseline Gate: PASS.

GATE P1-B — Artefact Presence & Build Gate: PENDING FINAL INTEGRATION EVIDENCE.

GATE P1-C — Executed Conformance & Vertical-Slice Gate: PENDING.

P1-B remains open because BF-P1-10 explicitly requires fresh PostgreSQL migration-from-zero, schema/RLS catalogue parity, Android local migration proof and complete build/drift evidence before it can pass. P1-C additionally requires P1-B first and the mandatory VS-01 executed end to end.

## 19. Release Blockers Preserved

Batch 5 does not relax any frozen blocker. Release remains blocked by foreign-tenant analytics, Project scope applied after aggregation, incompatible semantic Versions silently combined, duplicate-event double counting, projection mutation of accepted source truth, false/zero treated as missing, raw Submission or Evidence bytes gained through analytics-only authority, stale/failed projection presented as current without warning, metric/runtime drift, or any previously frozen security/offline/evidence blocker.

## 20. Batch 5 Closure

BF-P1-Implementation-Batch-05 is ready for final Phase 1 integration/conformance execution. The next work should implement and execute the BF-P1-10 gate pack: complete artefact/build audit, live PostgreSQL migration/RLS proof where available, integrated service/runtime harness, P1-C adverse/security fixtures and mandatory VS-01 from Organisation/Template/Assignment through offline Submission/evidence to accepted analytical metric and permission-aware drilldown.
