-- =============================================================================
-- Add log_type to program_exercises
-- Controls what the client sees when logging a set in the workout tracker.
--
-- weighted   → weight (kg) + reps  (default — most resistance exercises)
-- bodyweight → reps only, no weight field  (push-ups, pull-ups, etc.)
-- timed      → duration in seconds  (planks, holds, etc.)
-- check      → mark done only  (breathwork, activation, stretching)
-- =============================================================================

alter table program_exercises
  add column log_type text not null default 'weighted'
  constraint program_exercises_log_type_check
  check (log_type in ('weighted', 'bodyweight', 'timed', 'check'));
