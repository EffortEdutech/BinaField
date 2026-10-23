#!/usr/bin/env bash
set -euo pipefail
DOMAIN_EXPECTED=$(tr -d '\r\n' < packages/domain/registry/contract-signature.txt)
BLUEPRINT_EXPECTED=$(tr -d '\r\n' < packages/contracts/blueprint/manifests/blueprint-contract-signature.txt)
[ -f .build/kotlin/contracts-parity.jar ] || bash scripts/contracts/compile-kotlin.sh
OUT=$(java -jar .build/kotlin/contracts-parity.jar)
echo "$OUT"
grep -qx "DOMAIN=$DOMAIN_EXPECTED" <<< "$OUT"
grep -qx "BLUEPRINT=$BLUEPRINT_EXPECTED" <<< "$OUT"
# TypeScript generated bindings are compile-checked separately; verify signatures are embedded.
grep -q "$DOMAIN_EXPECTED" packages/domain/generated/typescript/domain-contracts.ts
grep -q "$BLUEPRINT_EXPECTED" packages/contracts/blueprint/generated/typescript/blueprint-contracts.ts
echo 'PARITY=PASS'
