# Sprint 1 - submission attempts, live check (27 Oct 2026)

What ran: scripts/live-check-submission.ps1 (operator-run PowerShell) against https://binafield-api.vercel.app as the test user, device ACTIVE, assignment a0000000-0000-4000-8000-000000000014.
Result: 9 of 9 PASS.

- valid attempt stored: 201
- same retry replays: 200
- same key, different request: 409 IDEMPOTENCY_CONFLICT
- tampered payload with old hash: 422 PAYLOAD_HASH_MISMATCH (server recomputes the canonical hash, per eff's decision)
- device header differs from body: 400 DEVICE_MISMATCH
- no Idempotency-Key: 400 IDEMPOTENCY_KEY_REQUIRED
- no token: 401 AUTHENTICATION_REQUIRED
- other organisation: 404 RESOURCE_NOT_FOUND (concealed)
- outcome read of the stored attempt: 200, status RECEIVED

Not yet covered live: revoked member, suspended device, project-restricted scope (covered by unit tests only).
Test data remains in the main database and must be removed before real use.

## Field delta, live (27 Oct 2026, same script, commit 60b7477)
13 of 13 PASS in total (9 submission + 4 delta checks shown below).
- delta from empty cursor: 200, 1 entry (UPSERT of assignment a0000000-0000-4000-8000-000000000014), next_cursor c1:1
- delta from next cursor: 200, 0 entries
- bad cursor: 400 INVALID_CURSOR
- delta without device header: 403 DEVICE_NOT_REGISTERED
