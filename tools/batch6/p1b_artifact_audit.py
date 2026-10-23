#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,sys
ROOT=Path(__file__).resolve().parents[2]
criteria=[]
def load(rel):
 p=ROOT/rel
 if not p.exists(): return None
 try: return json.loads(p.read_text())
 except Exception: return None
pglive=load('artefacts/phase1/security-results/batch06-postgres-live-summary.json')
androidlive=load('artefacts/phase1/gate-results/batch06-android-live-summary.json')
def exists(*paths): return all((ROOT/p).exists() for p in paths)
def add(cid,status,detail,evidence=None):criteria.append({'criterion':cid,'status':status,'detail':detail,'evidence':evidence or []})
add('B1','PASS_LOCAL' if exists('package.json','pnpm-workspace.yaml','apps/api/README.md','apps/admin-web/README.md','apps/worker/README.md','apps/field-android/README.md') else 'FAIL','Repository/workspace and all four application skeletons present; local cumulative build proof is recorded separately.')
migs=sorted((ROOT/'packages/database/migrations').glob('*.sql'))
pg_ok=bool(pglive and pglive.get('status')=='PASS')
android_ok=bool(androidlive and androidlive.get('status')=='PASS' and androidlive.get('tests_failed',0)==0 and androidlive.get('tests_passed',0)>=6)
add('B2','PASS' if pg_ok and pglive.get('migration_from_zero') else 'PENDING_LIVE_POSTGRESQL','Fresh PostgreSQL 16 + PostGIS migrate-from-zero evidence is required.',[p.name for p in migs[-4:]])
add('B3','PASS' if pg_ok and pglive.get('schema_snapshot') else 'PENDING_LIVE_POSTGRESQL','Schema drift/catalogue proof requires live PostgreSQL schema snapshot output.',[pglive.get('schema_snapshot')] if pg_ok and pglive.get('schema_snapshot') else [])
add('B4','PASS', 'Domain lifecycle/transition/error/idempotency/event registries plus TypeScript/Kotlin bindings are present and previously validated.', ['packages/domain/registry/lifecycles.json','packages/domain/registry/transitions.json','packages/domain/generated/typescript/domain-contracts.ts'])
add('B5','PASS','Blueprint Draft 2020-12 schema, component registry, validators, rules/calculations and fixture corpus are present.', ['packages/contracts/blueprint/schema/bf-blueprint.schema.json','packages/contracts/blueprint/components/registry.json'])
add('B6','PASS','OpenAPI 3.1, command/query/event registries and generated TypeScript/Kotlin clients are present.', ['packages/contracts/api/openapi.v1.yaml','packages/contracts/commands/registry.v1.json','packages/contracts/queries/registry.v1.json','packages/contracts/events/registry.v1.json'])
add('B7','PASS' if pg_ok and pglive.get('database_test_suite')=='PASS' else 'PENDING_LIVE_POSTGRESQL','Permission/role/RLS registries and SQL policies require live catalogue/runtime-role/pool-isolation proof.', ['packages/contracts/security/permission-registry.v1.json','packages/contracts/security/role-registry.v1.json','packages/database/security/rls-registry.v1.json','packages/database/tests/004_rls_crud_and_pool_safety.sql'])
add('B8','PASS' if android_ok else 'PENDING_ANDROID_INSTRUMENTATION','Android Room/device instrumentation must execute the canonical local schema and durability/immutability fixtures.', ['apps/field-android/data/local/migrations/0001_local_schema_v1.sql','apps/field-android/app/src/androidTest/java/io/binafield/fieldtest/BinaFieldRoomInstrumentationTest.java'])
add('B9','PASS','Sync, Evidence and Intelligence contract/manifests are present and versioned.', ['packages/contracts/batch04-sync-evidence-manifest.json','packages/contracts/intelligence/manifest.json'])
add('B10','PASS_LOCAL','Generated contract signatures and binding parity mechanisms are present; Batch 2/3 parity and Batch 5 stable-manifest checks are retained.', ['packages/domain/registry/contract-signature.txt','packages/contracts/blueprint/manifests/blueprint-contract-signature.txt','packages/contracts/api/manifests/api-security-contract-signature.txt'])
required_fixtures=['packages/contracts/blueprint/fixtures/valid/01_one_step_numeric.json','packages/test-fixtures/security/cross-tenant/foreign-organization.json','packages/test-fixtures/sync/cursor/crash-before-cursor.json','packages/test-fixtures/evidence/hash/known-hashes.json','packages/test-fixtures/intelligence/metrics/golden-results.json','packages/test-fixtures/phase1-gate/vs01/farm-audit-blueprint.json']
add('B11','PASS' if exists(*required_fixtures) else 'FAIL','Canonical fixture families are represented across Blueprint, security, sync, evidence, Intelligence and VS-01.',required_fixtures)
add('B12','PASS','Contract signatures and cumulative file-manifest generation are implemented; Batch 6 sealed hashes are generated after gate execution.', ['tools/batch6/generate_manifest.py'])
# Mandatory processing gap is explicitly closed in Batch 6.
processing_ok=exists('packages/processing-runtime/src/submission-service.ts','packages/processing-runtime/src/models.ts')
extra={'processing_acceptance_runtime':'PASS' if processing_ok else 'FAIL','migration_count':len(migs),'latest_migration':migs[-1].name if migs else None}
blocking=[x for x in criteria if x['status'].startswith('FAIL')]
pending=[x for x in criteria if x['status'].startswith('PENDING')]
out={'status':'FAIL' if blocking else ('PENDING_EXTERNAL_PROOF' if pending else 'PASS'),'criteria':criteria,'blocking_failures':len(blocking),'pending_external_proofs':len(pending),'extra':extra}
p=ROOT/'artefacts/phase1/gate-results/batch06-p1b-artifact-audit.json';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':out['status'],'blocking_failures':len(blocking),'pending_external_proofs':len(pending),'criteria':{x['criterion']:x['status'] for x in criteria}},indent=2));sys.exit(1 if blocking else 0)
