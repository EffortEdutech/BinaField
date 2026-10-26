# Sprint 1 - login to tenant principal, live check (26 Oct 2026)

What ran: a Supabase Auth password login for the test user, then `GET /api/organizations/{org}/me` on https://binafield-api.vercel.app
with the bearer token and `X-Device-Id`. Operator-run PowerShell, output pasted back (no secrets in it).

Result (HTTP 200):
- user_id a0000000-0000-4000-8000-000000000002 resolved from the Supabase subject through iam.users.identity_subject
- membership ACTIVE in organisation a0000000-0000-4000-8000-000000000001 (BinaField Demo, test data)
- device a0000000-0000-4000-8000-000000000005 state ACTIVE
- 58 permissions (ORG_OWNER), scope ORG_WIDE

Path exercised: Supabase token -> API verification -> SET LOCAL ROLE app_runtime -> tenant context from the path -> RLS-filtered iam lookups -> response.
Environment: Vercel project binafield-api (root apps/api), Supabase project BinaField (plpaixewllldutjrjljg), Session pooler connection.
Not yet covered: negative cases against the live API (other organisation, revoked member, suspended device), sync endpoints.
Test data remains in the main database and must be removed or replaced before any real use.
