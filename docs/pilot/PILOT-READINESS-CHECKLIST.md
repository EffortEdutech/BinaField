# Pilot readiness checklist

Date prepared: 2026-10-29

## Seeded data inventory

| Item | Pilot value | Evidence/status |
|---|---|---|
| Organisation | `a0000000-0000-4000-8000-000000000001` | Verified by live Admin Studio smoke |
| Membership | `a0000000-0000-4000-8000-000000000003` | Verified as assignment assignee |
| Project | `a0000000-0000-4000-8000-000000000010` | Verified by live assignment creation |
| Published template version | `48705464-ebc3-4005-bcd1-c43fa7a01dc8` | Verified by live smoke |
| Deployment | `6c53d871-f1d3-46f4-a300-6fd7c259b37a` | Verified by live smoke |
| Assignment | `e899c1c7-01d5-4ca8-9cca-f42b632d53fe` | Verified persisted by live smoke |
| Registered field device | `794b3e5e-c84c-49fe-82e4-07bed9875fc5` | Verified during Goal 1/2 testing |

## Entry gate

- [x] API production deployment is reachable and ready.
- [x] Admin Studio production deployment is reachable and ready.
- [x] Production API environment contains the four required protected Supabase/database variables; values were not exposed.
- [x] Authentication and tenant authorization have automated coverage.
- [x] Template creation, validation, and publishing pass live smoke.
- [x] Deployment and assignment creation persist in the tenant.
- [x] Submission queue and supervisor outcome persistence pass live smoke.
- [x] Field offline/reconnect workflow passed Goal 2 evidence.
- [ ] Pilot user identities and invite/activation dates recorded by the pilot owner.
- [ ] Pilot devices checked in and assigned to named field users.
- [ ] Pilot support contact and daily review owner recorded.

## Exit gate

- [ ] Every pilot assignment has a submitted or explicitly cancelled outcome.
- [ ] Supervisor reviews all received submissions within the agreed review window.
- [ ] No unresolved P0/P1 incident remains.
- [ ] Known limitations are acknowledged by pilot participants.
- [ ] Evidence bundle is archived with deployment commit, timestamps, IDs, and screenshots/logs where applicable.
