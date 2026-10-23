# BinaField — Phase 1 Implementation Repository Snapshot

This cumulative snapshot contains Phase 1 Implementation **Batch 1 + Batch 2 + Batch 3 + Batch 4 + Batch 5**.

## Batch 1
Repository/CI foundation, PostgreSQL migrations, runtime DB roles and Organisation RLS baseline.

## Batch 2
Typed domain/state registries, Blueprint JSON Schema Draft 2020-12 pack, governed Component Registry v1, rule/calculation grammar, golden fixtures, generated TypeScript/Kotlin bindings and parity verification.

### Batch 2 commands

```bash
python3 tools/batch2/verify_contracts.py
tsc -p tsconfig.batch2.json
bash scripts/contracts/compile-kotlin.sh
bash scripts/contracts/verify-parity.sh
```

The exact runtime rule action set remains:
`SHOW`, `HIDE`, `ENABLE`, `DISABLE`, `REQUIRE`, `OPTIONAL`, `WARN`, `BLOCK_COMPLETE`.
Calculations are declared independently; arbitrary JavaScript/SQL/shell/unrestricted HTTP are not executable Blueprint features.


## Phase 1 Implementation Batch 3
Batch 3 implements the P1-05/P1-06 API and security machine layer: OpenAPI 3.1, command/query/event registries and schemas, generated TypeScript/Kotlin clients, canonical permission/role/classification registries, pure authorization guards, tenant-context helpers, security fixtures, forward migration 0014 for scope/permission-key reconciliation, and expanded RLS tests.

Run locally:
```bash
python3 tools/batch3/verify_contracts.py
tsc -p tsconfig.batch3.json
node .build/ts-b3/tools/batch3/security-smoke.js
node .build/ts-b3/tools/batch3/api-contract-smoke.js
bash scripts/contracts/compile-kotlin-batch3.sh
```
Database conformance additionally requires PostgreSQL 16 + PostGIS.


## Phase 1 Implementation Batch 5
Batch 5 implements the P1-09 analytical machine layer: typed projections, semantic compatibility/conversion registries, versioned metrics, deterministic/statistical exception functions, freshness, rebuild/backfill, small-group controls, security-before-aggregation query execution and reauthorised drill-down.

Run locally:
```bash
npm run ci:batch5
```

The included benchmark is a local in-memory engineering hook only. PostgreSQL/API SLO evidence remains an integration gate.
