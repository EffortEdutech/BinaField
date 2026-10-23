# BF-P1 Implementation Batch 04 Notes

Batch 4 implements P1-07/P1-08 executable offline-sync and evidence-runtime semantics.

## Locally executable in this package
- SQLite-compatible local store creation and transaction tests.
- Kotlin outbox dependency ordering, retry classification/backoff, inbox/cursor crash replay, reconciliation and SHA-256 parity.
- TypeScript filesystem object-store provider for conformance.
- Single/multipart-capable provider interface and evidence state machine.
- Server-side SHA-256/size/media verification.
- Required-evidence binding gate.
- Signed grant expiry and exact attachment binding semantics.
- Retention hold blocking purge.
- Original/derivative lineage and non-overwrite semantics.
- Hash mismatch quarantine.

## Explicitly not claimed here
- Android Room/WorkManager instrumentation on a device/emulator.
- OS-backed local encryption proof.
- Live S3-compatible presigned URL/multipart provider execution.
- Malware scanner integration.
- PostgreSQL 16 execution of server migrations/RLS.
- Cloud object-store backup/restore and purge proof.
