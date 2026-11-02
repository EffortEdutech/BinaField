# Goal 21 — Product contract working draft

Date: 2026-11-02  
Status: Working draft — awaiting real reference reports and product-owner sign-off

## Working product statement

BinaField converts an administrator-defined project report into a field jobsheet, captures the completed work in the PWA, supports supervisor review, and produces the final customer-ready report.

## Existing product intent confirmed

The original product documents already support this direction:

- `BF-00` describes non-technical administrators designing field data-collection and operational workflow templates that transform into mobile user interfaces, with structured data, GPS, photos, signatures, validation, analytics, and reports.
- `BF-01` defines the operating chain as Blueprint → Assignment → Field Execution → Evidence → Validation → Submission → Processing → Intelligence, and states that the mobile runtime dynamically renders governed workflows.
- `BF-03` defines Blueprint Studio, 1..N workflow steps, assigned work as the mobile home experience, evidence capture, offline status, sync, reporting, and final customer-facing intelligence as the intended architecture.

These documents establish the product direction. They do not yet provide the concrete first project report, approved jobsheet layout, field vocabulary, or final report example required to sign off Goal 21.

## Candidate reference scenarios found

The retained architecture material names three representative scenarios:

- Agriculture Farm Audit — GPS, yield, irrigation, photo, and signature.
- Construction Site Safety Inspection — pass/fail checks, hazards, repeat items, and evidence.
- Utility Pump Preventive Maintenance — asset scan, readings, calculations, and photo.

These are suitable candidates for the first vertical slice, but they are design scenarios rather than confirmed customer report files. One must be selected and matched to a real report before the contract is signed off.

## Internal reference workflow found

The workspace also contains a concrete FireMaint maintenance-report implementation that may be a stronger first reference for BinaField. Its documented report data contract includes:

- Organisation, client, site, job, and technician details
- Asset/equipment rows and inspection results
- Pass, attention, fail, and finding summaries
- Findings, recommendations, and next-maintenance date
- Photo evidence
- Technician declaration and client acknowledgement
- Branded PDF/HTML report output

The FireMaint report-engine documentation separates canonical report data from a JSON-compatible layout and renderer. This is directly compatible with the BinaField direction of one report definition driving both the mobile jobsheet and final report. It remains a candidate input, not a signed-off BinaField workflow, until the product owner confirms that FireMaint maintenance reporting is the first target.

## Proposed first vertical slice

Working name: **Maintenance Service Report**
Source reference: FireMaint maintenance-report contract and controlled field pilot runbook

### Jobsheet workflow

1. **Job context** — job number, client, site, scheduled date, technician, and completion time.
2. **Asset checklist** — select the assigned asset, show the active checklist, and record each item result and notes.
3. **Findings and evidence** — capture finding title, severity, status, description, recommendation, photo evidence, and caption.
4. **Completion and submission** — show checklist/evidence completeness, technician declaration, and submit-for-review action.
5. **Supervisor review** — accept, reject, or request correction with an auditable decision.
6. **Customer report** — render the approved report as HTML/PDF with the submitted data and evidence.

### Proposed field contract

| Area | Fields or rules |
|---|---|
| Job | Job number, scheduled date, completed time, client, site, technician |
| Asset | Asset code, asset type/system, location, active checklist |
| Checklist | Checklist name, item label, result status, notes, required/optional state |
| Finding | Title, severity, status, description, recommendation, related asset |
| Evidence | Photo, caption, captured time, optional location, integrity metadata |
| Summary | Total assets, completed/skipped assets, pass/attention/fail counts, finding count |
| Approval | Technician declaration, supervisor decision, client acknowledgement, dates |
| Follow-up | Next maintenance date, corrective action reference, outstanding findings |

### Proposed calculations

- Total assets = assigned asset rows in the job.
- Completed assets = assets with a completed checklist.
- Pass/attention/fail counts = checklist results grouped by result status.
- Finding count = submitted findings linked to the job.
- Evidence completion = required evidence present and integrity-verified.
- Report readiness = all required checklist items, evidence, and technician declaration complete.

### Proposed report layout

1. Cover and report number
2. Organisation, client, site, and job details
3. Maintenance summary
4. Asset and checklist results
5. Findings and recommendations
6. Photo evidence
7. Technician declaration
8. Supervisor review and approval history
9. Client acknowledgement
10. Next maintenance and outstanding actions
11. Audit appendix

