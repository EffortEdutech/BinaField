# Admin Studio command-centre plan

Date: 2026-11-05  
Status: implementation baseline

## Product understanding

BinaField is not primarily an administration database. It is a report-to-jobsheet operating system:

`report contract → generated jobsheet → field capture → sync → review → customer report`

Admin Studio is therefore the command centre and analysis centre for that operating system. It must help an administrator answer, at any moment:

1. What work is active, late, blocked, or complete?
2. Which people, devices, projects, and report contracts are ready?
3. Which submissions need review and why?
4. What evidence supports the decision?
5. What report can be released to the customer, with trustworthy provenance?

## Information architecture

### Overview — command briefing

Live operational health: work in flight, review backlog, overdue work, project pulse, recent field activity, and next actions. Every metric links to the relevant operating page.

### Administration — prepare and control work

One operating surface for organisation identity, people and roles, devices, projects, report templates/deployments, and assignment issuance. Technical identifiers remain internal; operators work with names, statuses, and consequences.

### Review queue — decide what is trustworthy

Submission inbox with status/project filters, evidence-aware review actions, submission history, and explicit accept/reject outcomes. A reviewer should not need to navigate through raw API records.

### Reports & exports — analyse and release

Reconciled portfolio summary plus the final structured report. The report must show the reference identity, captured tables, calculations, evidence, signatures, notes, and provenance, with JSON/CSV/print/PDF actions.

### Audit trail — explain and support

Outcome history and recent audit events, with enough context for support and rollback investigation without exposing implementation-only controls.

## UX principles

- Orient first: every page names the organisation, operating purpose, live-data state, and next action.
- Work by consequence: use human names and statuses; keep UUIDs, bearer tokens, and API details out of normal workflows.
- One page, one job: sidebar routes are real task pages, not a long document with anchor links.
- Progressive disclosure: show summaries first, then tables, details, evidence, and provenance when needed.
- Truthful states: loading, empty, stale, failed, permission-denied, and completed states are explicit.
- Evidence before release: review and reporting connect the field submission to the final report.
- Responsive command centre: desktop supports scanning and comparison; mobile supports focused action cards and stacked controls.

## Implementation slices

- C1: make each sidebar item a complete page surface with page-level orientation and scoped content.
- C2: make the Administration page read as a preparation/control workflow rather than a raw list of forms.
- C3: make Review queue a dedicated inbox, including exports only as secondary actions.
- C4: make Reports & exports the analysis/release surface, with final report preview and provenance.
- C5: make Audit trail a support surface with clear event context.
- C6: verify build, source gates, deployment, and authenticated desktop/mobile navigation.

## Acceptance checklist

- [ ] Admin can understand the purpose of each page without reading implementation terminology.
- [ ] Only the selected sidebar page is visible.
- [ ] Overview metrics link to the correct operational page.
- [ ] Administration supports people, devices, projects, report contracts, deployments, and assignments.
- [ ] Review is a dedicated submission decision queue.
- [ ] Reports expose analysis and customer-ready final report outputs.
- [ ] Audit supports investigation and does not leak secrets.
- [ ] Existing API and end-to-end workflow checks remain green.
