# Goals 17–20 — deployed Admin Studio shell verification

Date: 2026-11-02  
Status: PASS for deployed shell and reporting bundle; authenticated acceptance remains pending

## Observed deployment

- Latest production deployment: `https://binafield-admin-studio-7525ofujs-eff-edus-projects.vercel.app/`
- Previous production alias: `https://binafield-admin-studio-nqpcqodhu-eff-edus-projects.vercel.app/`
- Vercel deployment state: `READY`, production
- Vercel Git SHA: `176308fb699635556c878ae8dbaf413ea022642d`
- Vercel commit message: `Complete Goals 17-20 reporting acceptance checks`
- HTTP response: `200`
- Deployed page title: `BinaField Admin Studio`
- The deployed shell exposes Overview, Administration, Review queue, Reports & exports, and Audit trail navigation.
- The initial protected-session screen exposes labelled Organisation ID and Bearer token fields and a disabled Load Admin Studio action until a token is provided.
- The deployed production JavaScript bundle contains the new `Print report`, `Reconciled total`, and `Data freshness` report-preview controls.

## Local release verification

- `apps/admin-web/npm run build`: PASS (`tsc --noEmit` and Vite production build).
- `git diff --check`: PASS.

## Acceptance gap

The deployed shell was verified in a browser, but the authenticated workflow still requires a fresh pilot bearer token to verify live counts, assignment search/filter, review actions, JSON/CSV export contents, print preview, and authenticated desktop/mobile evidence. No token is stored in this evidence file.