### Proposed sample record

- Organisation: BinaField pilot organisation
- Client: Sample facilities client
- Site: Sample commercial site
- Job: FM-2026-000001
- Asset: Fire pump system FP-01
- Checklist results: PASS, PASS, ATTENTION
- Finding: Pressure gauge reading requires follow-up
- Evidence: one original photo with caption and captured timestamp
- Technician: assigned field worker
- Supervisor: authorised reviewer
- Final outcome: approved report with next-maintenance date

The sample values are fixtures for contract testing only; they are not customer data.

### End-to-end acceptance scenarios

- Admin signs in normally, selects an organisation/project, and assigns the Maintenance Service Report.
- Field worker signs in, completes the generated jobsheet, captures a finding and photo, and submits it.
- Field worker loses connectivity during checklist and evidence capture; local draft and queued work survive refresh/restart and synchronize after reconnect.
- Server rejects a tampered or mismatched report version/evidence hash.
- Supervisor sees the completed report, reviews evidence, requests correction, and later approves the corrected submission.
- Approved output contains the same submitted checklist results, finding, photo, signatures, calculations, and audit history.
- Customer/read-only recipient can view or download the approved HTML/PDF without seeing internal notes or unauthorised tenant data.

## Reference workflow to finalize

The first accepted workflow will be:

`[real project report] → report setup → generated jobsheet → field completion → evidence submission → supervisor review → final report`

The concrete report and project are intentionally not invented in this draft.

## Contract objects

### Report definition

- Report name and report code
- Organisation and project scope
- Sections and subsection order
- Field definitions and labels
- Field type and display guidance
- Required/optional state
- Validation rules and conditional visibility
- Evidence requirements
- Calculations and derived values
- Signature and approval requirements
- Customer output layout and branding

### Jobsheet instance

- Assignment and report-version identifiers
- Project/site/work reference
- Assignee or team
- Due date and priority
- Generated sections and fields
- Draft, in-progress, submitted, and correction states
- Offline-save and synchronization status

### Submission and final report

- Submitted answers and calculated values
- Photos and other evidence references
- Signatures and timestamps
- Device and user identity
- Supervisor decision and correction history
- Audit trail
- Rendered PDF/HTML output

## Roles and access

| Role | Core responsibility |
|---|---|
| Organisation admin | Set up reports, projects, users, devices, and assignments |
| Supervisor | Monitor jobsheets, review submissions, request corrections, approve reports |
| Field worker | Complete assigned jobsheets and capture evidence |
| Customer/read-only recipient | View or receive approved final reports |

## Required user experience

### Admin

- Normal login; no bearer-token entry.
- Select organisation and project.
- Create from template, create custom, or import a reference file.
- Edit and preview the report and generated jobsheet.
- Publish an immutable version and assign work.

### Field worker

- Normal login; no API or sync configuration.
- Guided device registration on first use.
- See assigned jobsheets.
- Complete required fields, photos, signatures, and notes.
- Continue offline and receive simple saved/sync/submitted status.

### Supervisor and customer

- Supervisor reviews the completed jobsheet and evidence.
- Customer receives a readable final report with approvals and evidence.

## Current assumptions requiring confirmation

- First reference report: **not supplied**.
- First project type: **not supplied**.
- Required output format: PDF, HTML, or both — **not confirmed**.
- Import priority: Excel, Word, PDF, or existing BinaField report — **not ranked**.
- Signature roles and approval sequence — **not confirmed**.
- Required calculations and conditional rules — **not confirmed**.
- Customer sharing/download policy — **not confirmed**.

## Sign-off checklist

- [ ] Real reference report attached or linked.
- [ ] Report sections and fields mapped.
- [ ] Jobsheet layout approved.
- [ ] Evidence and signature rules approved.
- [ ] Supervisor workflow approved.
- [ ] Final report layout approved.
- [ ] Roles and login/device journeys approved.
- [ ] Sample completed submission approved.
- [ ] End-to-end acceptance scenarios approved.

## Next input required

Provide one real report file or representative image/PDF, plus the project type and who completes/reviews it. That material will be used to replace the assumptions above with the first signed-off BinaField contract.
