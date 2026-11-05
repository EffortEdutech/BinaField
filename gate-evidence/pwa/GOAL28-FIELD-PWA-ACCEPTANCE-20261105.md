# Goal 28 — Field PWA Acceptance Evidence

Date: 05-Nov-2026
Deployment: `https://bina-field.vercel.app/`
Latest deployed commit: `1771a71`

## Authenticated desktop acceptance

Verified in the authenticated Field PWA session:

- Field-worker workspace identity is visible as `Field workspace` with `Ready to work` and `Online` status.
- The normal workspace contains no token, API URL, UUID, or technical settings controls.
- Jobsheet inbox shows the work summary for `To start`, `In progress`, and `Submitted`.
- Jobsheet filters are visible for `All`, `To start`, `In progress`, and `Submitted`.
- Device readiness is represented by the friendly `Ready to work` state.
- A jobsheet opened at `0%` completion and reached `100%` after its required field was completed.
- Submission displayed `Jobsheet submitted` and explained that the work was saved and sent for review.
- After submission, the sync queue showed one waiting item; pressing `Check for new work` completed the send and returned the workspace to `0 items waiting to sync` and `Everything is up to date.`
- Sync entries use worker-facing labels such as `Field submission`, `Photo evidence`, and `Sync confirmation`.

## Repository evidence

- `npm run build` passed.
- `npm run check:kebuniti` passed all contract checks, including photos, signatures, offline submission policy, normal login, and device onboarding.
- Production deployment for commit `1771a71` reported `READY`.
- Playwright mobile shell test passed at `360px` width with accessible sign-in controls and no horizontal overflow.
- Playwright offline field-flow test passed with photo capture, offline submission, reconnect retry, idempotency, and local persistence.

## Remaining acceptance item

Authenticated narrow-mobile acceptance still needs to be captured at a mobile viewport. The automated 360px shell and offline-flow tests pass, but they do not use the live authenticated session. The browser G1–G6 diagnostic gate also remains unresolved because its WASM/local-store execution hangs in the current runner.
