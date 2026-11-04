# Goal 25 — Customer Acceptance, Pilot Readiness, and Handover

Date: 4 November 2026 (Asia/Kuala_Lumpur)
Decision status: **CONDITIONAL GO — controlled pilot only**

## Verified in the BinaField reference workflow

- Normal email/password login and organisation selection are implemented for Admin Studio and Field PWA.
- Kebuniti contract, published version, deployment, assignment, field entry, evidence upload, sync, review, and final report are live-verified.
- Live report verification passed with an accepted submission, `report_ready: true`, two evidence items, and two signed photo preview URLs.
- Goal 24 report output includes the reference sections, calculations, notes, signatures, provenance, JSON/CSV download, responsive rules, and report-only print/PDF mode.
- Admin deployment uses the current report renderer; API deployment provides authorised short-lived evidence preview URLs.

## Pilot entry checklist

- [ ] Pilot owner completes `docs/pilot/PILOT-OWNER-SIGNOFF.md` with named supervisor, field worker, devices, support contact, and review window.
- [ ] Pilot users are invited/activated using normal login; no bearer token is distributed to ordinary users.
- [ ] Each field device is registered and activated before assignment sync.
- [ ] Pilot owner opens the Kebuniti report on desktop and narrow mobile widths.
- [ ] Pilot owner opens Print / Save PDF and confirms the report-only A4 output.
- [ ] Pilot owner downloads JSON and CSV and stores them with the acceptance record.

## Known limitations to acknowledge

- This is a controlled pilot package, not a broad production-scale compatibility claim.
- Android Chrome/PWA is the supported pilot cell unless a separate real-device evidence record exists.
- Seeded demo organisation/project data is used for this reference workflow.
- Developer smoke scripts may retain token-based setup; ordinary users use email/password login.
- Review, exports, and signed evidence previews require an authenticated organisation role.

## Stop conditions

Stop the pilot for cross-organisation data exposure, unrecoverable offline work, evidence integrity failure, inability to authenticate the designated supervisor, or a failed report reconciliation.

## Handover references

- `docs/pilot/PILOT-READINESS-CHECKLIST.md`
- `docs/pilot/DEPLOYMENT-ENVIRONMENT-ROLLBACK.md`
- `docs/pilot/SUPPORT-MONITORING-RUNBOOK.md`
- `docs/pilot/KNOWN-LIMITATIONS.md`
- `docs/pilot/PILOT-OWNER-SIGNOFF.md`
- `docs/pilot/README.md`
