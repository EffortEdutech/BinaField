#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/.build/kotlin-b3"
rm -rf "$OUT" && mkdir -p "$OUT"
kotlinc "$ROOT/packages/generated/clients/kotlin-field/BinaFieldClient.kt" "$ROOT/packages/generated/clients/kotlin-field/Permissions.kt" "$ROOT/tools/batch3/ApiSecurityParityMain.kt" -include-runtime -d "$OUT/api-security.jar"
java -jar "$OUT/api-security.jar"
