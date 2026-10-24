# ADR-0003 - Field Runtime: PWA-First Delivery for Phase 1

- Status: **Accepted on 22 Oct 2026 (approved by eff)**
- Numbering note: the approved record was drafted as "ADR-0001"; that number is already used by the modular-monolith ADR, so it is filed here as ADR-0003.

Deliver the BinaField Field Runtime as an installable PWA for this version, and build the native Android and iOS apps after the PWA has been tested end to end. Server contracts, PostgreSQL schema and sync semantics are unchanged.

## Context

Phase 1 froze the Field Runtime as native Android (Kotlin, Jetpack Compose, Room). Closing the Android gate locally needs an API 30 emulator image the workstation does not have, and iOS would need a second native app.

The PostgreSQL side is already proven: a fresh PostgreSQL 16.4 + PostGIS 3.4.3 run on 22 Oct 2026 applied all 18 migrations, with row-level security enabled and forced on 44 tables and tests 001-006 passing.

The field client is where the product risk now sits. A PWA lets one TypeScript codebase run on any Android or iOS phone through a link, so the full loop (design, assign, collect offline, sync, analyse) can be tested with real users before any native investment.

The local store is already plain SQLite SQL (`apps/field-android/data/local/migrations/0001_local_schema_v1.sql`, 22 tables, 3 immutability triggers). SQLite compiled to WASM can run the same file, so the PWA and the later native apps share one local data model.

## What stays frozen

Only the delivery channel changes. These rules hold for the PWA exactly as written in BF-P0 and BF-P1:

- SAVE, COMPLETE, SUBMIT, SYNC, ACCEPT and PROCESS stay separate operations; a Submission Session, a Submission Attempt and a Submission stay distinct.
- A submitted Attempt is immutable; a submitted Session cannot be reopened.
- Original evidence is never overwritten; a watermarked or transformed file is a derivative with lineage.
- The sync cursor advances only after the inbox batch is applied; a rollback leaves it unchanged.
- Separate device drafts are never merged silently; conflicts open a reconciliation case.
- Assignment lifecycle stays PLANNED, ASSIGNED, IN_PROGRESS, SUBMITTED, COMPLETED, CANCELLED; OVERDUE, OFFLINE and SYNC_FAILED stay derived.
- The 20 Blueprint components and 8 client rule actions are unchanged; Blueprints contain no executable code.
- Server API, command, query and event contracts, permission and role registries, RLS and Organisation tenancy are untouched.
- Released SQL migrations are never edited; changes go in forward migrations.

## What changes

Six areas change for the field client; nothing on the server side does.

| Area | Today (native Android) | With PWA-first |
| --- | --- | --- |
| BF-P1-01 repository | `apps/field-android` (Kotlin, Compose) | New `apps/field-pwa` (TypeScript, React) sharing `packages/domain-ts` and `packages/contracts` |
| BF-P0-12 Field App IA | Native screens and navigation | Same screens and flows; responsive layout, install prompt, offline app shell |
| BF-P1-07 local store | Room over SQLite on the device | SQLite WASM in a Web Worker on the browser's private file storage (OPFS), running the same `0001_local_schema_v1.sql`; one writer worker |
| BF-P1-08 evidence | `local_file_path` is an app file; SHA-256 on device | `local_file_path` is an OPFS path; chunked or WASM SHA-256; capture through camera input or `getUserMedia` |
| Upload transport | WorkManager background jobs | Foreground sync while the app is open; Background Sync where the browser offers it |
| BF-P1-10 gate B8 and C6 | Android Room instrumentation on an API 30 emulator | Browser offline-durability suite on real phones (next section) |

The Kotlin bindings, the Batch 4 Kotlin runtime and the Android skeleton stay in the repository unchanged. They are not built or gated in this version and become the starting point for the native phase.

## Revised gate

Each of the six Android instrumentation tests has a browser equivalent. All six must pass, with the same assertions, before the field client counts toward Phase 1 closure.

