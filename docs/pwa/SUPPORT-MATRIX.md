# BinaField Field PWA support matrix

Status: DEVICE VALIDATION DEFERRED  
Owner: BinaField project owner  
Last reviewed: 2026-10-30 (Asia/Kuala_Lumpur)

## Support policy

BinaField must not claim general Android or iPhone support until each cell below has a completed real-device record. Desktop Chromium/WebKit and browser emulation are development evidence only.

| Device class | Browser mode | Minimum version | Current status | Evidence |
|---|---|---|---|---|
| Android phone | Chrome browser | To be fixed in a future validation phase | DEFERRED — no broad support claim | `gate-evidence/pwa/GOAL11-PWA-VALIDATION-DEFERRED-20261030.md` |
| Android phone | Installed PWA | To be fixed in a future validation phase | DEFERRED — no broad support claim | `gate-evidence/pwa/GOAL11-PWA-VALIDATION-DEFERRED-20261030.md` |
| iPhone | Safari browser | Safari 16.4+ implementation baseline; tested floor deferred | DEFERRED — no broad support claim | `gate-evidence/pwa/GOAL11-PWA-VALIDATION-DEFERRED-20261030.md` |
| iPhone | Installed PWA | Safari 16.4+ implementation baseline; tested floor deferred | DEFERRED — no broad support claim | `gate-evidence/pwa/GOAL11-PWA-VALIDATION-DEFERRED-20261030.md` |
| Desktop Chromium | Browser | Development only | PASS — automated suite | `apps/field-pwa/tests/e2e/` |

## Required device capabilities

- JavaScript, Web Workers, WebAssembly, and OPFS/private browser storage.
- Camera permission and image capture through the file input.
- Sufficient local quota for the field workload; the actual quota and persistence result must be recorded per device.
- Network access for initial authentication, assignment pull, and eventual foreground sync.
- The app must remain open for foreground upload; iOS background upload is not claimed.

## Required evidence per real-device cell

- Device model, operating-system version, browser version, date/time, operator, deployed URL, and deployed commit.
- Browser-mode and installed-PWA launch evidence where applicable.
- G1–G6 gate results.
- Draft, photo, outbox, restart, retry/idempotency, reconciliation, and force-quit results.
- `navigator.storage.persist()` result and storage estimate.
- Risk-spike result or an explicit approved fallback decision.

## Unsupported or unclaimed cells

All Android/iPhone real-device cells, installed modes, and background-upload behavior are **DEFERRED / NOT CLAIMED FOR BROAD FIELD SUPPORT**. This includes native Android/iOS applications, which are outside the PWA goal.

## Guidance for operators

- Do not clear site data or reinstall the PWA while queued work exists.
- Do not use private browsing for a field run.
- Grant camera permission and record if the user denies or later revokes it.
- If sync fails, preserve the local state and capture the visible error before retrying.
- Record failures as observed; do not replace them with a later green rerun.
