-- ============================================================
-- Storage RLS policies for the "resources" bucket
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Allow all authenticated users to read/download files
create policy "Authenticated users can read resources"
  on storage.objects for select
  using (
    bucket_id = 'resources'
    and auth.role() = 'authenticated'
  );

-- Allow coach to upload files
create policy "Coach can upload resources"
  on storage.objects for insert
  with check (
    bucket_id = 'resources'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'coach'
    )
  );

-- Allow coach to update files
create policy "Coach can update resources"
  on storage.objects for update
  using (
    bucket_id = 'resources'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'coach'
    )
  );

-- Allow coach to delete files
create policy "Coach can delete resources"
  on storage.objects for delete
  using (
    bucket_id = 'resources'
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'coach'
    )
  );