| Android test | PWA equivalent |
| --- | --- |
| `freshRoomDatabaseExecutesCanonicalSchema` | A fresh SQLite WASM database runs `0001_local_schema_v1.sql`; all 22 tables and 3 triggers exist |
| `autosaveAndOriginalEvidenceSurviveRoomReopen` | Autosaved draft and original evidence survive page reload, tab kill and browser restart |
| `submittedAttemptIsImmutableOnAndroidSQLite` | An UPDATE on a submitted Attempt is rejected by the trigger inside the WASM database |
| `evidenceDependencyAndReconciliationPersistAcrossReopen` | Outbox dependencies and open reconciliation cases survive a reload |
| `cursorApplyBeforeAdvanceIsTransactional` | Batch apply and cursor advance share one transaction; an injected failure leaves the cursor unchanged |
| `uploadedOriginalEvidenceIdentityCannotMutate` | After UPLOADED, a change to the hash or size of original evidence is rejected |

The suite runs under Playwright on Chromium and WebKit in CI, then by hand on one real Android phone and one real iPhone. Simulated results alone do not count.

Gate status at acceptance: the PostgreSQL live proof is an observed pass (22 Oct 2026). P1-B and P1-C, and so formal Phase 1 closure, stay open until the revised suite passes. The earlier Android CI result remains on file as native baseline evidence; it is not a PWA result.

Update 24 Oct 2026: the six gates were reported passing on desktop, an Android phone and an iPhone (`gate-evidence/pwa/`). Closure still waits on the risk spikes below.

## Risk spikes

Run these four tests on real phones before building the field app. Each has a pass condition and a fallback; a failed spike changes the plan, not just the schedule.

| Spike | Question | Passes when | If it fails |
| --- | --- | --- | --- |
| 1. Storage durability | Does an installed iOS PWA keep about 200 MB of photos plus the database after 7 idle days and under low storage? | Every byte and SHA-256 intact on reopen; the result of `navigator.storage.persist()` recorded | Field capture stays native; the PWA serves admin and review only |
| 2. Background upload | Which uploads continue with the app closed on Android Chrome and on iOS Safari? | The outbox resumes by itself on reopen with no loss, and the user sees what is still pending | Add native upload for evidence-heavy flows |
| 3. Captured photo bytes | Do camera captures keep stable bytes, EXIF and GPS from capture to upload? | The hash recorded at capture equals the server hash; GPS from the Geolocation API stored separately | Redefine ORIGINAL as the browser's capture output through a change record against BF-P0-09 |
| 4. Crash safety | Does SQLite WASM survive a force-quit during a write on iPhone and Android? | The database opens with no partial transaction and all six gate tests pass afterwards | Switch to an IndexedDB-backed store behind the same logical schema |

## Accepted limitations and native follow-on

These gaps are accepted for this version and recorded so nobody assumes they are covered:

- **Device identity:** a non-extractable WebCrypto key per browser install replaces hardware attestation; stronger attestation arrives with native.
- **Location:** GPS is recorded as claimed by the browser; mock-location detection is not available.
- **iOS background work:** uploads run while the app is open; Background Sync is not available on iOS.
- **Barcode and QR:** the browser detector exists only on Chromium for Android; Safari needs a WASM library.
- **Notifications:** iOS push works only for installed PWAs.

The native Android and iOS apps start when the four spikes and the revised gate have passed and at least one pilot with real field users has run. They reuse the same contracts, the same `0001_local_schema_v1.sql` and the existing Kotlin bindings, so the pilot's findings carry straight into the native build.

## Decisions on the open questions (24 Oct 2026)

- Approved: status Accepted.
- Browsers and phones: Chrome on a Samsung S24 as the primary test device; an iPhone also passed the gates. Minimum browser versions are still to be fixed by spike 4.
- `apps/field-pwa` is a separate Vite + React app (as built).
- The Android CI job stays in the repository as a dormant native baseline.
