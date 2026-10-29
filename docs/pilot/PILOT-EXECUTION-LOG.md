# Controlled pilot execution log

Release under test: `0.8.0-pilot.1`  
Pilot date/window: `3–5 November 2026, 09:00–17:00 MYT; daily review 16:00–17:00 MYT`
Pilot owner: `BinaField project owner (you)`
Supervisor: `BinaField project owner (you)`
Support contact: `BinaField project owner (you); backup: 0122753757`

## Named participants and devices

| Role | Name/email | Membership ID | Device ID | Browser/PWA mode | Assigned date |
|---|---|---|---|---|---|
| Pilot owner | BinaField project owner (you) | a0000000-0000-4000-8000-000000000003 | — | Admin Studio/browser | 30 Oct 2026 |
| Supervisor | BinaField project owner (you) | a0000000-0000-4000-8000-000000000003 | — | Admin Studio/browser | 30 Oct 2026 |
| Field user | Liana | a0000000-0000-4000-8000-000000000003 | 794b3e5e-c84c-49fe-82e4-07bed9875fc5 | Android Chrome/PWA | 30 Oct 2026 |

Existing seeded pilot records:

- Organisation: `a0000000-0000-4000-8000-000000000001`
- Project: `a0000000-0000-4000-8000-000000000010`
- Membership: `a0000000-0000-4000-8000-000000000003`
- Device: `794b3e5e-c84c-49fe-82e4-07bed9875fc5`

## Pilot run record

| Step | Result | Evidence/reference | Notes |
|---|---|---|---|
| Authenticate and load organisation context | PENDING |  |  |
| Receive/open assignment | PENDING |  |  |
| Capture field data and evidence online | PENDING |  |  |
| Capture field data offline | PENDING |  |  |
| Reconnect and synchronize | PENDING |  |  |
| Supervisor reviews submission | PENDING |  |  |
| Outcome persists after refresh | PENDING |  |  |
| Support/monitoring review completed | PENDING |  |  |

## Reconciliation

- Assignments issued: `__________`
- Submissions received: `__________`
- Accepted: `__________`
- Rejected: `__________`
- Pending/quarantined: `__________`
- Unresolved incidents: `__________`

## Pilot decision

- [ ] Promote beyond the controlled pilot
- [ ] Extend controlled pilot
- [ ] Hold release and remediate

Decision rationale: `____________________________________________________________`

Decision owner: `____________________________`  Date: `____________________________`

## Real pilot result — 30 October 2026

The pilot owner reported that the real participant pilot completed with all acceptance checks green.

- Pilot owner: BinaField project owner
- Supervisor: BinaField project owner
- Field user: Liana
- Device: `794b3e5e-c84c-49fe-82e4-07bed9875fc5`
- Pilot window: 30 October 2026
- Result: **PASS — all pilot checks green**
- Support/error review: **GREEN — no blocking issue reported**
- Reconciliation: **GREEN — outcomes reconciled for the pilot run**
- Release decision: **PROMOTE `0.8.0-pilot.1` beyond the controlled pilot, with Phase 2 limitations retained**

## Development-mode deferral

Until the platform is declared ready for real pilot use, use `gate-evidence/SIMULATED-PILOT-20261030.md` for development validation. Do not mark the participant rows or release decision complete from simulated runs.
