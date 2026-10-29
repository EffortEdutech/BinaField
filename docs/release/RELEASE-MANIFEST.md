# BinaField release manifest

## Identity

- Release: `0.8.0-pilot.1`
- Git commit at freeze: `b53e14110c9593713205b3ef159c80dfd37ab0d1`
- Repository: `EffortEdutech/BinaField`
- Release date: `2026-10-29`
- Decision: `CONDITIONAL`

## Deployed surfaces

| Surface | Production URL | Scope |
|---|---|---|
| API | https://binafield-api.vercel.app | authenticated API and health |
| Admin Studio | https://binafield-admin-studio.vercel.app | controlled administration/review |
| Field PWA | https://bina-field.vercel.app | tested field capture/sync path |

## Pilot seed identity

- Organisation: `a0000000-0000-4000-8000-000000000001`
- Membership: `a0000000-0000-4000-8000-000000000003`
- Project: `a0000000-0000-4000-8000-000000000010`
- Device: `794b3e5e-c84c-49fe-82e4-07bed9875fc5`

## Verification commands

```powershell
cd apps/api
npm test
npm run typecheck
cd ../admin-web
npm run build
npm run pilot:readiness
npm run smoke
```

The smoke command requires a fresh local `BINAField_TOKEN`; secrets are never part of this manifest.

## Included artifacts

- Source and deployment configuration at the freeze commit.
- `docs/pilot/` deployment, support, monitoring, checklist, limitations, and rollback package.
- `docs/phase2/` frozen Phase 2 requirements baseline.
- `gate-evidence/` Goals 1–5 evidence records and supporting runtime/database evidence.
