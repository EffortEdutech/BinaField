# Pilot known limitations register

This register is part of the pilot acceptance decision. Items listed here are known and do not automatically block the pilot unless they affect data integrity, tenant isolation, or recovery of field work.

| ID | Limitation | Pilot treatment | Severity |
|---|---|---|---|
| KL-01 | The result dashboard is a basic Admin Studio count/result view, not a full analytics dashboard. | Use the submission queue and outcome API for authoritative review. | P2 |
| KL-02 | Admin Studio bearer tokens are entered per browser session and are not a user-management UI. | Use controlled pilot accounts and refresh expired sessions. | P2 |
| KL-03 | PWA field-gate testing across all Android/iPhone installed modes remains deferred until broader platform completion. | Pilot only on the tested Android Chrome/PWA path and record device/browser. | P1 |
| KL-04 | A malformed historical assignment can be quarantined rather than silently rewritten. | Preserve the original record and issue a corrected assignment from a published version. | P1 |
| KL-05 | The pilot uses seeded organisation/project/template data and a small number of users/devices. | Do not interpret pilot capacity as production-scale evidence. | P2 |
| KL-06 | Vercel deployment protection may prevent automated external fetches even when the deployment is healthy. | Validate through an authenticated user browser or local smoke runner. | P2 |

## Pilot stop conditions

Stop the pilot immediately for cross-tenant data exposure, unrecoverable offline work, evidence integrity failure, or inability to authenticate the designated supervisor. Follow the rollback guide and preserve the incident evidence.
