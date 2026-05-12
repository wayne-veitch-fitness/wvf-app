-- =============================================================================
-- Security fixes — May 2026
-- Addresses CRIT-3, CRIT-4 from security audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CRIT-3: Split checkins "FOR ALL" client policy into explicit per-operation
-- policies so clients cannot write coach_reply or reviewed_at.
-- The route-level guard (coach layout) is the primary enforcement layer;
-- this is defence-in-depth at the database level.
-- -----------------------------------------------------------------------------

drop policy if exists "Clients can manage their own check-ins" on checkins;

create policy "Clients can insert their own check-ins"
  on checkins for insert
  with check (client_id = my_client_id());

create policy "Clients can select their own check-ins"
  on checkins for select
  using (client_id = my_client_id());

create policy "Clients can update their own check-in data"
  on checkins for update
  using (client_id = my_client_id())
  with check (client_id = my_client_id());

create policy "Clients can delete their own check-ins"
  on checkins for delete
  using (client_id = my_client_id());

-- -----------------------------------------------------------------------------
-- CRIT-4: Storage RLS policies for checkin-photos bucket.
-- Previously only the "resources" bucket had explicit policies.
-- exercise-videos bucket is not used — exercises link to YouTube URLs instead.
-- -----------------------------------------------------------------------------

-- checkin-photos: clients upload/read only their own folder (named by auth.uid())
-- coach can read and manage all photos

create policy "Clients can upload their own checkin photos"
  on storage.objects for insert
  with check (
    bucket_id = 'checkin-photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Clients can view their own checkin photos"
  on storage.objects for select
  using (
    bucket_id = 'checkin-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from profiles where id = auth.uid() and role = 'coach'
      )
    )
  );

create policy "Coach can manage all checkin photos"
  on storage.objects for all
  using (
    bucket_id = 'checkin-photos'
    and exists (
      select 1 from profiles where id = auth.uid() and role = 'coach'
    )
  );

