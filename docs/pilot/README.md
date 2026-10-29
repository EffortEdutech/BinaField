# BinaField controlled pilot package

Pilot scope: one organisation, one project, one supervisor, one field user/device, and one inspection workflow using the deployed API, Admin Studio, and Field PWA.

## Current production surfaces

- Admin Studio: https://binafield-admin-studio.vercel.app
- API: https://binafield-api.vercel.app
- Field PWA: https://bina-field.vercel.app
- Tenant: `a0000000-0000-4000-8000-000000000001`
- Pilot membership: `a0000000-0000-4000-8000-000000000003`
- Pilot Android device: `794b3e5e-c84c-49fe-82e4-07bed9875fc5`

## Documents

- `PILOT-READINESS-CHECKLIST.md` — entry/exit gate and seeded-data inventory.
- `DEPLOYMENT-ENVIRONMENT-ROLLBACK.md` — deployment, environment, promotion, and rollback instructions.
- `SUPPORT-MONITORING-RUNBOOK.md` — support triage, monitoring, and error review.
- `KNOWN-LIMITATIONS.md` — limitations, pilot treatment, and stop conditions.
- `PILOT-OWNER-SIGNOFF.md` — named-owner acceptance form.

Secrets, access tokens, database URLs, and service-role keys must remain in local or Vercel environment settings and must never be committed.
