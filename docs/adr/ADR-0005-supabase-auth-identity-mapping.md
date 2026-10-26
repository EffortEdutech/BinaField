# ADR-0005 - Supabase Auth as the identity provider

- Status: **Accepted 26 Oct 2026** (direction chosen by eff on 24 Oct 2026: "Supabase Auth"); live login-to-principal check passed, see gate-evidence/api/sprint1-auth-chain-20261026.md.
- Related: ADR-0003 (PWA-first), ADR-0004 (Supabase-only database).

## Decision

Supabase Auth issues the login token. The API verifies it and maps the user to the existing `iam` tables. **No migration is needed**: `iam.users.identity_subject` (text, unique, from migration 0002) already exists for an external identity subject, and it stores the Supabase Auth user id (the JWT `sub`).

## How a request is authorised

1. The client sends `Authorization: Bearer <Supabase access token>`, `X-Device-Id` (for device-required operations) and `X-Correlation-Id`.
2. The API verifies the token signature, issuer and expiry against the project's JWKS (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`) and takes `sub`.
3. In one transaction the API switches to `app_runtime`, sets the tenant context from the **path** `organization_id` (`app.organization_id`, `app.principal_type`, `app.membership_id`, `app.correlation_id` as transaction-local settings), then reads:
   - `iam.users` by `identity_subject` (no row-level security on this table);
   - the user's `iam.memberships` row for that organisation (row-level security applies, so another organisation's membership is invisible);
   - `iam.membership_roles`, `iam.role_permissions` and project scopes for that membership;
   - `iam.registered_devices` for `X-Device-Id`, when the operation requires a device.
4. `authorize()` from `packages/security` decides. Deny reasons use the existing registry (`MEMBERSHIP_REVOKED`, `DEVICE_NOT_REGISTERED`, `TENANT_MISMATCH`, `PERMISSION_DENIED`, `SCOPE_DENIED`). A resource in another organisation is reported as absent, not forbidden.

## Rules

- Row-level security stays the second barrier; the API does not rely on its own checks alone.
- The API connects as `postgres` through the Session pooler and runs every request with `SET LOCAL ROLE app_runtime`. The connection string lives only in the host's environment variables and is never committed or logged.
- Supabase Auth only proves who the person is. Roles, permissions, scopes, devices and tenancy stay in BinaField's own tables.
- A first login for a person with no `iam.users` row does not create access. An organisation admin invites them (membership state INVITED); the user row is created at invitation.
- The service-role key is not used by the API or any client.

## Consequences

- Login screens, password reset and email verification come from Supabase Auth, not from custom code.
- The PWA stores the Supabase session; offline use continues on the cached session until the token must be refreshed (the offline grace period is a later decision).
- Pending: how invitations create `iam.users` rows (Sprint 3), and the device registration flow for the PWA (a WebCrypto key per install, per ADR-0003).
