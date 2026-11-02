# Goal 21 — Product contract working draft

Date: 2026-11-02  
Status: Grounded working draft — Kebuniti reference report and field workbook selected; product-owner sign-off pending

## Working product statement

BinaField converts an administrator-defined project report into a field jobsheet, captures the completed work in the PWA, supports supervisor review, and produces the final customer-ready report.

## Existing product intent confirmed

The original product documents already support this direction:

- `BF-00` describes non-technical administrators designing field data-collection and operational workflow templates that transform into mobile user interfaces, with structured data, GPS, photos, signatures, validation, analytics, and reports.
- `BF-01` defines the operating chain as Blueprint → Assignment → Field Execution → Evidence → Validation → Submission → Processing → Intelligence, and states that the mobile runtime dynamically renders governed workflows.
- `BF-03` defines Blueprint Studio, 1..N workflow steps, assigned work as the mobile home experience, evidence capture, offline status, sync, reporting, and final customer-facing intelligence as the intended architecture.

These documents establish the product direction. The supplied Kebuniti PDF/XLSX pair now provides the concrete first report and field-input example needed to define the first BinaField contract.

## Candidate reference scenarios found

The retained architecture material names three representative scenarios:

- Agriculture Farm Audit — GPS, yield, irrigation, photo, and signature.
- Construction Site Safety Inspection — pass/fail checks, hazards, repeat items, and evidence.
- Utility Pump Preventive Maintenance — asset scan, readings, calculations, and photo.

These are suitable candidates for the first vertical slice, but they are design scenarios rather than confirmed customer report files. One must be selected and matched to a real report before the contract is signed off.

## Selected reference report and field workbook

The first reference workflow is based on these supplied files:

`C:\Users\user\Documents\00-NHL Global Solution\P12-BinaField\temp\sample report\Kebuniti.pdf`

`C:\Users\user\Documents\00-NHL Global Solution\P12-BinaField\temp\sample report\Kebuniti_Field_Data_Log (1).xlsx`

Reference characteristics observed in the PDF and workbook:

- Programme: Program Kebun Komuniti (Kebuniti).
- Authority: Kementerian Pertanian dan Keterjaminan Makanan (KPKM) and Jabatan Pertanian Malaysia.
- Form ID: KEBUNITI/RAW/2026/W44; entry date: 02 November 2026.
- The PDF is a one-page printable form and the XLSX is the editable field-data log with the same structure.
- The form contains five sections: daily field activity; produce and yield harvest record; resource and input audit; field photo documentation; field incidents and validation.
- It identifies the recording officer, community group, location/plot zone, state/district, prepared-by officer, and DOA representative verifier.

This is the first concrete report-to-jobsheet reference. BinaField should store the governed structured contract and generated output, not depend on an uncontrolled PDF or spreadsheet upload at runtime.

## Reference workflow derived from the report

Working name: **Kebuniti Field Data Log**

1. **Visit context** — form ID, entry date, recording officer, community group, plot zone, state/district.
2. **Daily activities** — repeat the six activity rows; record status, hours, participants, notes, and target blocks.
3. **Harvest/yield** — repeat crop rows; record plot, raw weight, quality grade, and market/distribution destination.
4. **Resource/input audit** — repeat input rows; record brand/variety, quantity, unit, and logistics reference.
5. **Photo evidence** — capture crop/harvest evidence and resource/infrastructure/issue evidence with captions.
6. **Incidents and validation** — record general notes/incidents, prepared-by officer, and DOA verification.
7. **Submission** — validate required fields/evidence, sign, and submit for review.

### Report-specific field contract

| Area | Fields or rules |
|---|---|
| Visit identity | Form ID, entry date, recording officer, community group, location/plot zone, state/district |
| Daily activity | Activity type, status, hours spent, participant count, field notes, target blocks |
| Harvest/yield | Crop variety, block/plot number, raw weight kg, quality grade A/B/C, destination |
| Resource/input | Material type, brand/variety code, quantity consumed, unit kg/L/m³, logistics reference |
| Evidence | Crop/harvest photo, resource/infrastructure/issue photo, caption, captured time, device and integrity metadata |
| Incidents | General notes, incident type, severity/status, related activity/crop/resource, follow-up |
| Validation | Prepared-by officer, signature/date, DOA representative, verification decision, signature/date |

### Report-specific calculations

- Activities completed = activity rows marked active/completed.
- Total participants and hours = sums of valid activity-row values.
- Total harvest weight = sum of valid crop weights; yield by crop, plot, grade, and destination.
- Total resource consumption = grouped by material and unit; never combine incompatible units.
- Report readiness = required context, required sections, evidence, prepared-by declaration, and DOA verification prerequisites complete.

### Report-specific output layout

1. Kebuniti form identity and visit context
2. Daily field activity table
3. Produce and yield harvest table
4. Resource and input audit table
5. Field photo evidence
6. Incidents, notes, and validation
7. Prepared-by and DOA verification
8. BinaField audit appendix and submission history

This replaces the earlier Fire Protection maintenance slice as the concrete Goal 21 reference. The generic asset/checklist/finding model below remains reusable, but the first vertical slice must honour the Kebuniti activity, yield, input, evidence, and validation structure above.

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

Working name: **Kebuniti Field Data Log**
Source reference: supplied Kebuniti PDF/XLSX pair and the BinaField product contract

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

- First reference report: **supplied and selected** — Kebuniti PDF/XLSX.
- First project type: **community agriculture field monitoring**.
- Required output format: **PDF and browser-readable HTML recommended; final choice pending**.
- Import priority: **reference PDF used for contract mapping; structured template authoring is first implementation path**.
- Signature sequence: **field officer preparation → DOA representative verification; confirm whether a later administrator review is required**.
- Calculations: **activity participation/hours, harvest totals, resource consumption grouped by unit, evidence completeness, and report readiness**.
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

## Implementation traceability

| Contract requirement | Current evidence | State |
|---|---|---|
| Kebuniti report structure and fields | `packages/test-fixtures/phase1-gate/vs01/kebuniti-field-data-blueprint.json` and `npm run check:kebuniti` | Implemented and automated-checkable |
| Generated jobsheet rendering | Field PWA Blueprint normalization and structured repeat-row editor | Implemented; requires live assignment visual evidence |
| Offline drafts and sync submission | Existing Field PWA local session/outbox pipeline plus Kebuniti offline policy | Implemented in platform; live Kebuniti execution pending |
| Photo evidence and signatures | Kebuniti Blueprint camera/signature components and submission evidence manifest | Implemented; live capture pending |
| Calculations | Kebuniti report projection calculates activity count, hours, participants, harvest kg, resource count, evidence count, readiness | Implemented; live submitted payload pending |
| Supervisor approval | Existing submission review queue and review endpoint | Implemented; live Kebuniti review pending |
| Final report output | Protected Kebuniti report projection, Admin preview, and print action | Implemented; live report rendering pending |
| Roles, login, and device onboarding | Existing normal login, organisation permissions, registered-device sync path | Implemented in platform; live role/device evidence pending |
| End-to-end acceptance | Admin → PWA → submission → review → report scenario defined | Pending authenticated execution and product-owner sign-off |

## Next input required

Confirm these three product decisions so the grounded draft can become the signed contract:

1. Should BinaField reproduce the full PDF/XLSX structure as the first jobsheet, including all repeatable rows?
2. Is DOA representative verification mandatory before finalisation, or may an administrator approve first?
3. Should approved reports be delivered as PDF, HTML, or both?
