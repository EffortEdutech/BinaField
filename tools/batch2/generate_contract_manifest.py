#!/usr/bin/env python3
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[2]
BP=ROOT/'packages/contracts/blueprint'
files=[]
for p in sorted(BP.rglob('*')):
    if p.is_file() and 'manifests/contract-manifest.json' not in str(p):
        rel=p.relative_to(BP).as_posix()
        files.append({'path':rel,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
manifest={'pack':'bf-blueprint','schema_version':'1.0','component_registry_version':'1.0.0','hash_algorithm':'SHA-256','files':files}
(BP/'manifests/contract-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'files':len(files)},indent=2))
