# Goal 21 — Product contract working draft

Date: 2026-11-02  
Status: Working draft — awaiting real reference reports and product-owner sign-off

## Working product statement

BinaField converts an administrator-defined project report into a field jobsheet, captures the completed work in the PWA, supports supervisor review, and produces the final customer-ready report.

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
