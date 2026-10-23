#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
include=[ROOT/'packages/processing-runtime',ROOT/'tools/batch6',ROOT/'scripts/gate',ROOT/'packages/test-fixtures/phase1-gate',ROOT/'packages/database/tests/006_intelligence_rls_and_freshness.sql',ROOT/'tsconfig.batch6.json',ROOT/'packages/contracts/blueprint/schema/bf-blueprint.schema.json',ROOT/'packages/contracts/blueprint/generated/typescript/blueprint-contracts.ts',ROOT/'packages/contracts/blueprint/manifests/blueprint-contract-signature.txt',ROOT/'tools/batch2/generate_bindings.py',ROOT/'packages/intelligence-runtime/src/drilldown.ts',ROOT/'packages/intelligence-runtime/src/metric.ts']
files=[]
for p in include:
 if p.is_file(): files.append(p)
 elif p.exists(): files.extend(x for x in p.rglob('*') if x.is_file() and '__pycache__' not in x.parts)
files=sorted(set(files),key=lambda x:str(x.relative_to(ROOT)))
entries=[]
for p in files:
 rel=str(p.relative_to(ROOT));entries.append({'path':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
payload=''.join(f"{x['path']}\0{x['sha256']}\0{x['bytes']}\n" for x in entries).encode();sig=hashlib.sha256(payload).hexdigest();out={'manifest_version':'1.0','batch':'BF-P1-IMPL-B06','repository_version':'0.6.0-phase1-b06','files':entries,'file_count':len(entries),'contract_signature':sig}
path=ROOT/'artefacts/phase1/manifests/batch06-contract-manifest.json';path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(out,indent=2)+'\n');(ROOT/'artefacts/phase1/manifests/batch06-contract-signature.txt').write_text(sig+'\n');print(json.dumps({'file_count':len(entries),'contract_signature':sig},indent=2))
