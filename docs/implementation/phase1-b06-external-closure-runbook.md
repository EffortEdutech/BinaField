# BF Phase 1 Batch 6 — External Closure Runbook

This runbook completes the evidence that cannot execute in the ChatGPT build runtime. It does not change any Phase 1 semantics.

## 1. PostgreSQL 16 + PostGIS 3.4 gate

Use a disposable, empty database. The runtime role used to launch the gate must be able to create the BinaField schemas, extensions and test roles.

```bash
export DATABASE_URL='postgresql://.../binafield_p1_gate'
bash scripts/gate/postgres16-postgis-gate.sh
```

The gate must prove fresh migrate-from-zero, all database conformance SQL, tenant RLS for `app_runtime` and `worker_runtime`, missing-context fail-closed behavior, `SET LOCAL` transaction isolation, pool-safety tests, RLS registry/catalogue parity, PostGIS availability, and schema snapshot generation.

Expected retained output:

`artefacts/phase1/security-results/batch06-postgres-live-summary.json`

A non-PASS result leaves P1-B/P1-C open.

## 2. Android instrumentation gate

Run the Field Runtime local-store migration and durability suite on an Android 11+ emulator or reference device using the project Android integration once available. The proof must exercise the same `0001_local_schema_v1.sql` schema and Kotlin offline/evidence runtime semantics used by the Batch 4/6 local tests.

Required proof includes: fresh local database creation, upgrade path when a later local migration exists, autosave durability across process death, immutable submitted Attempt, original evidence retention, dependency-aware outbox, cursor apply-before-advance, reconciliation persistence, and restart recovery.

Retain a machine-readable summary at:

`artefacts/phase1/gate-results/batch06-android-live-summary.json`

Minimum accepted shape:

```json
{
  "status": "PASS",
  "platform": "Android",
  "api_level": 30,
  "tests_passed": 1,
  "tests_failed": 0
}
```

The actual test count may be higher. `status` must be `PASS` only when all critical instrumentation tests pass.

## 3. Re-run final gate

After both external summaries exist:

```bash
python3 tools/batch6/p1b_artifact_audit.py
python3 tools/batch6/final_gate.py
```

Phase 1 is formally closed only when the final decision reports both `p1b: PASS` and `p1c: PASS` with no blocking failures or pending proofs.
