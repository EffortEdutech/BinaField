#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)";cd "$ROOT"
mkdir -p artefacts/phase1/gate-results
{
  echo '== Batch 2 =='; python3 tools/batch2/verify_contracts.py; rm -rf .build/ts; tsc -p tsconfig.batch2.json; bash scripts/contracts/compile-kotlin.sh; bash scripts/contracts/verify-parity.sh
  echo '== Batch 3 =='; python3 tools/batch3/verify_contracts.py; rm -rf .build/ts-b3; tsc -p tsconfig.batch3.json; node .build/ts-b3/tools/batch3/security-smoke.js; node .build/ts-b3/tools/batch3/api-contract-smoke.js; bash scripts/contracts/compile-kotlin-batch3.sh
  echo '== Batch 4 =='; python3 tools/batch4/verify_contracts.py; python3 tools/batch4/verify_local_store.py; rm -rf .build/ts-b4; tsc -p tsconfig.batch4.json; node .build/ts-b4/tools/batch4/evidence-runtime-smoke.js; bash scripts/contracts/compile-kotlin-batch4.sh
  echo '== Batch 5 =='; python3 tools/batch5/generate_manifest.py; python3 tools/batch5/verify_contracts.py; python3 tools/batch5/verify_database_static.py; rm -rf .build/ts-b5; tsc -p tsconfig.batch5.json; node .build/ts-b5/tools/batch5/intelligence-runtime-smoke.js
} | tee artefacts/phase1/gate-results/batch06-cumulative-local-regression.log
python3 - <<'PY'
import json
from pathlib import Path
p=Path('artefacts/phase1/gate-results/batch06-cumulative-local-regression.json');p.write_text(json.dumps({'status':'PASS','batches':['B2','B3','B4','B5'],'note':'All cumulative local contract/compiler/runtime suites completed successfully in Batch 6 regression.'},indent=2)+'\n')
PY
