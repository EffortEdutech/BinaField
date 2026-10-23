# BF Phase 1 Batch 6B — Live Infrastructure Closure

Batch 6B executes the remaining BF-P1-10 external proofs on hosted CI:

1. PostgreSQL 16 + PostGIS 3.4 migrate-from-zero, RLS catalogue/runtime-role/pool-isolation and Intelligence RLS/freshness tests.
2. Android API 30 emulator instrumentation using Room 2.8.5 and the exact `0001_local_schema_v1.sql` local schema.
3. Final `tools/batch6/final_gate.py` recomputation using retained live summaries.

The CI harness must retain `batch06-postgres-live-summary.json`, `batch06-android-live-summary.json`, and `BF-P1-B06-FINAL-GATE-DECISION.json` as workflow artifacts. A formal Phase 1 close requires P1-B=PASS and P1-C=PASS.
