# ADR-0006 - Evidence bytes in private Supabase Storage via signed uploads

- Status: **Accepted 27 Oct 2026** (direction chosen by eff: "Supabase Storage with signed upload URLs").
- Related: ADR-0004 (Supabase-only), ADR-0005 (identity), evidence contracts in packages/contracts/evidence.

## Decision

Photo and file bytes live in one private Supabase Storage bucket, `evidence`. Object key: `<organization_id>/<attachment_id>`.

1. **Initiate** (`POST /evidence/uploads`): the API checks `evidence.capture`, the device, and that the assignment belongs to the caller and the project is in scope. It records the attachment (integrity PENDING) and an upload session (15 minutes), then returns a short-lived signed upload URL in `provider_upload_reference`. The strategy is SINGLE_PUT; multipart comes later.
2. **Upload**: the phone PUTs the file straight to Storage. The bytes never pass through the API, because Vercel functions cap request bodies at 4.5 MB.
3. **Finalize** (`POST /evidence/uploads/{id}:finalize`): the API reads the stored object, computes SHA-256 and size itself, and compares them with what was declared at initiation. A match marks the attachment VERIFIED. A mismatch marks it QUARANTINED (codes `HASH_MISMATCH` / `SIZE_MISMATCH`); the phone must capture and upload again under a new attachment id. The phone's own hash is never trusted. A missing object returns a retryable `OBJECT_MISSING`.

## Credential exception

ADR-0005 says the API uses no service-role key. Signing uploads and reading private objects needs one, so this ADR makes a narrow exception: the Supabase secret key is held only in the API's Vercel environment as `SUPABASE_SERVICE_ROLE_KEY`, is used only in `apps/api/src/storage.ts` for the `evidence` bucket, is never logged, and is never sent to a client. Database access still goes through the `app_runtime` role and row-level security. The key is rotated if it is ever exposed.

## Consequences

- The idempotency key on initiate is required by the contract; repeat requests are recognised by `attachment_id` (same description returns the open session, a different description returns 409).
- Binding evidence to a submission attempt (`BindEvidence`), derivatives, malware scanning, MIME detection and download URLs are later work.
- The bucket is created by `infra/supabase/evidence-bucket.sql`, not by a numbered migration, because the storage schema is Supabase's.
