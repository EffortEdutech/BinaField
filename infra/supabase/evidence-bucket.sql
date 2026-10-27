-- Private Storage bucket for evidence bytes (ADR-0006). Apply once per Supabase project.
-- Not a numbered database migration: the storage schema belongs to Supabase and does not exist in the local PostgreSQL used for the sealed migrations.
-- No storage.objects policies are added on purpose: the bucket is private and only the API (secret key) reads or signs uploads.
insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;
