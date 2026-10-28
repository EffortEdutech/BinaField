# Sprint 3 evidence: PWA connected (automated, mocked API)

Date: 2026-10-27. Test: `apps/field-pwa/tests/e2e/field.spec.ts` (Playwright, Chromium), run with all existing PWA tests: 5 passed.

What the run proves (API, auth and storage are stand-ins with the real duplicate rules):
- Sign in, pull: assignment and form definition arrive; blueprint hash is verified before it is stored.
- Offline: form filled, photo stored in OPFS, submit blocked until the required photo exists, then frozen into an immutable attempt. Nothing reaches the server (0 records). Pressing Sync offline loses and duplicates nothing.
- Reconnect with a failing first finalize: upload runs INIT, PUT, FINALIZE (retried after a 503), then the submission is sent. Server holds exactly 1 record.
- Three further Sync presses: no further submission POSTs. After a page reload: still 1 record, nothing re-sent.

Not yet proven (needs the live run on the S24 and the operator script): real API/storage, interrupted-upload resume on a phone, finalize-before-submission enforced by the server.
