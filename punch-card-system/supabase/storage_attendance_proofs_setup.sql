-- Optional: run in Supabase SQL Editor if migration 015 bucket insert fails.
-- Bucket is also created in 015_photo_proof_fallback.sql.

-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values ('attendance-proofs', 'attendance-proofs', false, 5242880, array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
-- on conflict (id) do nothing;

-- App uploads via SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). No public read policy required.
