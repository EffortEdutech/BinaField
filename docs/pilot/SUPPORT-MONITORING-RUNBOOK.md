# Pilot support, monitoring, and error review

## First response

1. Capture the user's organisation, assignment ID, device ID, timestamp, and visible error code. Never request a bearer token or service-role key.
2. Check whether the device is online and whether the PWA shows queued work.
3. If work is queued, do not clear browser storage or reinstall the PWA.
4. Retry sync once online and record the sending log.
5. Escalate with correlation IDs and deployment IDs, not secrets.

## Error triage

- `BLUEPRINT_HASH_MISMATCH`: quarantine the malformed assignment, preserve the original record, and issue a corrected assignment from a published version.
- `401 AUTHENTICATION_REQUIRED`: refresh the user's session/token; do not change tenant data.
- `403`: verify membership state, permission, project scope, and device state.
- `409`: preserve the idempotency key and inspect whether the operation was already accepted.
- `413`: check evidence size against the upload limit.
- `503`: check Vercel runtime/build status, Supabase availability, and retryable operation logs.

## Daily review

- Review Vercel deployment/runtime errors for API and Admin Studio.
- Check `/api/health` and confirm database reachability.
- Review submission queue and unresolved exception records.
- Confirm evidence uploads reach finalized state.
- Record incidents and decisions in the pilot evidence log.

## Severity

- P0: data loss, cross-tenant exposure, or inability to recover field work — stop pilot immediately.
- P1: submissions or evidence cannot reconcile, or supervisor decisions cannot persist — pause affected workflow.
- P2: isolated UI defect with an operational workaround — continue with incident record.
- P3: cosmetic or documentation issue — backlog for post-pilot.
