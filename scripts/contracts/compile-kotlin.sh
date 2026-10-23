#!/usr/bin/env bash
set -euo pipefail
command -v kotlinc >/dev/null || { echo 'kotlinc is required for Kotlin binding compile proof' >&2; exit 3; }
rm -rf .build/kotlin
mkdir -p .build/kotlin
kotlinc \
  packages/domain/generated/kotlin/src/main/kotlin/com/binafield/contracts/domain/DomainContracts.kt \
  packages/contracts/blueprint/generated/kotlin/src/main/kotlin/com/binafield/contracts/blueprint/BlueprintContracts.kt \
  tools/batch2/ParityMain.kt \
  -include-runtime -d .build/kotlin/contracts-parity.jar
