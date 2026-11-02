# Goal 22 — Live identity verification

This runbook verifies the normal identity flow after the latest Admin, API, and Field PWA deployments are `READY`. Do not paste passwords, access tokens, refresh tokens, or browser storage into evidence.

## 1. Admin identity

From `apps/admin-web`, set credentials only in the local PowerShell session:

```powershell
$env:BINAField_EMAIL = "admin@example.test"
$env:BF_PASSWORD = Read-Host "Admin password"
npm run smoke:goal22-live
```

Expected checks:

- email/password login passes;
- one or more active organisations are returned;
- roles and permission context are returned;
- session refresh passes;
- device status is returned without exposing a device identifier.

Open Admin Studio in a clean browser profile and confirm the visible sequence: Email → Password → Sign in → Organisation selector → Open Admin Studio. No bearer token, API URL, or organisation UUID field should be visible.

## 2. Field-worker identity

Run the same smoke command with the field-worker account. Use the organisation/device values already assigned by the administrator; do not enter technical settings in the PWA.

Open the Field PWA at both normal desktop width and a narrow mobile width. Confirm:

1. Email/password sign-in is visible.
2. An active device shows “Device ready” and can sync assignments.
3. A pending device shows the administrator activation message and cannot sync.
4. A suspended or revoked device shows the appropriate contact-administrator message.
5. No API URL, Supabase key, bearer token, raw device ID, or cursor is shown.

## 3. Session expiry

With a signed-in session, allow the access token to approach expiry or use the browser test harness to force refresh failure. Confirm the Admin refreshes its session or signs out with a clear message. Confirm the Field PWA clears the expired session and returns to the sign-in screen.

## 4. Evidence record

Record only non-secret evidence:

| Evidence | Result | Notes |
|---|---|---|
| Admin desktop login | TODO | |
| Admin organisation selector | TODO | |
| Admin role-restricted action | TODO | |
| Field PWA desktop login | TODO | |
| Field PWA mobile login | TODO | |
| Active device sync | TODO | |
| Pending/suspended device message | TODO | |
| Session refresh/expiry recovery | TODO | |

Goal 22 closes only when every row has a dated result and the deployment commit is recorded.
