# Sprint 2 - evidence upload, live check (27 Oct 2026)

What ran: scripts/live-check-submission.ps1 (operator-run) against https://binafield-api.vercel.app, commit de221b4, Supabase Storage bucket `evidence` (private), SUPABASE_SERVICE_ROLE_KEY set in Vercel (ADR-0006).
Result: 24 of 24 PASS (17 Sprint 1 checks plus 7 evidence checks).

- initiate upload: 201, signed upload link issued
- finalize before the file arrives: 409 OBJECT_MISSING (retryable)
- PUT of a 3000-byte file to the signed link: HTTP 200
- finalize verifies the hash: 200, attachment VERIFIED
- finalize again: 200 (replay, no second read)
- file different from the declared hash: 422 HASH_MISMATCH
- declared size over 25 MB: 413 EVIDENCE_SIZE_LIMIT_EXCEEDED

Database state after the run (main project, demo organisation): one attachment VERIFIED/UPLOADED with its session VERIFIED, one attachment QUARANTINED/UPLOADED with its session FAILED.

Not yet covered: enforcing that a submission is accepted only when its required evidence is verified (needs the processing step), interrupted-upload resume on Android and iPhone (needs the PWA connected, Sprint 3), multipart uploads, MIME detection, malware scan, binding to attempts, download URLs.
