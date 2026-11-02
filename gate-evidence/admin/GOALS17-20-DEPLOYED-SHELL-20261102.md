# Goals 17–20 — deployed Admin Studio shell verification

Date: 2026-11-02  
Status: PASS for deployed shell; authenticated acceptance remains pending

## Observed deployment

- URL: `https://binafield-admin-studio-nqpcqodhu-eff-edus-projects.vercel.app/`
- HTTP response: `200`
- Deployed page title: `BinaField Admin Studio`
- The deployed shell exposes Overview, Administration, Review queue, Reports & exports, and Audit trail navigation.
- The initial protected-session screen exposes labelled Organisation ID and Bearer token fields and a disabled Load Admin Studio action until a token is provided.

## Local release verification

- `apps/admin-web/npm run build`: PASS (`tsc --noEmit` and Vite production build).
- `git diff --check`: PASS.

## Acceptance gap

The deployed shell was verified in a browser, but the authenticated workflow still requires a fresh pilot bearer token to verify live counts, assignment search/filter, review actions, JSON/CSV export contents, print preview, and authenticated desktop/mobile evidence. No token is stored in this evidence file.
