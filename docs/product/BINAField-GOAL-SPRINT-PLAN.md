# BinaField end-product goal sprint plan and checklist

Date: 2026-11-02  
Parent plan: `BINAField-END-PRODUCT-DELIVERY-PLAN.md`

## Sprint 0 — Product contract and reference workflow

Goal: define the first real report and its complete journey.

Checklist:

- [ ] Select one real project report as the reference workflow.
- [ ] Collect two additional reports for comparison.
- [ ] Identify sections, fields, evidence, signatures, calculations, approvals, and output layout.
- [ ] Define admin, supervisor, field-worker, and customer permissions.
- [ ] Define normal login, organisation selection, and device onboarding journeys.
- [ ] Write end-to-end acceptance scenarios and sample data.

Gate: a signed-off report-to-jobsheet-to-final-report contract exists.

## Sprint 1 — Normal identity and device experience

Goal: remove pilot-only access patterns.

Checklist:

- [ ] Add Admin Studio login and logout.
- [ ] Add Field PWA login and logout.
- [ ] Add session refresh and expired-session handling.
- [ ] Add organisation/project selection.
- [ ] Add guided device registration and device status.
- [ ] Hide bearer tokens, API URLs, raw cursors, and technical identifiers.
- [ ] Replace technical sync controls with simple sync status and recovery messaging.
- [ ] Verify role-based navigation and tenant isolation.

Gate: admin and field worker can use the product without developer credentials or settings.

## Sprint 2 — Canonical report schema and Report Builder

Goal: let an admin create a report without code.

Checklist:

- [ ] Finalize the canonical report schema.
- [ ] Support text, number, date, select, checkbox, table, photo, signature, and location fields.
- [ ] Support sections, ordering, required fields, help text, and validation.
- [ ] Support conditional fields and basic calculations.
- [ ] Support evidence and approval requirements.
- [ ] Add visual field/section editor.
- [ ] Add jobsheet preview.
- [ ] Add report version lifecycle: draft, validate, publish, supersede, archive.
- [ ] Preserve immutable published versions and hashes.

Gate: an admin creates and publishes the reference report entirely through the UI.

## Sprint 3 — Reference-file import and mapping

Goal: accelerate setup from existing project documents.

Checklist:

- [ ] Upload Excel, Word, and PDF reference files.
- [ ] Extract headings, labels, tables, and basic field candidates.
- [ ] Show an import review screen.
- [ ] Map imported content into the canonical report schema.
- [ ] Flag unsupported or ambiguous content for manual correction.
- [ ] Store the original file and import mapping as audit evidence.
- [ ] Never publish an unreviewed automatic conversion.

Gate: the reference report can be imported, reviewed, corrected, previewed, and published.

## Sprint 4 — Generated PWA jobsheet

Goal: make the field experience match the admin report definition.

Checklist:

- [ ] Deliver the exact published report version with the assignment.
- [ ] Render the jobsheet dynamically from the report definition.
- [ ] Enforce required fields and validation on mobile.
- [ ] Support photos, signatures, location, notes, and tables.
- [ ] Save drafts locally and restore them after restart.
- [ ] Show clear completion and submission states.
- [ ] Preserve report version and blueprint hash on every submission.

Gate: the field worker completes the reference jobsheet without a hard-coded form.

## Sprint 5 — Offline sync and evidence reliability

Goal: make field submission dependable in real conditions.

Checklist:

- [ ] Queue local changes and evidence uploads.
- [ ] Retry safely after network failure.
- [ ] Prevent duplicate submissions with idempotency.
- [ ] Verify evidence hashes and quarantine invalid files.
- [ ] Resume interrupted uploads where supported.
- [ ] Show actionable sync errors without exposing technical internals.
- [ ] Record device, user, timestamps, and audit events.
- [ ] Test supported Android and iPhone browser/PWA combinations.

Gate: offline completion survives disconnect, restart, reconnect, and reconciliation.

## Sprint 6 — Supervisor review and final report generation

Goal: turn submitted jobsheets into customer-ready reports.

Checklist:

- [ ] Show completed report data and evidence in the review workspace.
- [ ] Support accept, reject, correction request, and approval history.
- [ ] Calculate derived values consistently with the jobsheet.
- [ ] Render a final PDF and HTML report from the published report layout.
- [ ] Include photos, signatures, timestamps, approvals, and audit history.
- [ ] Add customer-safe export and sharing/download controls.
- [ ] Preserve the submitted report version used for rendering.

Gate: one accepted field jobsheet produces a complete, readable final report.

## Sprint 7 — Customer-ready quality and release gate

Goal: prove the vertical slice is usable and safe.

Checklist:

- [ ] Test admin, supervisor, field-worker, and customer journeys.
- [ ] Test responsive layouts at desktop and narrow mobile widths.
- [ ] Test keyboard navigation, labels, focus, contrast, and live messages.
- [ ] Test tenant isolation and permission denial paths.
- [ ] Test report version immutability and audit completeness.
- [ ] Capture screenshots and recordings for acceptance evidence.
- [ ] Publish supported-device and known-limitations matrix.
- [ ] Complete pilot-owner sign-off.
- [ ] Record release decision and rollback plan.

Gate: the reference workflow is accepted by a real project owner from setup through final report delivery.

## Definition of done for the first end product

- [ ] Normal login works for Admin Studio and the PWA.
- [ ] Admin creates or imports a report without code.
- [ ] BinaField generates the matching jobsheet.
- [ ] Field staff complete the jobsheet offline or online.
- [ ] Evidence and signatures are captured and verified.
- [ ] Supervisor review and approval work.
- [ ] Final PDF/HTML report is generated.
- [ ] Audit, tenant isolation, accessibility, responsiveness, and device evidence pass.
- [ ] The workflow is documented and demonstrated using a real report.
