# Goal 21 — Product contract working draft

Date: 2026-11-02  
Status: Grounded working draft — real reference report selected; product-owner sign-off pending

## Working product statement

BinaField converts an administrator-defined project report into a field jobsheet, captures the completed work in the PWA, supports supervisor review, and produces the final customer-ready report.

## Existing product intent confirmed

The original product documents already support this direction:

- `BF-00` describes non-technical administrators designing field data-collection and operational workflow templates that transform into mobile user interfaces, with structured data, GPS, photos, signatures, validation, analytics, and reports.
- `BF-01` defines the operating chain as Blueprint → Assignment → Field Execution → Evidence → Validation → Submission → Processing → Intelligence, and states that the mobile runtime dynamically renders governed workflows.
- `BF-03` defines Blueprint Studio, 1..N workflow steps, assigned work as the mobile home experience, evidence capture, offline status, sync, reporting, and final customer-facing intelligence as the intended architecture.

These documents establish the product direction. The supplied Fire Protection System Monthly Service Report now provides the concrete first report example needed to define the first BinaField contract.

## Candidate reference scenarios found

The retained architecture material names three representative scenarios:

- Agriculture Farm Audit — GPS, yield, irrigation, photo, and signature.
- Construction Site Safety Inspection — pass/fail checks, hazards, repeat items, and evidence.
- Utility Pump Preventive Maintenance — asset scan, readings, calculations, and photo.

These are suitable candidates for the first vertical slice, but they are design scenarios rather than confirmed customer report files. One must be selected and matched to a real report before the contract is signed off.

## Selected reference report

The first reference workflow is based on the supplied report:

`C:\Users\user\Documents\00-NHL Global Solution\P08-FireMaint\tests\sample report\KEMENTERIAN PERUMAHAN DAN KERAJAAN TEMPATAN SERVICE REPORT-4G10-OCTOBER 2026.pdf`

Reference characteristics observed in the 50-page PDF:

- Fire Protection System Monthly Service Report, October 2026, code 4G10.
- Customer/project: Kementerian Perumahan dan Kerajaan Tempatan (KPKT).
- Service provider: FA Success Technology; accepting organisation: HBS Engineering Sdn Bhd.
- Cover includes prepared-by and accepted-by signature areas.
- Summary page contains seven system rows with system, trouble, action, and remark information.
- Detailed pages contain system-specific checklists, normal/faulty status, remarks, equipment status tables, issue details, photographs, service-team certification, and customer acceptance.

This is the first concrete report-to-jobsheet reference. The PDF remains a confidential source example; BinaField stores its structured contract and generated output, not an uncontrolled document copy.

## Reference workflow derived from the report

Working name: **Fire Protection System Monthly Service Report**

1. **Job and reporting period** — customer/project, report code, service month, service date, site/location, assigned service team.
2. **System summary** — repeat one row for each fire-protection system; record condition, trouble, action, and remark.
3. **Detailed inspection** — complete each governed system checklist; record Normal/Faulty or Pass/Fail and remarks.
4. **Issue register** — capture trouble, supervisory signal, defective device, reading, location, recommended action, and related system.
5. **Evidence** — attach photos/supporting evidence with capture time and integrity metadata.
6. **Service completion** — service team declares completion and submits the jobsheet.
7. **Review and acceptance** — supervisor reviews/corrects/approves; customer or accepting organisation signs or acknowledges.

### Report-specific field contract

| Area | Fields or rules |
|---|---|
| Report identity | Report title, report code, service month, service date, revision, prepared-by, accepted-by |
| Customer/site | Customer/project, site/location, address, service area, control-room/building reference |
| System summary | Repeatable system, condition/status, trouble, action, remark; seven systems are represented in the reference |
| Detailed checklist | System, component/check item, Normal/Faulty or Pass/Fail, required state, technician remark |
| Equipment status | Equipment/component, status, remark, related system |
| Issue register | Issue type, device/component, location, severity, status, description, recommended action, related system |
| Evidence | Photo/file, caption, captured time, optional location, source device, integrity/hash metadata |
| Completion | Service team members, completion declaration, completion time, outstanding work |
| Approval | Supervisor decision, correction note, reviewer, review time, customer acknowledgement, signature/date/stamp |
| Follow-up | Corrective action reference, target date, next service date, unresolved issue state |

### Report-specific calculations

- Systems inspected; normal/pass/faulty/fail counts; open trouble count.
- Required checklist completion and evidence completeness.
- Report readiness only when required sections, evidence, declarations, and approval prerequisites are complete.

### Report-specific output layout

1. Branded cover and report identity
2. Customer, project, site, and service details
3. Seven-system monthly summary
4. Detailed system inspection sections
5. Equipment/component status tables
6. Trouble, supervisory, and issue register
7. Photo and supporting evidence
8. Service-team certification
9. Supervisor review and customer acceptance
10. Corrective actions, next service, outstanding items, and audit appendix

This replaces the earlier generic maintenance slice as the concrete Goal 21 reference. The generic asset/checklist/finding model below remains reusable, but the first vertical slice must honour the system-summary, detailed checklist, issue-register, and acceptance structure above.

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

Working name: **Fire Protection System Monthly Service Report**
Source reference: supplied KPKT 4G10 October 2026 PDF, FireMaint maintenance-report contract, and controlled field pilot runbook

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

- First reference report: **supplied and selected** — KPKT 4G10 October 2026.
- First project type: **fire protection system monthly servicing**.
- Required output format: **PDF and browser-readable HTML recommended; final choice pending**.
- Import priority: **reference PDF used for contract mapping; structured template authoring is first implementation path**.
- Signature sequence: **service team declaration → supervisor review → customer/accepting organisation acknowledgement; confirm whether customer signature is mandatory**.
- Calculations: **system/checklist completion, status counts, open trouble count, evidence completeness, and report readiness; confirm thresholds**.
- Customer sharing: **approved report only; confirm link, download, or both**.

## Sign-off checklist

- [x] Real reference report attached or linked.
- [x] Report sections and fields mapped.
- [ ] Jobsheet layout approved.
- [ ] Evidence and signature rules approved.
- [ ] Supervisor workflow approved.
- [ ] Final report layout approved.
- [ ] Roles and login/device journeys approved.
- [ ] Sample completed submission approved.
- [ ] End-to-end acceptance scenarios approved.

## Next input required

Confirm these three product decisions so the grounded draft can become the signed contract:

1. Should BinaField reproduce the full detailed structure, or is the summary/checklist/issue/evidence subset sufficient for the first release?
2. Is customer/accepting-organisation signature mandatory before finalisation, or may supervisor approval issue the report first?
3. Should approved reports be delivered as PDF, HTML, or both?
