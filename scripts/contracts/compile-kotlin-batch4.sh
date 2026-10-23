#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/.build/kotlin-b4"
rm -rf "$OUT" && mkdir -p "$OUT"
kotlinc \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/sync/SyncModels.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/sync/OutboxEngine.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/sync/RetryPolicy.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/sync/InboxCursorEngine.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/sync/ReconciliationEngine.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/evidence/EvidenceHash.kt" \
 "$ROOT/apps/field-android/src/main/kotlin/io/binafield/field/evidence/EvidenceModels.kt" \
 "$ROOT/tools/batch4/OfflineEvidenceSmoke.kt" -include-runtime -d "$OUT/offline-evidence.jar"
java -jar "$OUT/offline-evidence.jar"
