# BinaField Typed Domain Contract Pack

Authoritative machine inputs live in `registry/`. Generated bindings live under `generated/`.

Rules:
- lifecycle state and derived condition are separate; `OVERDUE` is not an Assignment state.
- terminal transitions are explicit; no last-write-wins repair.
- generated TypeScript/Kotlin files are derived artefacts and must match `contract-signature.txt`.
