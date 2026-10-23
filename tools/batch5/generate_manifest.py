from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2];targets=[]
for base in ['packages/contracts/intelligence','packages/intelligence-runtime','apps/api/modules/intelligence','apps/worker/intelligence','packages/test-fixtures/intelligence']:
 for p in sorted((root/base).rglob('*')):
  if p.is_file() and p.name != 'manifest.json': targets.append(p)
for rel in ['packages/database/migrations/0014z_p1_08_rls_registry_metadata_compatibility.sql','packages/database/migrations/0016_p1_09_intelligence_runtime_reconciliation.sql','packages/database/security/rls-registry.v1.json','tools/batch5/intelligence-runtime-smoke.ts','tools/batch5/intelligence-benchmark.ts','tools/batch5/verify_contracts.py']:
 targets.append(root/rel)
files=[]
for p in sorted(set(targets)):
 b=p.read_bytes();files.append({'path':p.relative_to(root).as_posix(),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
out={'manifest_version':'1.0','batch':'BF-P1-IMPL-B05','package_version':'0.5.0','contract':'BF-P1-09','files':files};out['signature']=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest();path=root/'packages/contracts/intelligence/manifest.json';path.write_text(json.dumps(out,indent=2)+'\n');print(out['signature'])
