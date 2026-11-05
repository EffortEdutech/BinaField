# Goal 27 — Admin Studio Administrator Workspace

## Purpose

Make Admin Studio the normal, customer-facing control centre for BinaField administrators. An administrator must be able to sign in with email and password, understand which organisation they manage, prepare field work, activate people and devices, review submissions, and release trustworthy reports without seeing bearer tokens, UUIDs, API URLs, or developer-only controls.

The named pilot remains paused until this contract is usable end to end.

## Administrator definition

The administrator is an authenticated organisation member with permission to manage the organisation. The first pilot administrator is the BinaField project owner account used for Admin Studio and supervisor actions. The product must display the signed-in administrator's name/email and role; it must not rely on an unnamed “protected session” or an invisible token field.

## Primary workflow

1. Sign in as an administrator.
2. Select an organisation when the account belongs to more than one; otherwise enter the organisation directly.
3. See a dashboard showing live operational health and the next actions requiring attention.
4. Invite or activate a member, assign a role, and see the membership state.
5. Review a registered device and activate, suspend, or revoke it.
6. Create or import a report template, edit its field blueprint, validate it, and publish a version.
7. Select a project, template version, field worker, and due date to issue an assignment.
8. Monitor assignment state and submission arrival.
9. Review evidence and submission history, then accept or reject with an auditable decision.
10. Open the final structured report and export JSON, CSV, print, or PDF.
11. Inspect audit/support information when something needs investigation.

## Information architecture

- **Overview** — operational summary, urgent actions, recent activity, freshness.
- **People & access** — members, invitations, roles, permissions, organisation identity.
- **Devices** — registration, owner, platform, last seen, activation and suspension.
- **Projects** — project lifecycle, active deployments, assigned work.
- **Report templates** — template library, draft/validated/published versions, blueprint editor/import.
- **Assignments** — issue, search, filter, reassign, cancel, and status timeline.
- **Review queue** — evidence-aware review, history, accept/reject decisions.
- **Reports & exports** — reference-layout report, provenance, JSON/CSV/PDF/print.
- **Audit & support** — immutable events, correlation, freshness, known incidents, runbook link.

## Product rules

- No token, API URL, organisation UUID, membership UUID, or device UUID is entered or shown during normal administrator work.
- All organisation data is scoped from the authenticated session and the selected organisation.
- Every mutation gives a clear success/error result and refreshes the affected record.
- Dangerous or irreversible actions require an explicit confirmation and explain the consequence.
- Empty, loading, stale, permission-denied, and failed states are truthful and actionable.
- Desktop uses a persistent workspace navigation; mobile uses a compact navigation and stacked task cards.
- Keyboard focus, semantic labels, colour contrast, print output, and reduced-motion behaviour are acceptance requirements.

## Implementation slices

### 27.1 Identity and shell

- Show signed-in administrator identity, role, organisation, session expiry, and sign-out.
- Remove technical token and UUID controls from the rendered Admin Studio.
- Add an organisation switcher sourced only from authenticated memberships.

### 27.2 People, roles, and devices

- Member invitation and activation flow.
- Role and permission presentation with safe assignment controls.
- Device list with owner, platform, state, and activation workflow.

### 27.3 Operational setup

- Project management.
- Template library and blueprint authoring/import.
- Version validation and publishing.
- Assignment creation using named people and projects, not IDs.

### 27.4 Operations and reporting

- Assignment monitoring and search.
- Evidence-aware review queue.
- Report detail, provenance, exports, print/PDF.
- Audit/support view.

### 27.5 Acceptance hardening

- Desktop and narrow-mobile browser evidence.
- Keyboard and screen-reader-oriented checks.
- Normal login and session refresh.
- Admin → PWA → sync → review → final report acceptance.
- Update pilot readiness and resume the named pilot only after the gate is green.

## Acceptance gate

- [ ] Administrator can sign in without a token.
- [ ] Administrator identity, role, and organisation are visible.
- [ ] Liana can be invited/activated and assigned the field-worker role.
- [ ] Liana’s device can be registered and activated from Admin Studio.
- [ ] Kebuniti assignment can be issued by selecting names, not UUIDs.
- [ ] Assignment arrives in the PWA after sync.
- [ ] Submission, photos, signatures, and calculations appear in Review.
- [ ] Supervisor decision persists and is auditable.
- [ ] Reference-layout report opens with provenance and evidence previews.
- [ ] JSON, CSV, print, and PDF outputs work.
- [ ] No normal-user screen exposes tokens, API URLs, or technical settings.
- [ ] Desktop/mobile and accessibility evidence is captured.

## Current known blockers

- The identity-first Admin Studio shell is deployed, including administrator identity, session restoration, authenticated organisation discovery, and named people/project/template/assignment controls.
- The remaining gate is live browser acceptance after selecting **BinaField Demo**: verify the full administrator workspace and then run the Admin → PWA → review → final report path.
- The named Liana pilot remains paused until that live acceptance gate is green.
