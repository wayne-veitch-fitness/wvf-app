-- =============================================================================
-- Explicit Data API grants — required from October 30 2026
--
-- Supabase is removing the auto-grant of table access to roles.
-- We must explicitly grant authenticated users access to all tables.
-- RLS policies (already in place) continue to restrict what each user
-- can actually read or write within those tables.
--
-- anon role gets no grants — this app requires authentication throughout.
-- service_role bypasses RLS and has superuser access by default; no grant needed.
-- =============================================================================

grant select, insert, update, delete on public.profiles           to authenticated;
grant select, insert, update, delete on public.clients            to authenticated;
grant select, insert, update, delete on public.exercises          to authenticated;
grant select, insert, update, delete on public.tags               to authenticated;
grant select, insert, update, delete on public.exercise_tags      to authenticated;
grant select, insert, update, delete on public.programs           to authenticated;
grant select, insert, update, delete on public.client_programs    to authenticated;
grant select, insert, update, delete on public.program_days       to authenticated;
grant select, insert, update, delete on public.program_sections   to authenticated;
grant select, insert, update, delete on public.program_exercises  to authenticated;
grant select, insert, update, delete on public.workout_logs       to authenticated;
grant select, insert, update, delete on public.set_logs           to authenticated;
grant select, insert, update, delete on public.checkins           to authenticated;
grant select, insert, update, delete on public.food_diary         to authenticated;
grant select, insert, update, delete on public.resource_folders   to authenticated;
grant select, insert, update, delete on public.resources          to authenticated;
