# Goal 11 — Android Chrome execution record

Status: NOT RUN  
Device: Android device — model not recorded  
OS version: Not recorded  
Chrome version: Not recorded  
PWA installed: Not recorded  
Production URL: `https://bina-field.vercel.app/`  
Deployed commit: ______________________  
Date/time (Asia/Kuala_Lumpur): 2026-10-30 — pilot date recorded; execution time not recorded  
Operator: Liana  
Device ID: `794b3e5e-c84c-49fe-82e4-07bed9875fc5`  
Evidence files: No physical-device screenshots or recordings supplied

## Required execution

Use the exact deployed commit shown above and the authorised test account. Record the result and screenshot/recording for every item.

| Test | Result | Evidence / notes |
|---|---|---|
| G1 fresh database/schema | NOT RUN | |
| G2 draft/evidence survives reload, tab kill, browser restart | NOT RUN | |
| G3 submitted attempt is immutable | NOT RUN | |
| G4 outbox/reconciliation survives reopen | NOT RUN | |
| G5 cursor rollback after injected failure | NOT RUN | |
| G6 uploaded evidence identity is immutable | NOT RUN | |
| Installed to home screen and launched as PWA | NOT RUN | |
| `navigator.storage.persist()` result recorded | NOT RUN | |
| Spike 1: 200 MB / seven-day durability plan | NOT RUN | |
| Spike 2: background upload/reopen recovery | NOT RUN | |
| Spike 3: captured bytes, EXIF/GPS, uploaded hash | NOT RUN | |
| Spike 4: force-quit crash safety | NOT RUN | |

## Device steps

1. Open the production URL in Chrome and authenticate.
2. Run the six local-store gate checks from the diagnostics route (`?diag`) and capture the result.
3. Add the site to the home screen, launch the installed PWA, and capture the app-shell evidence.
4. Request persistent storage and record the exact result.
5. Execute the offline draft/photo, restart, reconnect, retry, and reconciliation scenarios.
6. Record any failure without silently rerunning it; include the fallback decision.

Desktop or emulated browser results must not be copied into this record as Android evidence.
