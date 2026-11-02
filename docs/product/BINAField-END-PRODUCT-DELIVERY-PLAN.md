# BinaField end-product delivery plan

Date: 2026-11-02  
Status: Product rebaseline

## Product outcome

BinaField is a report-to-jobsheet platform for project and field operations:

> An administrator creates or imports a report definition → BinaField generates the matching jobsheet → field staff complete it in the PWA → supervisors review it → BinaField produces the final customer-ready report.

The platform must feel like a normal product. Users log in normally; bearer tokens, sync queues, device identifiers, and API details remain behind the interface.

## Core user journey

1. An admin signs in and selects an organisation and project.
2. The admin creates a report from a template, builds a custom report, or imports a reference file.
3. The admin configures sections, fields, validation, evidence, calculations, signatures, and approvals.
4. The admin previews the generated jobsheet and publishes an immutable report version.
5. The admin assigns the report to a field worker or team.
6. The field worker signs in to the PWA and receives the assigned jobsheet.
7. The field worker completes the jobsheet online or offline, including required evidence.
8. The PWA synchronizes safely in the background and shows a simple status to the user.
9. A supervisor reviews, accepts, rejects, or requests correction.
10. BinaField generates the final report with answers, photos, signatures, calculations, approvals, and audit history.

## Reusable foundation

The existing implementation is retained and adapted:

- Supabase authentication and tenant isolation
- Organisations, projects, memberships, roles, and devices
- Versioned blueprint/template storage and hashes
- Deployments and assignments
- Offline PWA storage and synchronization
- Evidence upload and integrity tracking
- Submission idempotency and validation
- Supervisor review and audit events
- JSON/CSV exports and Admin Studio workspace

## Product changes required

- Replace Admin Studio bearer-token entry with normal login, session refresh, organisation selection, and role-based navigation.
- Replace PWA technical settings/sync controls with guided onboarding and background synchronization with clear user-facing status.
- Replace hard-coded demo blueprints with a visual Report Builder backed by the governed blueprint schema.
- Add report preview and jobsheet preview before publication.
- Add reference-file import and human review/mapping for Excel, Word, PDF, and existing BinaField reports.
- Add final report rendering to PDF/HTML/customer exports.
- Treat the report version as the immutable contract shared by the assignment, jobsheet, submission, and final report.

## Delivery gates

The product is not considered end-product ready until all gates pass:

- A normal admin can log in without seeing a token.
- A normal field worker can log in, register a device, and see assigned jobsheets.
- An admin can create a report without code.
- A published report generates the correct jobsheet.
- A field worker can complete and submit it offline and recover after reconnect.
- Evidence, signatures, calculations, and approvals are preserved.
- A supervisor can review the submission.
- A final customer-ready report is generated from the submitted data.
- Tenant isolation, audit history, accessibility, responsive behavior, and supported-device evidence pass.

## Scope discipline

The first delivery must complete one real report workflow end to end. Broader analytics, scheduling, billing, CRM, and cross-project BI follow only after the vertical slice is accepted.
