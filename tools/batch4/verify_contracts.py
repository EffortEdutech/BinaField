from pathlib import Path
import json, hashlib, sys, re
from jsonschema import Draft202012Validator
root=Path(__file__).resolve().parents[2]
checks=[]
def ck(name,cond): checks.append((name,bool(cond))); print(('PASS' if cond else 'FAIL'),name)
# schemas
for folder in [root/'packages/contracts/sync/protocol.v1',root/'packages/contracts/evidence']:
 for p in sorted(folder.glob('*.schema.json')):
  try: Draft202012Validator.check_schema(json.loads(p.read_text())); ck('schema:'+p.relative_to(root).as_posix(),True)
  except Exception: ck('schema:'+p.relative_to(root).as_posix(),False)
# exact registries
sync=json.loads((root/'packages/contracts/sync/protocol.v1/sync-error-registry.v1.json').read_text())
ck('sync-error-count',len(sync['errors'])==23)
e=json.loads((root/'packages/contracts/evidence/evidence-error-registry.v1.json').read_text());ck('evidence-error-count',len(e['errors'])==21)
# local schema contract words
sql=(root/'apps/field-android/data/local/migrations/0001_local_schema_v1.sql').read_text()
for table in json.loads((root/'apps/field-android/data/local/local-schema-manifest.json').read_text())['tables']:ck('local-table:'+table,f'CREATE TABLE {table} ' in sql)
for state in ['SUBMITTED','RECONCILIATION_REQUIRED','CANCELLED_BY_POLICY','COMPLETED_ELSEWHERE']:ck('local-semantic:'+state,state in sql or state in ''.join(p.read_text() for p in (root/'apps/field-android/src/main/kotlin').rglob('*.kt')))
# forward migration safety
m=(root/'packages/database/migrations/0015_p1_08_evidence_runtime_reconciliation.sql').read_text()
for token in ['UPLOAD_COMPLETE','VERIFYING','VERIFIED','SIGNATURE_RENDER','CREATE TABLE evidence.upload_parts','FORCE ROW LEVEL SECURITY','platform.rls_registry']:ck('migration:'+token,token in m)
# hashes
hashes=json.loads((root/'packages/test-fixtures/evidence/hash/known-hashes.json').read_text())
for fn,exp in hashes.items():ck('hash:'+fn,hashlib.sha256((root/'packages/test-fixtures/evidence/hash'/fn).read_bytes()).hexdigest()==exp)
# no edit of released old migrations: static expected filenames/check signatures present in batch manifest if available
ck('batch1-migrations-preserved', all((root/'packages/database/migrations'/f'{i:04d}_{name}').exists() for i,name in [(1,'platform_extensions_and_schemas.sql'),(7,'evidence_storage_model.sql'),(8,'sync_transport_model.sql'),(14,'p1_06_security_registry_reconciliation.sql')]))
# TS runtime safety concepts
ets=(root/'packages/evidence-runtime/src/evidence-service.ts').read_text()
for token in ['timingSafeEqual','HASH_MISMATCH','RETENTION_BLOCKED','requiredEvidenceSatisfied','TENANT_MISMATCH','EVIDENCE_INTEGRITY_FAILED','MULTIPART','expiresAt','MALWARE_SUSPECTED']:ck('evidence-runtime:'+token,token in ets)
ck('scanner-boundary',(root/'packages/evidence-runtime/src/scanner.ts').exists() and (root/'apps/api/modules/evidence/adapters/scanner/AllowAllConformanceScanner.ts').exists())
failed=[n for n,v in checks if not v]
result={'total':len(checks),'passed':len(checks)-len(failed),'failed':len(failed),'failures':failed}
out=root/'artefacts/batch04-contract-verification.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2));sys.exit(1 if failed else 0)
